'use client';

import React, { useState, useEffect, useRef } from 'react';
import { File, Folder, MessageSquare, Settings, X, Send, Bot, ChevronRight, ChevronDown } from 'lucide-react';
import IDE from '@/components/IDE';
import { useResizable } from '@/hooks/useResizable';

// Code block component with syntax highlighting
function CodeBlock({ code, language }: { code: string; language: string }) {
  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      javascript: '#f7df1e',
      typescript: '#3178c6',
      python: '#3776ab',
      html: '#e34c26',
      css: '#264de4',
      json: '#000000',
      sql: '#f29111',
      bash: '#4eaa25',
      powershell: '#012456',
      rust: '#dea584',
      go: '#00add8',
      java: '#b07219',
      cpp: '#f34b7d',
      c: '#555555',
      php: '#4f5d95',
      ruby: '#701516',
      swift: '#ffac45',
      kotlin: '#a97bff',
      default: '#858585'
    };
    return colors[lang.toLowerCase()] || colors.default;
  };

  return (
    <div className="my-2 rounded-lg overflow-hidden bg-[#1e1e1e] border border-[#3c3c3c]">
      <div 
        className="px-3 py-1 text-xs font-semibold text-white flex items-center gap-2"
        style={{ backgroundColor: getLanguageColor(language) + '40', borderBottom: `2px solid ${getLanguageColor(language)}` }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLanguageColor(language) }}></span>
        {language || 'code'}
      </div>
      <pre className="p-3 text-xs text-[#d4d4d4] overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Parse message content and render with code blocks
