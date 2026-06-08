import { BaseAIConnector } from './base';
import axios from 'axios';

export class HuggingFaceConnector extends BaseAIConnector {
  private get apiUrl(): string {
    return `https://api-inference.huggingface.co/models/${this.config.modelId || 'stabilityai/stable-diffusion-xl-base-1.0'}`;
  }

  async generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer> {
    if (!this.config.apiKey) {
      throw new Error('Hugging Face API key is required');
    }

    const payload: any = {
      inputs: prompt,
      parameters: {
        negative_prompt: negativePrompt || 'ugly, deformed, low quality, blurry',
        num_inference_steps: params?.steps || 30,
        guidance_scale: params?.cfg || 7.5,
        width: params?.width || 1024,
        height: params?.height || 1024,
        ...params,
      },
    };

    const response = await axios.post(this.apiUrl, payload, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    return Buffer.from(response.data);
  }

  getCapabilities() {
    return {
      maxResolution: { width: 1024, height: 1024 },
      supportsImageToImage: true,
      supportsInpainting: false,
      estimatedTime: 15,
    };
  }
}