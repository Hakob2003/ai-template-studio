import { BaseAIConnector } from './base';
import axios from 'axios';

export class OllamaConnector extends BaseAIConnector {
  private get baseUrl(): string {
    return this.config.baseUrl || 'http://localhost:11434';
  }

  async generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer> {
    // Ollama в основном для LLM. Для генерации изображений
    // можно использовать модели с поддержкой vision/image gen
    const modelName = this.config.modelId || 'llava';

    const payload: any = {
      model: modelName,
      prompt: `${prompt}\nNegative prompt: ${negativePrompt || 'none'}`,
      stream: false,
    };

    if (inputImage) {
      payload.images = [inputImage.toString('base64')];
    }

    const response = await axios.post(
      `${this.baseUrl}/api/generate`,
      payload,
      { timeout: 60000 }
    );

    // Проверяем, есть ли изображения в ответе
    if (response.data.images && response.data.images.length > 0) {
      return Buffer.from(response.data.images[0], 'base64');
    }

    throw new Error('Ollama model did not return an image. Use a vision-capable model.');
  }

  getCapabilities() {
    return {
      maxResolution: { width: 512, height: 512 },
      supportsImageToImage: true,
      supportsInpainting: false,
      estimatedTime: 10,
    };
  }
}