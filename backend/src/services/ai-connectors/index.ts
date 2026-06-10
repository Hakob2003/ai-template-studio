import { Provider } from '@prisma/client';
import { HuggingFaceConnector } from './huggingface';
import { ComfyUIConnector } from './comfyui';
import { StableDiffusionConnector } from './stable-diffusion';
import { OllamaConnector } from './ollama';
import { GeminiConnector } from './gemini';
import { BaseAIConnector } from './base';

export function createConnector(provider: string, modelId?: string, params?: any): BaseAIConnector {
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  switch (provider) {
    case Provider.HUGGINGFACE:
      apiKey = process.env.HUGGINGFACE_API_KEY;
      return new HuggingFaceConnector({ apiKey, modelId });
      
    case Provider.COMFYUI:
      baseUrl = process.env.COMFYUI_BASE_URL || 'http://localhost:8188';
      return new ComfyUIConnector({ baseUrl, modelId, workflow: params?.workflow });
      
    case Provider.STABLE_DIFFUSION:
      apiKey = process.env.STABILITY_API_KEY || process.env.STABLE_DIFFUSION_API_KEY;
      return new StableDiffusionConnector({ apiKey, modelId });
      
    case Provider.OLLAMA:
      baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      return new OllamaConnector({ baseUrl, modelId });
      
    case Provider.GEMINI:
      apiKey = process.env.GEMINI_API_KEY;
      return new GeminiConnector({ apiKey, modelId });
      
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}