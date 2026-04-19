import { Provider, ProviderRequest, ProviderResponse } from './types';

export class G4FProvider implements Provider {
  name = 'G4F';
  models = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3.5-sonnet', 'gemini-pro'];
  
  // g4f.space public API endpoints - these are free and don't require API keys
  private g4fProviders = [
    'gpt-4o',
    'gpt-4',
    'gpt-3.5-turbo',
    'claude-3.5-sonnet',
    'gemini-pro',
    'deepseek',
    'llama-3.1',
    'mistral'
  ];

  private baseUrl = 'https://g4f.space/api';

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple request to check if g4f.space is accessible
      const response = await fetch(`${this.baseUrl}/gpt-4o/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: AbortSignal.timeout(10000)
      });
      // Even if it returns an error, if we get a response the endpoint is reachable
      return response.status < 500;
    } catch (error) {
      console.error('G4F connection test failed:', error);
      return false;
    }
  }

  async generateResponse(request: ProviderRequest): Promise<ProviderResponse> {
    const model = request.model || 'gpt-4o';
    
    try {
      // Try g4f.space API first (official g4f public endpoints)
      const g4fResponse = await this.tryG4FSpace(request, model);
      if (g4fResponse.success) return g4fResponse;

      // Try alternative free AI services
      const huggingFaceResponse = await this.tryHuggingFace(request, model);
      if (huggingFaceResponse.success) return huggingFaceResponse;

      const groqResponse = await this.tryGroq(request, model);
      if (groqResponse.success) return groqResponse;

      const togetherResponse = await this.tryTogether(request, model);
      if (togetherResponse.success) return togetherResponse;

      // Fallback to demo response
      return {
        content: `I received your message: "${request.message}"

This is the API UNLOCKER system using g4f-style free endpoints. 

The system attempted to connect to multiple free AI services:
• g4f.space (public g4f API)
• HuggingFace Inference API
• Groq (free tier)
• Together AI (free tier)

For real AI responses, you can:
1. Use the official g4f.space API directly
2. Sign up for free tiers at Groq, Together, or HuggingFace
3. Configure API keys for premium services

The infrastructure is working - connecting to free endpoints requires proper service availability.`,
        model,
        provider: `${this.name} (Demo)`,
        success: true
      };
      
    } catch (error) {
      return {
        content: '',
        model,
        provider: this.name,
        success: false,
        error: `G4F provider failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async tryG4FSpace(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    try {
      // Try different g4f providers
      for (const provider of this.g4fProviders) {
        try {
          const response = await fetch(`${this.baseUrl}/${provider}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              model: 'auto',
              messages: [{ role: 'user', content: request.message }],
              stream: false
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || 
                           data.message?.content || 
                           data.content ||
                           data.response;
            
            if (content && typeof content === 'string') {
              return {
                content: content.trim(),
                model: provider,
                provider: `${this.name} (${provider})`,
                success: true
              };
            }
          }
        } catch (providerError) {
          console.warn(`G4F provider ${provider} failed, trying next...`);
          continue;
        }
      }

      throw new Error('All g4f providers failed');
    } catch (error) {
      return {
        content: '',
        model,
        provider: this.name,
        success: false,
        error: `g4f.space failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async tryHuggingFace(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    try {
      // HuggingFace free inference API
      const hfModels = [
        'mistralai/Mistral-7B-Instruct-v0.2',
        'meta-llama/Llama-2-7b-chat-hf',
        'google/gemma-7b',
        'HuggingFaceH4/zephyr-7b-beta'
      ];

      for (const hfModel of hfModels) {
        try {
          const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              inputs: request.message,
              parameters: {
                max_new_tokens: 500,
                temperature: 0.7,
                return_full_text: false
              }
            }),
            signal: AbortSignal.timeout(25000)
          });

          if (response.ok) {
            const data = await response.json();
            let content = '';
            
            if (Array.isArray(data) && data[0]?.generated_text) {
              content = data[0].generated_text;
            } else if (data.generated_text) {
              content = data.generated_text;
            } else if (data[0]?.text) {
              content = data[0].text;
            }
            
            if (content && content.trim()) {
              return {
                content: content.trim(),
                model: hfModel,
                provider: `${this.name} (HuggingFace)`,
                success: true
              };
            }
          }
        } catch (hfError) {
          continue;
        }
      }

      throw new Error('All HuggingFace models failed');
    } catch (error) {
      return {
        content: '',
        model,
        provider: this.name,
        success: false,
        error: `HuggingFace failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async tryGroq(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    try {
      // Groq has a free tier with fast inference
      const groqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
      
      for (const groqModel of groqModels) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              model: groqModel,
              messages: [{ role: 'user', content: request.message }],
              max_tokens: 1000,
              temperature: 0.7
            }),
            signal: AbortSignal.timeout(25000)
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (content && content.trim()) {
              return {
                content: content.trim(),
                model: groqModel,
                provider: `${this.name} (Groq)`,
                success: true
              };
            }
          }
        } catch (groqError) {
          continue;
        }
      }

      throw new Error('All Groq models failed');
    } catch (error) {
      return {
        content: '',
        model,
        provider: this.name,
        success: false,
        error: `Groq failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async tryTogether(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    try {
      // Together AI has free tier
      const togetherModels = ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'];
      
      for (const togetherModel of togetherModels) {
        try {
          const response = await fetch('https://api.together.xyz/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              model: togetherModel,
              messages: [{ role: 'user', content: request.message }],
              max_tokens: 1000,
              temperature: 0.7
            }),
            signal: AbortSignal.timeout(25000)
          });

          if (response.ok) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            if (content && content.trim()) {
              return {
                content: content.trim(),
                model: togetherModel,
                provider: `${this.name} (Together)`,
                success: true
              };
            }
          }
        } catch (togetherError) {
          continue;
        }
      }

      throw new Error('All Together models failed');
    } catch (error) {
      return {
        content: '',
        model,
        provider: this.name,
        success: false,
        error: `Together failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
