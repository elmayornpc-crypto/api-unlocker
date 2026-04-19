import { G4FRealProvider } from './providers/g4f-real-provider';
import { Provider, ProviderRequest, ProviderResponse, ProviderStatus } from './providers/types';

export class APIUnlocker {
  private providers: Provider[] = [];
  private providerStatus: Map<string, ProviderStatus> = new Map();
  
  constructor() {
    this.providers = [
      new G4FRealProvider()
    ];
    
    // Initialize provider status
    this.providers.forEach(provider => {
      this.providerStatus.set(provider.name, {
        name: provider.name,
        available: false,
        lastChecked: new Date()
      });
    });
  }

  async testAllProviders(): Promise<ProviderStatus[]> {
    const testPromises = this.providers.map(async (provider) => {
      const startTime = Date.now();
      const available = await provider.testConnection();
      const responseTime = Date.now() - startTime;
      
      const status: ProviderStatus = {
        name: provider.name,
        available,
        responseTime,
        lastChecked: new Date()
      };
      
      this.providerStatus.set(provider.name, status);
      return status;
    });

    return await Promise.all(testPromises);
  }

  async getFastestAvailableProvider(): Promise<Provider | null> {
    const status = await this.testAllProviders();
    const availableProviders = status
      .filter(s => s.available)
      .sort((a, b) => (a.responseTime || Infinity) - (b.responseTime || Infinity));
    
    if (availableProviders.length === 0) {
      return null;
    }
    
    const fastestName = availableProviders[0].name;
    return this.providers.find(p => p.name === fastestName) || null;
  }

  async generateResponseWithFailover(request: ProviderRequest, preferredProvider?: string): Promise<ProviderResponse> {
    const providersToTry = this.getProvidersInOrder(preferredProvider);
    
    for (const provider of providersToTry) {
      try {
        console.log(`[API_UNLOCKER] Attempting connection to ${provider.name}...`);
        
        // Test connection first
        const isAvailable = await provider.testConnection();
        if (!isAvailable) {
          console.log(`[API_UNLOCKER] ${provider.name} unavailable, trying next...`);
          continue;
        }
        
        // Try to generate response
        const response = await provider.generateResponse(request);
        
        if (response.success) {
          console.log(`[API_UNLOCKER] SUCCESS: Connected via ${response.provider}`);
          
          // Update provider status
          this.providerStatus.set(provider.name, {
            name: provider.name,
            available: true,
            lastChecked: new Date()
          });
          
          return response;
        } else {
          console.log(`[API_UNLOCKER] ${provider.name} failed: ${response.error}`);
        }
        
      } catch (error) {
        console.log(`[API_UNLOCKER] ${provider.name} error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // All providers failed
    return {
      content: '',
      model: request.model || 'unknown',
      provider: 'NONE',
      success: false,
      error: 'All providers failed. The system could not establish a connection to any AI service.'
    };
  }

  private getProvidersInOrder(preferredProvider?: string): Provider[] {
    if (preferredProvider) {
      const preferred = this.providers.find(p => p.name === preferredProvider.toUpperCase());
      if (preferred) {
        const others = this.providers.filter(p => p.name !== preferredProvider.toUpperCase());
        return [preferred, ...others];
      }
    }
    
    // Return in default order: GEMINI -> CLAUDE -> OPENAI (generally most reliable first)
    return this.providers;
  }

  async autoSearchBestProvider(): Promise<ProviderStatus[]> {
    console.log('[API_UNLOCKER] [AUTO_SEARCH] Scanning all endpoints...');
    
    const statuses = await this.testAllProviders();
    
    console.log('[API_UNLOCKER] [AUTO_SEARCH] Scan complete:');
    statuses.forEach(status => {
      const statusStr = status.available ? `✓ AVAILABLE (${status.responseTime}ms)` : '✗ FAILED';
      console.log(`[API_UNLOCKER] [AUTO_SEARCH] ${status.name}: ${statusStr}`);
    });
    
    return statuses;
  }

  getProviderStatus(): ProviderStatus[] {
    return Array.from(this.providerStatus.values());
  }

  getAvailableModels(): { provider: string; models: string[] }[] {
    return this.providers.map(provider => ({
      provider: provider.name,
      models: provider.models
    }));
  }

  async simulateInfiltrationSteps(): Promise<string[]> {
    const steps = [
      '[INITIATING_CONNECTION...]',
      '[SCANNING_ENDPOINTS...]',
      '[BYPASSING_AUTH...]',
      '[EXTRACTING_TOKEN...]',
      '[ESTABLISHING_SECURE_CHANNEL...]',
      '[SUCCESS: CONNECTION_STABLE]'
    ];
    
    const logs: string[] = [];
    
    for (const step of steps) {
      logs.push(step);
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    }
    
    return logs;
  }

  // Methods for discover endpoint
  async getFastestFreeEndpoint(): Promise<{ name: string; url: string; responseTime: number } | null> {
    const statuses = await this.testAllProviders();
    const available = statuses
      .filter(s => s.available)
      .sort((a, b) => (a.responseTime || Infinity) - (b.responseTime || Infinity));
    
    if (available.length === 0) return null;
    
    return {
      name: available[0].name,
      url: 'default',
      responseTime: available[0].responseTime || 0
    };
  }

  async getAllFreeEndpoints(): Promise<Array<{ name: string; url: string; available: boolean; responseTime?: number }>> {
    const statuses = await this.testAllProviders();
    return statuses.map(s => ({
      name: s.name,
      url: 'default',
      available: s.available,
      responseTime: s.responseTime
    }));
  }

  async discoverFreeEndpoints(): Promise<Array<{ name: string; url: string; available: boolean }>> {
    return this.getAllFreeEndpoints();
  }
}

// Singleton instance
export const apiUnlocker = new APIUnlocker();
