export interface DiscoveredEndpoint {
  url: string;
  provider: string;
  model: string;
  latency?: number;
  available: boolean;
  lastChecked: Date;
}

interface EndpointTestResult {
  endpoint: DiscoveredEndpoint;
  success: boolean;
  error?: string;
  latency?: number;
}

export class EndpointDiscovery {
  private discoveredEndpoints: Map<string, DiscoveredEndpoint> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Known free AI endpoints from various sources
  private knownEndpoints = [
    // g4f.space endpoints
    { url: 'https://g4f.space/api/gpt-4o/chat/completions', provider: 'G4F', model: 'gpt-4o' },
    { url: 'https://g4f.space/api/gpt-4/chat/completions', provider: 'G4F', model: 'gpt-4' },
    { url: 'https://g4f.space/api/claude-3.5-sonnet/chat/completions', provider: 'G4F', model: 'claude-3.5-sonnet' },
    { url: 'https://g4f.space/api/gemini-pro/chat/completions', provider: 'G4F', model: 'gemini-pro' },
    
    // HuggingFace Inference API (free tier)
    { url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', provider: 'HuggingFace', model: 'Mistral-7B' },
    { url: 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf', provider: 'HuggingFace', model: 'Llama-2-7b' },
    { url: 'https://api-inference.huggingface.co/models/google/gemma-7b', provider: 'HuggingFace', model: 'Gemma-7b' },
    { url: 'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', provider: 'HuggingFace', model: 'Zephyr-7b' },
    
    // Groq (free tier)
    { url: 'https://api.groq.com/openai/v1/chat/completions', provider: 'Groq', model: 'llama-3.3-70b-versatile' },
    { url: 'https://api.groq.com/openai/v1/chat/completions', provider: 'Groq', model: 'llama-3.1-8b-instant' },
    
    // Together AI (free tier)
    { url: 'https://api.together.xyz/v1/chat/completions', provider: 'Together', model: 'meta-llama/Llama-2-70b-chat-hf' },
    
    // Perplexity (public API)
    { url: 'https://www.perplexity.ai/api/search', provider: 'Perplexity', model: 'pplx-7b-online' },
    
    // You.com (free AI search)
    { url: 'https://you.com/api/streamingSearch', provider: 'You.com', model: 'youchat' },
    
    // Phind (free AI for coding)
    { url: 'https://www.phind.com/api/infer', provider: 'Phind', model: 'gpt-4' },
    
    // Community proxies and reverse proxies
    { url: 'https://gpt4all.io/v1/chat/completions', provider: 'GPT4All', model: 'gpt-4' },
    { url: 'https://api.openai-proxy.com/v1/chat/completions', provider: 'OpenAIProxy', model: 'gpt-4' },
  ];

  async discoverEndpoints(): Promise<DiscoveredEndpoint[]> {
    console.log('[ENDPOINT_DISCOVERY] Starting endpoint discovery...');
    
    const results: DiscoveredEndpoint[] = [];
    
    for (const endpoint of this.knownEndpoints) {
      const cacheKey = `${endpoint.provider}-${endpoint.model}`;
      const cached = this.discoveredEndpoints.get(cacheKey);
      
      // Return cached result if still valid
      if (cached && Date.now() - cached.lastChecked.getTime() < this.cacheTimeout) {
        results.push(cached);
        continue;
      }
      
      // Test the endpoint
      const testResult = await this.testEndpoint(endpoint);
      
      const discovered: DiscoveredEndpoint = {
        ...endpoint,
        latency: testResult.success ? (testResult.latency || 0) : undefined,
        available: testResult.success,
        lastChecked: new Date()
      };
      
      this.discoveredEndpoints.set(cacheKey, discovered);
      results.push(discovered);
      
      console.log(`[ENDPOINT_DISCOVERY] ${endpoint.provider}/${endpoint.model}: ${testResult.success ? '✓ AVAILABLE' : '✗ FAILED'} ${testResult.latency ? `(${testResult.latency}ms)` : ''}`);
    }
    
    // Sort by availability and latency
    const sorted = results
      .filter(e => e.available)
      .sort((a, b) => (a.latency || Infinity) - (b.latency || Infinity));
    
    console.log(`[ENDPOINT_DISCOVERY] Discovery complete. ${sorted.length} available endpoints found.`);
    
    return sorted;
  }

  private async testEndpoint(endpoint: { url: string; provider: string; model: string }): Promise<EndpointTestResult> {
    const startTime = Date.now();
    
    try {
      let body: any;
      let headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      // Customize request based on provider
      if (endpoint.provider === 'HuggingFace') {
        body = {
          inputs: 'test',
          parameters: {
            max_new_tokens: 10,
            temperature: 0.7
          }
        };
      } else if (endpoint.provider === 'Perplexity' || endpoint.provider === 'You.com') {
        body = {
          q: 'test',
          search_type: 'web'
        };
      } else if (endpoint.provider === 'Phind') {
        body = {
          question: 'test',
          options: {
            model: endpoint.model,
            creativity: 0.7,
            detailed: false,
            anonymous: true
          }
        };
      } else {
        // Standard OpenAI-compatible format
        body = {
          model: endpoint.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
          temperature: 0.7
        };
      }

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const latency = Date.now() - startTime;

      // Consider it available if we get any response (even errors, as long as it's not a network error)
      if (response.status < 500) {
        return {
          endpoint: { ...endpoint, latency, available: true, lastChecked: new Date() },
          success: true,
          latency
        };
      }

      return {
        endpoint: { ...endpoint, available: false, lastChecked: new Date() },
        success: false,
        error: `HTTP ${response.status}`
      };

    } catch (error) {
      return {
        endpoint: { ...endpoint, available: false, lastChecked: new Date() },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getFastestAvailableEndpoint(): Promise<DiscoveredEndpoint | null> {
    const available = await this.discoverEndpoints();
    return available.length > 0 ? available[0] : null;
  }

  async getAllAvailableEndpoints(): Promise<DiscoveredEndpoint[]> {
    const all = await this.discoverEndpoints();
    return all.filter(e => e.available);
  }

  clearCache(): void {
    this.discoveredEndpoints.clear();
    console.log('[ENDPOINT_DISCOVERY] Cache cleared');
  }
}

// Singleton instance
export const endpointDiscovery = new EndpointDiscovery();
