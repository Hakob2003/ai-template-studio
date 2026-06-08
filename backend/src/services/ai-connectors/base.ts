export interface ConnectorConfig {
  apiKey?: string;
  baseUrl?: string;
  modelId?: string;
  workflow?: any;
  [key: string]: any;
}

export interface GenerationResult {
  buffer: Buffer;
  metadata?: Record<string, any>;
}

export abstract class BaseAIConnector {
  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig) {
    this.config = config;
  }

  abstract generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer>;

  abstract getCapabilities(): {
    maxResolution: { width: number; height: number };
    supportsImageToImage: boolean;
    supportsInpainting: boolean;
    estimatedTime: number; // in seconds
  };
}