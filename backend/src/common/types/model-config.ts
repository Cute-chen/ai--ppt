export type AnalysisProvider = 'openai' | 'anthropic';

export type AnalysisModelConfig = {
  provider: AnalysisProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ImageModelConfig = {
  _type: 'newapi_channel_conn';
  url: string; // OpenAI-compatible endpoint
  key: string;
  model: string;
};

export type UserModelConfig = {
  analysis: AnalysisModelConfig;
  image: ImageModelConfig;
};

export type UserModelConfigMasked = {
  analysis: Omit<AnalysisModelConfig, 'apiKey'> & { apiKeyMasked: string };
  image: Omit<ImageModelConfig, 'key'> & { keyMasked: string };
};

export type AnalysisModelConfigDTO = AnalysisModelConfig;
export type ImageModelConfigDTO = ImageModelConfig;
export type UserModelConfigDTO = UserModelConfig;
export type UserModelConfigMaskedDTO = UserModelConfigMasked;
