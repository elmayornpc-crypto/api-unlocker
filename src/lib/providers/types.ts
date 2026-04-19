export interface ProviderResponse {
  content: string;
  model: string;
  provider: string;
  success: boolean;
  error?: string;
}

export interface ProviderRequest {
  message: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface Provider {
  name: string;
  models: string[];
  testConnection(): Promise<boolean>;
  generateResponse(request: ProviderRequest): Promise<ProviderResponse>;
}

export interface ProviderStatus {
  name: string;
  available: boolean;
  responseTime?: number;
  lastChecked: Date;
}
