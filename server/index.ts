import express from 'express';
import cors from 'cors';
import { apiUnlocker } from './lib/api-logic';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// System prompt
const SYSTEM_PROMPT = `You are an AI coding assistant integrated into a web-based IDE called "Cascade IDE". Your role is to help users write, understand, and improve code.

CRITICAL RULES:
1. ALWAYS use code blocks with filename format: \`\`\`language:filename.extension
   Example: \`\`\`javascript:app.js
2. Create COMPLETE, WORKING solutions with ALL necessary files
3. ALWAYS include a brief summary AFTER the code explaining:
   - What was implemented
   - Key features/functions
   - How to use it

RESPONSE FORMAT:
1. Brief introduction (1-2 sentences)
2. Code blocks for each file with proper filenames
3. Summary section explaining the implementation

Remember: The IDE automatically creates files from your code blocks, so be precise with filenames!`;

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    status: 'API_UNLOCKER_ONLINE',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/chat', '/api/status', '/api/files']
  });
});

// Chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { message, provider, model, temperature, maxTokens, stream = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const providerRequest = {
      message: `${SYSTEM_PROMPT}\n\nUser request: ${message}`,
      model,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2048
    };

    const preferredProvider = provider || 'G4F';

    // Streaming response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send thinking status
      res.write(`data: ${JSON.stringify({ status: "thinking" })}\n\n`);
      
      const response = await apiUnlocker.generateResponseWithFailover(
        providerRequest,
        preferredProvider
      );

      if (response.success) {
        res.write(`data: ${JSON.stringify({ status: "generating" })}\n\n`);
        
        // Stream the content character by character
        const content = response.content;
        for (let i = 0; i < content.length; i++) {
          const chunk = content[i];
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          // Small delay to simulate typing
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        res.write(`data: ${JSON.stringify({ status: "done", provider: response.provider, model: response.model })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ status: "error", error: response.error || 'Failed to get response' })}\n\n`);
      }
      res.end();
    } else {
      // Non-streaming response
      const response = await apiUnlocker.generateResponseWithFailover(
        providerRequest,
        preferredProvider
      );

      if (response.success) {
        res.json({
          success: true,
          content: response.content,
          model: response.model,
          provider: response.provider
        });
      } else {
        res.status(503).json({
          success: false,
          error: response.error,
          provider: response.provider
        });
      }
    }
  } catch (error) {
    console.error('[CHAT_API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Files API (mock - file system operations)
app.post('/api/files', async (req, res) => {
  try {
    const { action, path, content } = req.body;

    if (action === 'write') {
      // In production, implement actual file writing
      res.json({ success: true, message: 'File written' });
    } else if (action === 'read') {
      // In production, implement actual file reading
      res.json({ success: true, content: '' });
    } else if (action === 'list') {
      // In production, implement actual file listing
      res.json({ success: true, files: [] });
    } else if (action === 'delete') {
      // In production, implement actual file deletion
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`  - POST /api/chat`);
  console.log(`  - POST /api/files`);
  console.log(`  - GET  /api/status`);
});
