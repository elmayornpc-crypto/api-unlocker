import { Provider, ProviderRequest, ProviderResponse } from './types';

export class PuterProvider implements Provider {
  name = 'PUTER';
  models = ['gpt-5.4-nano', 'gpt-5.3-chat', 'gpt-5.2', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo'];

  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple request to Puter's API
      const response = await fetch('https://api.puter.com/v2/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'test',
          model: 'gpt-5.4-nano'
        }),
        signal: AbortSignal.timeout(10000)
      });
      return response.ok || response.status === 401; // 401 means endpoint exists but needs auth
    } catch (error) {
      console.error('Puter connection test failed:', error);
      return false;
    }
  }

  async generateResponse(request: ProviderRequest): Promise<ProviderResponse> {
    const model = request.model || 'gpt-5.4-nano';
    
    try {
      // Use Puter's JavaScript API via their REST endpoint
      // Puter provides free OpenAI-compatible API without API keys
      const response = await fetch('https://api.puter.com/v2/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          message: request.message,
          model: model,
          stream: false,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2048
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const data = await response.json();
        let content = '';
        
        // Try to extract content from various response formats
        if (data.message?.content) {
          content = data.message.content;
        } else if (data.content) {
          content = data.content;
        } else if (data.choices?.[0]?.message?.content) {
          content = data.choices[0].message.content;
        } else if (data.response) {
          content = data.response;
        } else if (typeof data === 'string') {
          content = data;
        }
        
        if (content && content.trim()) {
          return {
            content: content.trim(),
            model,
            provider: `${this.name} (Free)`,
            success: true
          };
        }
      }

      // If Puter API fails, try alternative free endpoints
      return await this.tryAlternativeEndpoints(request, model);
      
    } catch (error) {
      console.error('Puter provider error:', error);
      return await this.tryAlternativeEndpoints(request, model);
    }
  }

  private async tryAlternativeEndpoints(request: ProviderRequest, model: string): Promise<ProviderResponse> {
    // Try other working free endpoints
    const alternativeEndpoints = [
      {
        url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        type: 'huggingface'
      },
      {
        url: 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
        type: 'huggingface'
      }
    ];

    for (const endpoint of alternativeEndpoints) {
      try {
        let body: any;
        let headers: any = {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };

        if (endpoint.type === 'huggingface') {
          body = {
            inputs: request.message,
            parameters: {
              max_new_tokens: 1000,
              temperature: 0.7,
              return_full_text: false
            }
          };
        }

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
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
              model,
              provider: `${this.name} (HuggingFace)`,
              success: true
            };
          }
        }
      } catch (error) {
        continue;
      }
    }

    // If all fail, return error (not demo response)
    return {
      content: '',
      model,
      provider: this.name,
      success: false,
      error: 'All free endpoints failed. Please try again later or configure API keys for premium services.'
    };
  }
}
