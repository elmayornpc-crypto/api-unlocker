'use client';

import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { File, Folder, FolderOpen, Save, Play, Trash, Plus, X, Clock, Search } from 'lucide-react';
import { join } from 'path';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
  expanded?: boolean;
  children?: FileItem[];
}

interface IDEProps {
  workingFolder: string;
  aiResponse: string;
  onFileCreated: (path: string) => void;
  autoOpenFile?: string;
}

export default function IDE({ workingFolder, aiResponse, onFileCreated, autoOpenFile }: IDEProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(workingFolder || '');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [memorySearch, setMemorySearch] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [openTabs, setOpenTabs] = useState<FileItem[]>([]);
  const [activeTab, setActiveTab] = useState<FileItem | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [fileCreationProgress, setFileCreationProgress] = useState<{filename: string, status: string}[]>([]);
  
  // Execution states
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string>('');
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  
  // Windsurf-style status panel
  const [statusPanel, setStatusPanel] = useState<{type: 'info' | 'success' | 'error', message: string, details?: string} | null>(null);

  const editorRef = useRef<any>(null);
  const executionPanelRef = useRef<HTMLDivElement>(null);

  // Parse code blocks from AI response and create files
  useEffect(() => {
    if (aiResponse) {
      parseAndCreateFilesFromAI(aiResponse);
    }
  }, [aiResponse]);

  // Auto-open file when autoOpenFile prop changes
  useEffect(() => {
    if (autoOpenFile) {
      console.log('[IDE] Auto-opening file:', autoOpenFile);
      // Create a file item for the auto-open file
      const fileItem: FileItem = {
        name: autoOpenFile.split('\\').pop() || autoOpenFile.split('/').pop() || autoOpenFile,
        path: autoOpenFile,
        isDirectory: false,
        size: 0,
        modified: new Date()
      };
      // Open the file
      loadFile(fileItem);
    }
  }, [autoOpenFile]);

  const parseAndCreateFilesFromAI = async (response: string) => {
    console.log('[IDE] Parsing AI response for code blocks...');
    console.log('[IDE] Current path:', currentPath);
    console.log('[IDE] Response length:', response.length);
    
    setAiStatus('Parsing code blocks...');
    setStatusPanel({
      type: 'info',
      message: 'Parsing AI response...',
      details: 'Looking for code blocks'
    });
    setFileCreationProgress([]);
    
    // Better regex for code blocks with format: ```language:filename
    const codeBlockRegex = /```([a-zA-Z0-9_+-]+):([^\n]+)\n([\s\S]*?)```/g;
    const matches = [];
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'txt';
      const filename = match[2]?.trim();
      const content = match[3].trim();
      
      // Skip if no filename
      if (!filename) {
        console.log('[IDE] Skipping code block without filename');
        continue;
      }
      
      matches.push({ filename, language, content });
      console.log('[IDE] Found code block:', filename, language, content.length);
    }

    console.log('[IDE] Total code blocks found:', matches.length);
    setAiStatus(`Found ${matches.length} code blocks`);
    
    if (matches.length === 0) {
      setStatusPanel({
        type: 'error',
        message: 'No code blocks found',
        details: 'The AI response did not contain valid code blocks'
      });
      setTimeout(() => setStatusPanel(null), 3000);
      return;
    }
    
    setStatusPanel({
      type: 'info',
      message: `Found ${matches.length} file(s)`,
      details: 'Creating files...'
    });

    if (matches.length > 0) {
      // Ensure the working folder exists
      setAiStatus('Ensuring working folder exists...');
      try {
        await fetch('/api/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mkdir',
            path: currentPath
          })
        });
        console.log('[IDE] Working folder ensured:', currentPath);
      } catch (error) {
        console.error('[IDE] Failed to create working folder:', error);
      }

      // Create files from parsed code blocks
      for (let i = 0; i < matches.length; i++) {
        const { filename, content } = matches[i];
        const filePath = join(currentPath, filename);
        
        setAiStatus(`Creating file ${i + 1}/${matches.length}: ${filename}`);
        setFileCreationProgress(prev => [...prev, { filename, status: 'creating' }]);
        
        console.log('[IDE] Creating file:', filePath);
        
        try {
          const response = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'write',
              path: filePath,
              content
            })
          });
          
          const data = await response.json();
          console.log('[IDE] File creation response:', data);
          
          setFileCreationProgress(prev => 
            prev.map(p => p.filename === filename ? { ...p, status: 'done' } : p)
          );
          
          if (onFileCreated) {
            onFileCreated(filePath);
          }
        } catch (error) {
          console.error('[IDE] Failed to create file from AI:', error);
          setFileCreationProgress(prev => 
            prev.map(p => p.filename === filename ? { ...p, status: 'error' } : p)
          );
        }
      }
      
      setAiStatus('All files created successfully');
      setStatusPanel({
        type: 'success',
        message: `Created ${matches.length} file(s)`,
        details: 'Files are ready in the explorer'
      });
      
      // Clear progress after a delay
      setTimeout(() => {
        setFileCreationProgress([]);
        setAiStatus('');
        setStatusPanel(null);
      }, 3000);
      
      // Refresh file list
      loadFiles(currentPath);
    } else {
      console.log('[IDE] No code blocks found in AI response');
      setAiStatus('No code blocks found');
      setTimeout(() => setAiStatus(''), 2000);
    }
  };

  const loadFiles = async (path: string) => {
    try {
      const response = await fetch(`/api/files?action=list&path=${encodeURIComponent(path)}`);
      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
        setCurrentPath(path);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const loadFile = async (file: FileItem) => {
    if (file.isDirectory) {
      // Toggle expand/collapse for directories
      setFiles(prev => prev.map(f => 
        f.path === file.path 
          ? { ...f, expanded: !f.expanded }
          : f
      ));
      
      // Load children if not already loaded
      if (!file.expanded && !file.children) {
        try {
          const response = await fetch(`/api/files?action=list&path=${encodeURIComponent(file.path)}`);
          const data = await response.json();
          if (data.success) {
            setFiles(prev => prev.map(f => 
              f.path === file.path 
                ? { ...f, children: data.files, expanded: true }
                : f
            ));
          }
        } catch (error) {
          console.error('Failed to load directory:', error);
        }
      }
      return;
    }

    try {
      const response = await fetch(`/api/files?action=read&path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      if (data.success) {
        setFileContent(data.content);
        setSelectedFile(file);
        setActiveTab(file);
        setIsModified(false);
        
        // Add to tabs if not already open
        if (!openTabs.find(tab => tab.path === file.path)) {
          setOpenTabs(prev => [...prev, file]);
        }
      }
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  const closeTab = (file: FileItem) => {
    setOpenTabs(prev => prev.filter(tab => tab.path !== file.path));
    if (activeTab?.path === file.path) {
      const remainingTabs = openTabs.filter(tab => tab.path !== file.path);
      if (remainingTabs.length > 0) {
        loadFile(remainingTabs[remainingTabs.length - 1]);
      } else {
        setActiveTab(null);
        setSelectedFile(null);
        setFileContent('');
      }
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write',
          path: selectedFile.path,
          content: fileContent
        })
      });
      const data = await response.json();
      if (data.success) {
        setIsModified(false);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const executeFile = async () => {
    if (!selectedFile) return;
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    const executableExts = ['sh', 'py', 'js', 'ts', 'rb', 'pl', 'php'];
    
    if (!executableExts.includes(ext || '')) {
      setStatusPanel({
        type: 'error',
        message: 'Cannot execute this file type',
        details: `Supported: .sh, .py, .js, .ts, .rb, .pl, .php`
      });
      return;
    }
    
    setIsExecuting(true);
    setShowExecutionPanel(true);
    setExecutionOutput(`Executing ${selectedFile.name}...\n`);
    setStatusPanel({
      type: 'info',
      message: `Running ${selectedFile.name}`,
      details: 'Execution started...'
    });
    
    try {
      // First save the file
      await saveFile();
      
      // Call execute API
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile.path,
          language: ext
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setExecutionOutput(prev => prev + (data.output || 'No output'));
        setStatusPanel({
          type: 'success',
          message: 'Execution completed',
          details: `Exit code: ${data.exitCode || 0}`
        });
      } else {
        setExecutionOutput(prev => prev + `\nError: ${data.error}`);
        setStatusPanel({
          type: 'error',
          message: 'Execution failed',
          details: data.error
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setExecutionOutput(prev => prev + `\nError: ${errorMsg}`);
      setStatusPanel({
        type: 'error',
        message: 'Execution failed',
        details: errorMsg
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const createNewFile = async () => {
    if (!newFileName) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          path: currentPath,
          name: newFileName
        })
      });
      const data = await response.json();
      if (data.success) {
        setShowNewFileDialog(false);
        setNewFileName('');
        loadFiles(currentPath);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const deleteFile = async (file: FileItem) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          path: file.path
        })
      });
      const data = await response.json();
      if (data.success) {
        loadFiles(currentPath);
        if (selectedFile?.path === file.path) {
          setSelectedFile(null);
          setFileContent('');
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  useEffect(() => {
    loadFiles(currentPath);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-[#3c3c3c] overflow-hidden">
      {/* Header */}
      <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between bg-[#252526] flex-shrink-0">
        <div className="flex items-center gap-2">
          <File className="w-4 h-4 text-[#cccccc]" />
          <span className="text-sm text-[#cccccc] font-semibold">Explorer</span>
          {aiStatus && (
            <span className="text-xs text-[#007acc] ml-4">{aiStatus}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMemory(!showMemory)}
            className={`p-1 rounded ${showMemory ? 'bg-[#0e639c] text-white' : 'hover:bg-[#3c3c3c]'}`}
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* File Tree Sidebar */}
        <div className="w-48 border-r border-[#3c3c3c] flex flex-col bg-[#252526] flex-shrink-0">
          <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-[#cccccc]">Files</span>
            <button
              onClick={() => setShowNewFileDialog(true)}
              className="p-1 hover:bg-[#3c3c3c] rounded"
            >
              <Plus className="w-3 h-3 text-[#cccccc]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {files.length === 0 ? (
              <div className="text-xs text-[#858585] p-2">No files yet</div>
            ) : (
              files.map((file) => (
                <div key={file.path}>
                  <div
                    onClick={() => loadFile(file)}
                    className={`flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-[#2a2d2e] ${
                      selectedFile?.path === file.path ? 'bg-[#37373d]' : ''
                    }`}
                  >
                    {file.isDirectory ? (
                      <Folder className="w-3 h-3 text-[#dcb67a] flex-shrink-0" />
                    ) : (
                      <File className="w-3 h-3 text-[#519aba] flex-shrink-0" />
                    )}
                    <span className="text-xs text-[#cccccc] truncate">{file.name}</span>
                  </div>
                  {/* Render children if expanded */}
                  {file.isDirectory && file.expanded && file.children && (
                    <div className="ml-4">
                      {file.children.map((child) => (
                        <div
                          key={child.path}
                          onClick={() => loadFile(child)}
                          className={`flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-[#2a2d2e] ${
                            selectedFile?.path === child.path ? 'bg-[#37373d]' : ''
                          }`}
                        >
                          <File className="w-3 h-3 text-[#519aba] flex-shrink-0" />
                          <span className="text-xs text-[#cccccc] truncate">{child.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs Bar */}
          {openTabs.length > 0 && (
            <div className="flex border-b border-[#3c3c3c] overflow-x-auto flex-shrink-0 bg-[#252526]">
              {openTabs.map((tab) => (
                <div
                  key={tab.path}
                  onClick={() => loadFile(tab)}
                  className={`flex items-center gap-2 px-3 py-1 border-r border-[#3c3c3c] cursor-pointer hover:bg-[#2a2d2e] flex-shrink-0 ${
                    activeTab?.path === tab.path ? 'bg-[#1e1e1e] border-t-2 border-t-[#007acc]' : ''
                  }`}
                >
                  <File className="w-3 h-3 text-[#519aba] flex-shrink-0" />
                  <span className="text-xs text-[#cccccc] truncate max-w-32">{tab.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab);
                    }}
                    className="p-0.5 hover:bg-[#3c3c3c] rounded flex-shrink-0"
                  >
                    <X className="w-3 h-3 text-[#858585]" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedFile ? (
            <>
              <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between flex-shrink-0 bg-[#252526]">
                <span className="text-xs text-[#cccccc] truncate">{selectedFile.name}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isModified && <span className="text-xs text-[#c5c5c5]">Modified</span>}
                  
                  {/* Execute Button */}
                  {selectedFile && ['sh', 'py', 'js', 'ts', 'rb', 'pl', 'php'].includes(selectedFile.name.split('.').pop()?.toLowerCase() || '') && (
                    <button
                      onClick={executeFile}
                      disabled={isExecuting}
                      className="p-1 hover:bg-[#3c3c3c] rounded flex-shrink-0 disabled:opacity-50"
                      title="Execute file"
                    >
                      <Play className={`w-4 h-4 ${isExecuting ? 'text-[#007acc] animate-pulse' : 'text-[#4ec9b0]'}`} />
                    </button>
                  )}
                  
                  <button
                    onClick={saveFile}
                    className="p-1 hover:bg-[#3c3c3c] rounded flex-shrink-0"
                  >
                    <Save className="w-4 h-4 text-[#cccccc]" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  value={fileContent}
                  onChange={(value) => {
                    setFileContent(value || '');
                    setIsModified(true);
                  }}
                  theme="vs-dark"
                  options={{
                    fontSize: 12,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#858585] min-h-0">
              <div className="text-center">
                <File className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a file to edit</p>
              </div>
            </div>
          )}
        </div>

        {/* Memory Panel */}
        {showMemory && (
          <div className="w-64 border-l border-[#3c3c3c] flex flex-col flex-shrink-0 bg-[#252526]">
            <div className="p-2 border-b border-[#3c3c3c] flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3 h-3 text-[#cccccc] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search memory..."
                  value={memorySearch}
                  onChange={(e) => setMemorySearch(e.target.value)}
                  className="flex-1 bg-[#3c3c3c] border-none outline-none text-xs text-[#cccccc] placeholder-[#858585]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              <div className="text-xs text-[#858585] mb-2">Memory System</div>
              <div className="text-xs text-[#858585]">
                <p>File operations, commands, and notes are stored in memory for persistence.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Windsurf-style Status Panel */}
      {statusPanel && (
        <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-40 flex items-center gap-3 ${
          statusPanel.type === 'success' ? 'bg-[#4ec9b0] text-black' : 
          statusPanel.type === 'error' ? 'bg-[#f44336] text-white' : 
          'bg-[#007acc] text-white'
        }`}>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{statusPanel.message}</span>
            {statusPanel.details && (
              <span className="text-xs opacity-90">{statusPanel.details}</span>
            )}
          </div>
          <button
            onClick={() => setStatusPanel(null)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Execution Panel (Terminal) */}
      {showExecutionPanel && (
        <div 
          ref={executionPanelRef}
          className="fixed bottom-0 left-0 right-0 h-48 bg-[#1e1e1e] border-t border-[#3c3c3c] z-30 flex flex-col"
        >
          <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#cccccc] font-semibold">Terminal</span>
              {isExecuting && (
                <span className="text-xs text-[#007acc] animate-pulse">Running...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExecutionOutput('')}
                className="text-xs text-[#858585] hover:text-[#cccccc] px-2 py-1"
              >
                Clear
              </button>
              <button
                onClick={() => setShowExecutionPanel(false)}
                className="p-1 hover:bg-[#3c3c3c] rounded"
              >
                <X className="w-3 h-3 text-[#858585]" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
            {executionOutput ? (
              <pre className="text-[#cccccc] whitespace-pre-wrap">{executionOutput}</pre>
            ) : (
              <span className="text-[#858585]">No output yet. Execute a file to see results.</span>
            )}
          </div>
        </div>
      )}

      {/* New File Dialog */}
      {showNewFileDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-4 w-96">
            <h3 className="text-sm text-[#cccccc] mb-2">Create New File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.txt"
              className="w-full bg-[#3c3c3c] border border-[#3c3c3c] rounded p-2 text-[#cccccc] text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFileDialog(false)}
                className="px-3 py-1 border border-[#3c3c3c] rounded text-[#cccccc] text-sm hover:bg-[#3c3c3c]"
              >
                Cancel
              </button>
              <button
                onClick={createNewFile}
                className="px-3 py-1 bg-[#0e639c] border border-[#0e639c] rounded text-[#cccccc] text-sm hover:bg-[#1177bb]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
