import OpenAI from 'openai';
import { UserModelConfig } from '../../common/types/model-config';

const DATA_URL_PREFIX = 'data:image/png;base64,';

export class ImageGenerateService {
  public async generateSlideImage(
    config: UserModelConfig,
    prompt: string
  ): Promise<Buffer> {
    const client = new OpenAI({
      apiKey: config.image.key,
      baseURL: config.image.url
    });

    const result = await client.images.generate({
      model: config.image.model,
      prompt,
      size: '1536x1024'
    });

    const item = result.data?.[0];

    if (item?.b64_json) {
      return Buffer.from(item.b64_json, 'base64');
    }

    if (item?.url) {
      const res = await fetch(item.url);
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    }

    throw new Error('image generation returned empty data');
  }

  public buildDataUrl(pngBuffer: Buffer): string {
    return `${DATA_URL_PREFIX}${pngBuffer.toString('base64')}`;
  }
}

export const imageGenerateService = new ImageGenerateService();
