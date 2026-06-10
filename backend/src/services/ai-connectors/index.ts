import { AIConnection, Provider } from '@prisma/client';
import { decrypt } from '../../utils/crypto';
import { HuggingFaceConnector } from './huggingface';
import { ComfyUIConnector } from './comfyui';
import { StableDiffusionConnector } from './stable-diffusion';
import { OllamaConnector } from './ollama';
import { GeminiConnector } from './gemini';
import { BaseAIConnector } from './base';

export function createConnector(connection: AIConnection): BaseAIConnector {
  const apiKey = connection.encryptedApiKey
    ? decrypt(connection.encryptedApiKey)
    : undefined;

  const config = {
    apiKey,
    baseUrl: connection.baseUrl || undefined,
    modelId: connection.modelId || undefined,
    workflow: (connection.workflow as any) || undefined,
    meta: (connection.meta as any) || {},
  };

  switch (connection.provider) {
    case Provider.HUGGINGFACE:
      return new HuggingFaceConnector(config);
    case Provider.COMFYUI:
      return new ComfyUIConnector(config);
    case Provider.STABLE_DIFFUSION:
      return new StableDiffusionConnector(config);
    case Provider.OLLAMA:
      return new OllamaConnector(config);
    case Provider.GEMINI:
      return new GeminiConnector(config);
    default:
      throw new Error(`Unsupported provider: ${connection.provider}`);
  }
}