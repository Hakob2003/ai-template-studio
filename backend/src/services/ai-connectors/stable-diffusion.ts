import { BaseAIConnector } from './base';
import axios from 'axios';

export class StableDiffusionConnector extends BaseAIConnector {
  private get baseUrl(): string {
    return this.config.baseUrl || 'http://localhost:7860';
  }

  async generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer> {
    const payload: any = {
      prompt,
      negative_prompt: negativePrompt || 'ugly, deformed, low quality',
      steps: params?.steps || 30,
      cfg_scale: params?.cfg || 7,
      width: params?.width || 1024,
      height: params?.height || 1024,
      sampler_name: params?.sampler || 'Euler a',
      seed: params?.seed || -1,
    };

    // Image-to-image
    if (inputImage) {
      payload.init_images = [inputImage.toString('base64')];
      payload.denoising_strength = params?.denoising || 0.75;
    }

    const response = await axios.post(
      `${this.baseUrl}/sdapi/v1/${inputImage ? 'img2img' : 'txt2img'}`,
      payload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000,
      }
    );

    const images = response.data.images;
    if (!images || images.length === 0) {
      throw new Error('No images generated');
    }

    return Buffer.from(images[0], 'base64');
  }

  getCapabilities() {
    return {
      maxResolution: { width: 2048, height: 2048 },
      supportsImageToImage: true,
      supportsInpainting: true,
      estimatedTime: 20,
    };
  }
}