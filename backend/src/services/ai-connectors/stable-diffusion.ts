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
    // === MOCK GENERATION ===
    // Поскольку у вас нет локального Stable Diffusion, а HuggingFace заблокирован провайдером,
    // мы эмулируем успешную генерацию случайной картинкой, чтобы вы могли увидеть
    // полный рабочий процесс приложения (отправка, статус, сохранение, галерея).
    
    // Имитируем время генерации (3 секунды)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const response = await axios.get(`https://picsum.photos/${params?.width || 1024}/${params?.height || 1024}`, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      return Buffer.from(response.data);
    } catch (e) {
      throw new Error('Failed to fetch mock image from picsum.photos');
    }
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