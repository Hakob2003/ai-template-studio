import { BaseAIConnector, ConnectorConfig } from './base';
import axios from 'axios';

export class GeminiConnector extends BaseAIConnector {
  constructor(config: ConnectorConfig) {
    super(config);
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  async generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer> {
    try {
      const modelId = this.config.modelId || 'imagen-3.0-generate-001';
      const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
      
      const endpoint = `${baseUrl}/${modelId}:predict?key=${this.config.apiKey}`;

      const requestBody = {
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: params?.aspectRatio || '1:1',
          negativePrompt: negativePrompt || undefined
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.predictions && response.data.predictions.length > 0) {
        const base64Image = response.data.predictions[0].bytesBase64Encoded;
        if (base64Image) {
            return Buffer.from(base64Image, 'base64');
        }
      }
      
      throw new Error('No image returned from Gemini/Imagen API');
    } catch (error: any) {
      console.error('Gemini API Error:', error?.response?.data || error.message);
      
      // Fallback or detailed error
      const apiError = error?.response?.data?.error?.message;
      throw new Error(`Gemini generation failed: ${apiError || error.message}`);
    }
  }

  getCapabilities() {
    return {
      maxResolution: { width: 1024, height: 1024 },
      supportsImageToImage: false,
      supportsInpainting: false,
      estimatedTime: 8,
    };
  }
}
