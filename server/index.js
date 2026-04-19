const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import API logic from parent project
// We need to copy the necessary logic here

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

    const fullMessage = `${SYSTEM_PROMPT}\n\nUser request: ${message}`;

    // For now, return a mock response since we need the full G4F provider logic
    // In production, you would import and use the actual provider
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const encoder = new TextEncoder();
      
      // Send thinking status
      res.write(`data: ${JSON.stringify({ status: "thinking" })}\n\n`);
      
      // Simulate generating
      res.write(`data: ${JSON.stringify({ status: "generating" })}\n\n`);
      
      const mockResponse = `I can help you with that! However, this is a mock response. To get real AI responses, you need to integrate the G4F provider from the main project into this Express server.

Here's a simple example:
\`\`\`javascript:example.js
console.log("Hello, World!");
\`\`\`

Summary: This is a basic JavaScript example. For real AI responses, integrate the G4F provider.`;

      // Stream character by character
      for (let i = 0; i < mockResponse.length; i++) {
        res.write(`data: ${JSON.stringify({ content: mockResponse[i] })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      res.write(`data: ${JSON.stringify({ status: "done", provider: "MOCK", model: "mock-model" })}\n\n`);
      res.end();
    } else {
      res.json({
        success: true,
        content: `Mock response for: ${message}. Integrate G4F provider for real AI responses.`,
        model: 'mock-model',
        provider: 'MOCK'
      });
    }
  } catch (error) {
    console.error('[CHAT_API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Files API (mock)
app.post('/api/files', async (req, res) => {
  try {
    const { action, path, content } = req.body;

    if (action === 'write') {
      res.json({ success: true, message: 'File written (mock)' });
    } else if (action === 'read') {
      res.json({ success: true, content: 'Mock file content' });
    } else if (action === 'list') {
      res.json({ success: true, files: [] });
    } else if (action === 'delete') {
      res.json({ success: true, message: 'File deleted (mock)' });
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
