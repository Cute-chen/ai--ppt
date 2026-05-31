import { AppError } from '../common/errors/app-error';
import {
  AnalysisModelConfig,
  ImageModelConfig,
  UserModelConfig,
  UserModelConfigMasked
} from '../common/types/model-config';
import { decryptText, encryptText } from '../common/utils/crypto';
import { maskSecret } from '../common/utils/mask';
import { modelConfigRepository } from '../repositories/model-config.repository';

const defaultConfig: UserModelConfig = {
  analysis: {
    provider: 'gpt',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4.1'
  },
  image: {
    _type: 'newapi_channel_conn',
    url: 'https://api.openai.com/v1',
    key: '',
    model: 'gpt-image-2'
  }
};

export class ModelConfigService {
  public async getMaskedConfig(userId: string): Promise<UserModelConfigMasked> {
    const merged = await this.getRawConfig(userId);

    return {
      analysis: {
        provider: merged.analysis.provider,
        baseUrl: merged.analysis.baseUrl,
        model: merged.analysis.model,
        apiKeyMasked: maskSecret(merged.analysis.apiKey)
      },
      image: {
        _type: merged.image._type,
        url: merged.image.url,
        model: merged.image.model,
        keyMasked: maskSecret(merged.image.key)
      }
    };
  }

  public async getRawConfig(userId: string): Promise<UserModelConfig> {
    const row = await modelConfigRepository.findByUserUuid(userId);

    if (!row) {
      return defaultConfig;
    }

    return {
      analysis: {
        provider: row.analysis_provider,
        baseUrl: row.analysis_base_url,
        apiKey: decryptText(row.analysis_api_key_enc),
        model: row.analysis_model
      },
      image: {
        _type: 'newapi_channel_conn',
        url: row.image_url,
        key: decryptText(row.image_key_enc),
        model: row.image_model
      }
    };
  }

  public async saveConfig(userId: string, input: UserModelConfig): Promise<UserModelConfigMasked> {
    this.validateInput(input);

    await modelConfigRepository.upsertByUserUuid(userId, {
      analysisProvider: input.analysis.provider,
      analysisBaseUrl: input.analysis.baseUrl,
      analysisModel: input.analysis.model,
      analysisApiKeyEnc: encryptText(input.analysis.apiKey),
      imageType: input.image._type,
      imageUrl: input.image.url,
      imageModel: input.image.model,
      imageKeyEnc: encryptText(input.image.key)
    });

    return this.getMaskedConfig(userId);
  }

  public validateConfig(input: {
    analysis?: Partial<AnalysisModelConfig>;
    image?: Partial<ImageModelConfig>;
  }): { analysis: { ok: boolean; message: string }; image: { ok: boolean; message: string } } {
    const analysisOk = Boolean(
      input.analysis?.provider &&
        input.analysis?.baseUrl &&
        input.analysis?.apiKey &&
        input.analysis?.model
    );
    const imageOk = Boolean(
      input.image?._type === 'newapi_channel_conn' &&
        input.image?.url &&
        input.image?.key &&
        input.image?.model === 'gpt-image-2'
    );

    return {
      analysis: {
        ok: analysisOk,
        message: analysisOk ? 'analysis config looks valid' : 'analysis config incomplete'
      },
      image: {
        ok: imageOk,
        message: imageOk ? 'image config looks valid' : 'image config incomplete or invalid'
      }
    };
  }

  private validateInput(input: UserModelConfig): void {
    if (!['gpt', 'claude'].includes(input.analysis.provider)) {
      throw new AppError('analysis.provider must be gpt or claude', 400);
    }

    if (!input.analysis.baseUrl || !input.analysis.model) {
      throw new AppError('analysis config is incomplete', 400);
    }

    if (input.image._type !== 'newapi_channel_conn') {
      throw new AppError('image._type must be newapi_channel_conn', 400);
    }

    if (input.image.model !== 'gpt-image-2') {
      throw new AppError('image.model must be gpt-image-2', 400);
    }

    if (!input.image.url) {
      throw new AppError('image.url is required', 400);
    }

    if (!input.image.key) {
      throw new AppError('image.key is required', 400);
    }
  }
}

export const modelConfigService = new ModelConfigService();
