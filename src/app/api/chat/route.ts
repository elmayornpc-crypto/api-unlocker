import { NextRequest, NextResponse } from 'next/server';
import { apiUnlocker } from '@/lib/api-logic';
import { ProviderRequest } from '@/lib/providers/types';

const SYSTEM_PROMPT = `You are Cascade, an AI coding assistant in a web IDE. You MUST generate clean, working code.

STRICT RULES:
1. EVERY code block MUST use format: \`\`\`language:filename.ext
2. NEVER return HTML, CSS links, or external resources
3. NEVER explain your thinking process
4. ALWAYS provide COMPLETE, RUNNABLE code
5. Use this format for each file:
   
   Creating: filename.ext
   \`\`\`language:filename.ext
   // complete code here
   \`\`\`

EXAMPLE RESPONSE:
Creating: index.html
\`\`\`html:index.html
<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body>
  <button id="btn">Click</button>
  <script src="app.js"></script>
</body>
</html>
\`\`\`

Creating: app.js
\`\`\`javascript:app.js
document.getElementById('btn').onclick = () => alert('Clicked!');
\`\`\`

Summary: Created a working click counter app.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, provider, model, temperature, maxTokens, stream = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const providerRequest: ProviderRequest = {
      message: `${SYSTEM_PROMPT}\n\nUser request: ${message}`,
      model,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 2048
    };

    const preferredProvider = provider || 'G4F';
    console.log(`[API_ROUTE] Received request for provider: ${preferredProvider}, stream: ${stream}`);

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send thinking status
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "thinking" })}\n\n`));
            
            const response = await apiUnlocker.generateResponseWithFailover(
              providerRequest,
              preferredProvider
            );

            if (response.success) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "generating" })}\n\n`));
              
              // Stream the content character by character
              const content = response.content;
              for (let i = 0; i < content.length; i++) {
                const chunk = content[i];
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
                // Small delay to simulate typing
                await new Promise(resolve => setTimeout(resolve, 10));
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "done", provider: response.provider, model: response.model })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", error: response.error || 'Failed to get response' })}\n\n`));
            }
            controller.close();
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
            controller.close();
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Non-streaming response (original behavior)
    const response = await apiUnlocker.generateResponseWithFailover(
      providerRequest,
      preferredProvider
    );

    if (response.success) {
      console.log(`[API_ROUTE] Success via ${response.provider}`);
      return NextResponse.json({
        success: true,
        content: response.content,
        model: response.model,
        provider: response.provider
      });
    } else {
      console.log(`[API_ROUTE] All providers failed: ${response.error}`);
      return NextResponse.json(
        {
          success: false,
          error: response.error,
          provider: response.provider
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error('[API_ROUTE] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'API_UNLOCKER_ONLINE',
    timestamp: new Date().toISOString(),
    endpoints: ['/api/chat', '/api/status', '/api/search']
  });
}
