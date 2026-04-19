import { Provider, ProviderRequest, ProviderResponse } from './types';
import { getFreeEndpoints, EndpointConfig } from './free-ai-endpoints';

export class G4FRealProvider implements Provider {
  name = 'G4F';
  models = ['auto', 'gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3.5-sonnet', 'gemini-pro'];
  
  // Use 50+ free endpoints from the endpoints list
  private endpoints: EndpointConfig[];
  
  constructor() {
    this.endpoints = getFreeEndpoints();
    console.log(`[G4F] Loaded ${this.endpoints.length} free endpoints`);
  }

  async testConnection(): Promise<boolean> {
    for (const endpoint of this.endpoints) {
      try {
        let response;
        const baseUrl = endpoint.url;
        
        // Special handling for pollinations endpoints
        if (endpoint.type === 'pollinations') {
          response = await fetch(`${baseUrl}?prompt=test&model=openai`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
          });
        } else {
          // Standard OpenAI-compatible test
          response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 5
            }),
            signal: AbortSignal.timeout(10000)
          });
        }
        
        if (response.ok || response.status === 401 || response.status === 429) {
          console.log(`[G4F] ${endpoint.name} is reachable`);
          return true;
        }
      } catch (error) {
        console.warn(`[G4F] Endpoint failed connection test:`, error);
        continue;
      }
    }
    return false;
  }

  async generateResponse(request: ProviderRequest): Promise<ProviderResponse> {
    const model = request.model === 'auto' ? 'gpt-3.5-turbo' : (request.model || 'gpt-3.5-turbo');
    
    // Try all 50+ endpoints
    for (const endpoint of this.endpoints) {
      try {
        console.log(`[G4F] Trying endpoint: ${endpoint.name} (${endpoint.url})`);
        const baseUrl = endpoint.url;
        
        // Special handling for pollinations endpoints
        if (endpoint.type === 'pollinations') {
          const prompt = encodeURIComponent(request.message);
          const response = await fetch(`${baseUrl}?prompt=${prompt}&model=openai&seed=${Date.now()}`, {
            method: 'GET',
            headers: {
              'Accept': 'text/plain',
            },
            signal: AbortSignal.timeout(30000)
          });

          if (!response.ok) {
            console.warn(`[G4F] ${endpoint.name} returned ${response.status}`);
            continue;
          }

          const content = await response.text();
          
          if (content && content.length > 0) {
            console.log(`[G4F] Success with ${endpoint.name}`);
            return {
              content: content.trim(),
              model: 'gpt-3.5-turbo',
              provider: `${this.name} (${endpoint.name})`,
              success: true
            };
          }
          continue;
        }
        
        // Standard OpenAI-compatible format for other endpoints
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: request.message }],
            temperature: request.temperature || 0.7,
            max_tokens: request.maxTokens || 2048,
            stream: false
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.warn(`[G4F] ${endpoint.name} returned ${response.status}: ${errorText.substring(0, 100)}`);
          continue;
        }

        const data = await response.json().catch(() => null);
        
        if (!data) {
          console.warn(`[G4F] ${endpoint.name} returned invalid JSON`);
          continue;
        }
        
        const content = data.choices?.[0]?.message?.content || 
                       data.choices?.[0]?.text || 
                       data.message?.content ||
                       data.response ||
                       data.text;
        
        if (content && typeof content === 'string' && content.length > 0) {
          console.log(`[G4F] Success with ${endpoint.name}`);
          return {
            content: content.trim(),
            model: data.model || model,
            provider: `${this.name} (${endpoint.name})`,
            success: true
          };
        }
        
        console.warn(`[G4F] ${endpoint.name} returned empty or invalid content`);
      } catch (error) {
        console.warn(`[G4F] ${endpoint.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    return {
      content: '',
      model,
      provider: this.name,
      success: false,
      error: `All ${this.endpoints.length} AI endpoints failed. The free services may be temporarily unavailable, rate-limited, or blocked. Please try again later or check your internet connection.`
    };
  }
}