function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Regex to match code blocks with optional language
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">{text}</span>
      );
    }
    
    // Add code block
    const language = match[1] || 'text';
    const code = match[2].trim();
    parts.push(
      <CodeBlock key={`code-${match.index}`} code={code} language={language} />
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-end`} className="whitespace-pre-wrap">{content.slice(lastIndex)}</span>
    );
  }
  
  return <>{parts}</>;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status?: 'thinking' | 'generating' | 'done' | 'error';
  error?: string;
}

export default function Home() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [lastAIResponse, setLastAIResponse] = useState<string>('');
  const [activePanel, setActivePanel] = useState<'explorer' | 'search' | 'git' | 'debug'>('explorer');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [openedFolder, setOpenedFolder] = useState<string>('');
  const [filesToOpen, setFilesToOpen] = useState<string[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingBoxRef = useRef<HTMLDivElement>(null);

  // Resizable panel hooks
  const sidebarResize = useResizable({ minWidth: 200, maxWidth: 500, initialWidth: 256 });
  const chatResize = useResizable({ minWidth: 280, maxWidth: 600, initialWidth: 320 });

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `${Date.now()}-user`,
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');

    // Create assistant message with thinking status
    const assistantMessage: Message = {
      id: `${Date.now()}-assistant`,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      status: 'thinking'
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          provider: 'G4F',
          model: 'auto',
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI service');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.status === 'thinking') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, status: 'thinking', content: 'Thinking...' }
                    : msg
                ));
              } else if (data.status === 'generating') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, status: 'generating', content: 'Generating response...' }
                    : msg
                ));
                const chunk = data.content;
                if (chunk) {
                  setStreamingContent(prev => prev + chunk);
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: msg.content + chunk, status: 'generating' }
                      : msg
                  ));
                }
              } else if (data.content) {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, content: msg.content + data.content, status: 'generating' }
                    : msg
                ));
              } else if (data.status === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, status: 'done' }
                    : msg
                ));
                setLastAIResponse(assistantMessage.content);
              } else if (data.status === 'error') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessage.id 
                    ? { ...msg, status: 'error', error: data.error, content: `Error: ${data.error}` }
                    : msg
                ));
              }
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to AI service';
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, status: 'error', error: errorMessage, content: `Error: ${errorMessage}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleOpenFolder = () => {
    const folderPath = prompt('Enter folder path:', 'C:\\Users\\USER\\Desktop\\SUPERPROJECTS');
    if (folderPath) {
      setOpenedFolder(folderPath);
    }
  };

  const getWorkingFolder = () => {
    if (openedFolder) return openedFolder;
    return 'C:\\Users\\USER\\Desktop\\SUPERPROJECTS';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-screen flex bg-[#1e1e1e] text-white overflow-hidden">
      {/* Activity Bar */}
      <div className="w-12 bg-[#333333] flex flex-col items-center py-2">
        <button
          onClick={handleOpenFolder}
          className="p-3 mb-2 rounded transition-colors text-[#858585] hover:text-white"
          title="Open Folder"
        >
          <Folder className="w-6 h-6" />
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`p-3 mb-2 rounded transition-colors ${showChat ? 'bg-[#1e1e1e] text-white' : 'text-[#858585] hover:text-white'}`}
          title="Toggle AI Chat"
        >
          <Bot className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            const theme = prompt('Enter theme (dark/light):', 'dark');
            console.log('Theme:', theme);
          }}
          className="p-3 mb-auto rounded transition-colors text-[#858585] hover:text-white"
          title="Settings"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar - Only show when folder is opened */}
      {openedFolder && (
        <div 
          className="bg-[#252526] border-r border-[#3c3c3c] flex flex-col relative"
          style={{ width: sidebarResize.width }}
        >
          <div className="p-2 text-xs font-semibold text-[#bbbbbb] uppercase tracking-wide">
            Explorer
          </div>
          <div className="p-2 text-xs text-[#cccccc] truncate">
            {openedFolder}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-xs text-[#858585]">
              Files will be loaded from opened folder
            </div>
          </div>
          {/* Resize handle */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007acc] ${sidebarResize.isResizing ? 'bg-[#007acc]' : 'bg-transparent'}`}
            onMouseDown={sidebarResize.startResize}
            title="Drag to resize"
          />
        </div>
      )}

      {/* No folder opened state */}
      {!openedFolder && (
        <div 
          className="bg-[#252526] border-r border-[#3c3c3c] flex flex-col items-center justify-center p-4 relative"
          style={{ width: sidebarResize.width }}
        >
          <Folder className="w-12 h-12 text-[#858585] mb-4" />
          <p className="text-sm text-[#cccccc] text-center mb-4">
            No folder opened
          </p>
          <button
            onClick={handleOpenFolder}
            className="px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] rounded text-sm"
          >
            Open Folder
          </button>
          <p className="text-xs text-[#858585] mt-4 text-center">
            Or let AI create projects in<br/>Desktop\SUPERPROJECTS
          </p>
          {/* Resize handle */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007acc] ${sidebarResize.isResizing ? 'bg-[#007acc]' : 'bg-transparent'}`}
            onMouseDown={sidebarResize.startResize}
            title="Drag to resize"
          />
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor */}
        <div className="flex-1 flex">
          <IDE 
            workingFolder={getWorkingFolder()}
            aiResponse={lastAIResponse}
            onFileCreated={(path) => {
              console.log('File created:', path);
              // Add file to auto-open queue
              setFilesToOpen(prev => [...prev, path]);
            }}
            autoOpenFile={filesToOpen[filesToOpen.length - 1]}
            apiURL={API_URL}
          />
        </div>

        {/* Streaming Response Box */}
        {(isStreaming || streamingContent) && (
          <div 
            ref={streamingBoxRef}
            className="h-48 bg-[#1e1e1e] border-t border-[#3c3c3c] flex flex-col"
          >
            <div className="p-2 border-b border-[#3c3c3c] flex items-center justify-between bg-[#252526]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#007acc]" />
                <span className="text-xs font-semibold text-[#cccccc]">AI Response Stream</span>
                {isStreaming && (
                  <span className="text-xs text-[#007acc] animate-pulse">● Generating...</span>
                )}
              </div>
              <button
                onClick={() => {
                  setStreamingContent('');
                  setIsStreaming(false);
                }}
                className="p-1 hover:bg-[#3c3c3c] rounded"
              >
                <X className="w-3 h-3 text-[#858585]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {streamingContent ? (
                <MessageContent content={streamingContent} />
              ) : (
                <div className="text-xs text-[#858585] italic">Waiting for AI response...</div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* AI Chat Panel */}
      {showChat && (
        <div 
          className="bg-[#252526] border-l border-[#3c3c3c] flex flex-col relative"
          style={{ width: chatResize.width }}
        >
          {/* Resize handle on left side */}
          <div
            className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#007acc] ${chatResize.isResizing ? 'bg-[#007acc]' : 'bg-transparent'}`}
            onMouseDown={chatResize.startResize}
            title="Drag to resize"
          />
          <div className="p-3 border-b border-[#3c3c3c] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#007acc]" />
              <span className="text-sm font-semibold">AI Assistant</span>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="p-1 hover:bg-[#3c3c3c] rounded"
            >
              <X className="w-4 h-4 text-[#858585]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-[#0e639c] ml-8'
                    : 'bg-[#3c3c3c] mr-8'
                }`}
              >
                {message.role === 'assistant' && message.status === 'thinking' && (
                  <div className="flex items-center gap-2 text-[#858585] text-xs mb-1">
                    <div className="animate-spin w-3 h-3 border-2 border-[#858585] border-t-transparent rounded-full" />
                    <span>Thinking...</span>
                  </div>
                )}
                {message.role === 'assistant' && message.status === 'generating' && (
                  <div className="flex items-center gap-2 text-[#007acc] text-xs mb-1">
                    <div className="animate-pulse">●</div>
                    <span>Generating response...</span>
                  </div>
                )}
                {message.role === 'assistant' && message.status === 'error' && (
                  <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
                    <span>Error</span>
                  </div>
                )}
                <div className="text-xs text-[#cccccc]">
                  <MessageContent content={message.content} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-[#3c3c3c]">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                rows={2}
                className="flex-1 bg-[#3c3c3c] border border-[#3c3c3c] outline-none text-[#cccccc] placeholder-[#858585] text-sm px-3 py-2 min-w-0 resize-none leading-5"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="px-4 py-2 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-[#858585] rounded text-sm flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Buttons */}
      <div className="fixed bottom-4 right-4 flex gap-2">
        {!showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="p-3 bg-[#0e639c] hover:bg-[#1177bb] rounded-lg shadow-lg"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
