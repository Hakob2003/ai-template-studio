import { BaseAIConnector } from './base';
import axios from 'axios';

export class ComfyUIConnector extends BaseAIConnector {
  private get baseUrl(): string {
    return this.config.baseUrl || 'http://localhost:8188';
  }

  async generate(
    prompt: string,
    negativePrompt?: string,
    params?: Record<string, any>,
    inputImage?: Buffer
  ): Promise<Buffer> {
    // Получаем workflow из конфига или создаём простой
    let workflow = this.config.workflow;

    if (!workflow) {
      workflow = this.createDefaultWorkflow(prompt, negativePrompt, params);
    } else {
      // Заменяем плейсхолдеры в workflow
      workflow = JSON.parse(JSON.stringify(workflow));
      this.injectPromptIntoWorkflow(workflow, prompt, negativePrompt);
    }

    // Отправляем workflow
    const promptResponse = await axios.post(
      `${this.baseUrl}/prompt`,
      { prompt: workflow },
      { timeout: 30000 }
    );

    const promptId = promptResponse.data.prompt_id;

    // Ожидаем результат
    const result = await this.waitForResult(promptId);
    return result;
  }

  private createDefaultWorkflow(prompt: string, negative?: string, params?: any) {
    return {
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: params?.seed || Math.floor(Math.random() * 9999999999),
          steps: params?.steps || 30,
          cfg: params?.cfg || 7,
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: ['4', 0],
          positive: ['6', 0],
          negative: ['7', 0],
          latent_image: ['5', 0],
        },
      },
      '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: params?.checkpoint || 'sd_xl_base_1.0.safetensors' } },
      '5': { class_type: 'EmptyLatentImage', inputs: { width: params?.width || 1024, height: params?.height || 1024, batch_size: 1 } },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['4', 1] } },
      '7': { class_type: 'CLIPTextEncode', inputs: { text: negative || 'ugly, deformed', clip: ['4', 1] } },
      '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
      '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'ComfyUI', images: ['8', 0] } },
    };
  }

  private injectPromptIntoWorkflow(workflow: any, prompt: string, negative?: string) {
    for (const key of Object.keys(workflow)) {
      const node = workflow[key];
      if (node.class_type === 'CLIPTextEncode') {
        if (node._meta?.title?.toLowerCase().includes('positive') || !node._meta) {
          node.inputs.text = prompt;
        }
        if (node._meta?.title?.toLowerCase().includes('negative')) {
          node.inputs.text = negative || 'ugly, deformed';
        }
      }
    }
  }

  private async waitForResult(promptId: string): Promise<Buffer> {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const historyRes = await axios.get(`${this.baseUrl}/history/${promptId}`, { timeout: 10000 });
      const history = historyRes.data[promptId];

      if (!history) continue;

      if (history.outputs) {
        const outputKeys = Object.keys(history.outputs);
        for (const key of outputKeys) {
          const output = history.outputs[key];
          if (output.images && output.images.length > 0) {
            const image = output.images[0];
            const imgRes = await axios.get(
              `${this.baseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=${image.type || 'output'}`,
              { responseType: 'arraybuffer', timeout: 30000 }
            );
            return Buffer.from(imgRes.data);
          }
        }
      }
    }

    throw new Error('Timeout waiting for ComfyUI result');
  }

  getCapabilities() {
    return {
      maxResolution: { width: 2048, height: 2048 },
      supportsImageToImage: true,
      supportsInpainting: true,
      estimatedTime: 30,
    };
  }
}