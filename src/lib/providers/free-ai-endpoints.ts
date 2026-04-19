// Comprehensive list of 50+ free AI API endpoints
// These endpoints are publicly accessible and don't require API keys (or have free tiers)

export interface EndpointConfig {
  url: string;
  type: 'openai' | 'pollinations' | 'custom';
  name: string;
  requiresKey?: boolean;
}

export const FREE_AI_ENDPOINTS: EndpointConfig[] = [
  // Tier 1: Most reliable free endpoints
  { url: 'https://api.openai-proxy.org/v1', type: 'openai', name: 'OpenAI Proxy' },
  { url: 'https://api.pawan.krd/v1', type: 'openai', name: 'Pawan API' },
  { url: 'https://api.naga.ac/v1', type: 'openai', name: 'Naga AI' },
  // { url: 'https://api.airforce/v1', type: 'openai', name: 'Airforce AI', requiresKey: true }, // Requires API key, not free
  { url: 'https://api.mooo.com/v1', type: 'openai', name: 'Mooo AI' },
  
  // Pollinations endpoints (text generation)
  { url: 'https://api.pollinations.ai/preview', type: 'pollinations', name: 'Pollinations Preview' },
  { url: 'https://api.pollinations.ai/chat', type: 'pollinations', name: 'Pollinations Chat' },
  { url: 'https://text.pollinations.ai', type: 'pollinations', name: 'Pollinations Text' },
  
  // G4F endpoints
  { url: 'https://api.g4f.space/v1', type: 'openai', name: 'G4F API' },
  { url: 'https://g4f.space/api/v1', type: 'openai', name: 'G4F Space' },
  { url: 'https://api.g4f.ai/v1', type: 'openai', name: 'G4F AI' },
  
  // Free GPT endpoints
  { url: 'https://api.freegpt.com/v1', type: 'openai', name: 'FreeGPT' },
  { url: 'https://api.chatgpt.com/v1', type: 'openai', name: 'ChatGPT API' },
  { url: 'https://api.voidai.com/v1', type: 'openai', name: 'Void AI' },
  { url: 'https://api.aigpt.com/v1', type: 'openai', name: 'AI GPT' },
  { url: 'https://api.gptapi.us/v1', type: 'openai', name: 'GPT API US' },
  
  // OpenRouter (requires key but has free tier)
  { url: 'https://openrouter.ai/api/v1', type: 'openai', name: 'OpenRouter', requiresKey: true },
  
  // GitHub Models (requires token but free tier available)
  { url: 'https://models.inference.ai.azure.com', type: 'openai', name: 'GitHub Models', requiresKey: true },
  
  // HuggingFace Inference API (free tier)
  { url: 'https://api-inference.huggingface.co/models', type: 'custom', name: 'HuggingFace', requiresKey: true },
  
  // Cloudflare Workers AI
  { url: 'https://api.cloudflare.com/client/v4/accounts', type: 'custom', name: 'Cloudflare AI', requiresKey: true },
  
  // Groq (requires key but fast)
  { url: 'https://api.groq.com/openai/v1', type: 'openai', name: 'Groq', requiresKey: true },
  
  // Cohere (free tier)
  { url: 'https://api.cohere.ai/v1', type: 'custom', name: 'Cohere', requiresKey: true },
  
  // Mistral (free tier)
  { url: 'https://api.mistral.ai/v1', type: 'openai', name: 'Mistral', requiresKey: true },
  
  // Google AI Studio (free tier)
  { url: 'https://generativelanguage.googleapis.com/v1beta', type: 'custom', name: 'Google AI', requiresKey: true },
  
  // Additional free endpoints
  { url: 'https://api.llm7.io/v1', type: 'openai', name: 'LLM7' },
  { url: 'https://api.f0ck.me/v1', type: 'openai', name: 'F0ck AI' },
  { url: 'https://api.xiankuyun.com/v1', type: 'openai', name: 'Xiankuyun' },
  { url: 'https://api.oaifree.com/v1', type: 'openai', name: 'OAI Free' },
  { url: 'https://api.chatanywhere.tech/v1', type: 'openai', name: 'ChatAnywhere' },
  { url: 'https://api.theresanaiforthat.com/v1', type: 'openai', name: 'TAAFT' },
  { url: 'https://api.aiproxy.io/v1', type: 'openai', name: 'AI Proxy' },
  { url: 'https://api.gptgod.com/v1', type: 'openai', name: 'GPT God' },
  { url: 'https://api.aichat.com/v1', type: 'openai', name: 'AIChat' },
  { url: 'https://api.ailink.com/v1', type: 'openai', name: 'AI Link' },
  { url: 'https://api.chatglm.cn/v1', type: 'openai', name: 'ChatGLM' },
  { url: 'https://api.baichuan-ai.com/v1', type: 'openai', name: 'Baichuan' },
  { url: 'https://api.wenxin.baidu.com/v1', type: 'openai', name: 'Wenxin' },
  { url: 'https://api.spark-api.com/v1', type: 'openai', name: 'Spark' },
  { url: 'https://api.qwen.aliyun.com/v1', type: 'openai', name: 'Qwen' },
  { url: 'https://api.moonshot.cn/v1', type: 'openai', name: 'Moonshot' },
  { url: 'https://api.deepseek.com/v1', type: 'openai', name: 'DeepSeek', requiresKey: true },
  { url: 'https://api.anthropic.com/v1', type: 'openai', name: 'Anthropic', requiresKey: true },
  { url: 'https://api.fireworks.ai/v1', type: 'openai', name: 'Fireworks', requiresKey: true },
  { url: 'https://api.together.xyz/v1', type: 'openai', name: 'Together AI', requiresKey: true },
  { url: 'https://api.perplexity.ai/v1', type: 'openai', name: 'Perplexity', requiresKey: true },
  { url: 'https://api.ai21.com/v1', type: 'openai', name: 'AI21', requiresKey: true },
  { url: 'https://api.upstage.ai/v1', type: 'openai', name: 'Upstage', requiresKey: true },
  { url: 'https://api.nebius.ai/v1', type: 'openai', name: 'Nebius', requiresKey: true },
  { url: 'https://api.sambanova.ai/v1', type: 'openai', name: 'SambaNova', requiresKey: true },
  { url: 'https://api.scaleway.ai/v1', type: 'openai', name: 'Scaleway', requiresKey: true },
  { url: 'https://api.hyperbolic.xyz/v1', type: 'openai', name: 'Hyperbolic', requiresKey: true },
  { url: 'https://api.inference.net/v1', type: 'openai', name: 'Inference.net', requiresKey: true },
  { url: 'https://api.baseten.co/v1', type: 'openai', name: 'Baseten', requiresKey: true },
  { url: 'https://api.modal.com/v1', type: 'openai', name: 'Modal', requiresKey: true },
  { url: 'https://api.cerebras.ai/v1', type: 'openai', name: 'Cerebras', requiresKey: true },
  { url: 'https://api.nvidia.com/v1', type: 'openai', name: 'NVIDIA NIM', requiresKey: true },
];

// Get endpoints that don't require API keys (for auto-failover)
export const getFreeEndpoints = (): EndpointConfig[] => {
  return FREE_AI_ENDPOINTS.filter(e => !e.requiresKey);
};

// Get all endpoints (including those that need keys)
export const getAllEndpoints = (): EndpointConfig[] => {
  return FREE_AI_ENDPOINTS;
};
