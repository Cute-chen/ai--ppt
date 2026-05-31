import { executeSql, one } from '../common/db/sql';

type ModelConfigRow = {
  user_id: number;
  analysis_provider: 'openai' | 'anthropic';
  analysis_base_url: string;
  analysis_model: string;
  analysis_api_key_enc: string;
  image_type: 'newapi_channel_conn';
  image_url: string;
  image_model: string;
  image_key_enc: string;
};

export class ModelConfigRepository {
  public async findByUserUuid(userUuid: string): Promise<ModelConfigRow | undefined> {
    return one<ModelConfigRow>(
      `SELECT
         c.user_id,
         c.analysis_provider,
         c.analysis_base_url,
         c.analysis_model,
         c.analysis_api_key_enc,
         c.image_type,
         c.image_url,
         c.image_model,
         c.image_key_enc
       FROM user_model_configs c
       INNER JOIN users u ON u.id = c.user_id
       WHERE u.user_uuid = ?
       LIMIT 1`,
      [userUuid]
    );
  }

  public async upsertByUserUuid(
    userUuid: string,
    input: {
      analysisProvider: 'openai' | 'anthropic';
      analysisBaseUrl: string;
      analysisModel: string;
      analysisApiKeyEnc: string;
      imageType: 'newapi_channel_conn';
      imageUrl: string;
      imageModel: string;
      imageKeyEnc: string;
    }
  ): Promise<void> {
    await executeSql(
      `INSERT INTO user_model_configs (
         user_id,
         analysis_provider,
         analysis_base_url,
         analysis_model,
         analysis_api_key_enc,
         image_type,
         image_url,
         image_model,
         image_key_enc
       )
       SELECT
         u.id,
         ?, ?, ?, ?, ?, ?, ?, ?
       FROM users u
       WHERE u.user_uuid = ?
       ON DUPLICATE KEY UPDATE
         analysis_provider = VALUES(analysis_provider),
         analysis_base_url = VALUES(analysis_base_url),
         analysis_model = VALUES(analysis_model),
         analysis_api_key_enc = VALUES(analysis_api_key_enc),
         image_type = VALUES(image_type),
         image_url = VALUES(image_url),
         image_model = VALUES(image_model),
         image_key_enc = VALUES(image_key_enc)`,
      [
        input.analysisProvider,
        input.analysisBaseUrl,
        input.analysisModel,
        input.analysisApiKeyEnc,
        input.imageType,
        input.imageUrl,
        input.imageModel,
        input.imageKeyEnc,
        userUuid
      ]
    );
  }
}

export const modelConfigRepository = new ModelConfigRepository();
