import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { UserModelConfig } from '../../common/types/model-config';

type ChatMessageInput = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatOptions = { temperature?: number; maxTokens?: number };
type StreamDeltaHandler = (delta: string) => void | Promise<void>;

const normalizeText = (text: string): string => text.replace(/\r\n/g, '\n').trim();

export class LlmService {
  public async chat(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    options?: ChatOptions
  ): Promise<string> {
    if (config.analysis.provider === 'openai') {
      return this.chatWithGpt(config, messages, options);
    }

    return this.chatWithClaude(config, messages, options);
  }

  public async chatStream(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    onDelta: StreamDeltaHandler,
    options?: ChatOptions
  ): Promise<string> {
    if (config.analysis.provider === 'openai') {
      return this.chatWithGptStream(config, messages, onDelta, options);
    }

    return this.chatWithClaudeStream(config, messages, onDelta, options);
  }

  private async chatWithGpt(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    options?: ChatOptions
  ): Promise<string> {
    const client = new OpenAI({
      apiKey: config.analysis.apiKey,
      baseURL: config.analysis.baseUrl
    });

    const completion = await client.chat.completions.create({
      model: config.analysis.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1500
    });

    const text = completion.choices?.[0]?.message?.content || '';
    return normalizeText(text);
  }

  private async chatWithClaude(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    options?: ChatOptions
  ): Promise<string> {
    const client = new Anthropic({
      apiKey: config.analysis.apiKey,
      baseURL: config.analysis.baseUrl || undefined
    });

    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content.trim());
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const result = await client.messages.create({
      model: config.analysis.model,
      max_tokens: options?.maxTokens ?? 1500,
      temperature: options?.temperature ?? 0.3,
      system: systemParts.join('\n\n'),
      messages: nonSystem.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
    });

    const text = result.content
      .map((item) => {
        if (item.type === 'text') return item.text;
        return '';
      })
      .join('\n')
      .trim();

    return normalizeText(text);
  }

  private async chatWithGptStream(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    onDelta: StreamDeltaHandler,
    options?: ChatOptions
  ): Promise<string> {
    const client = new OpenAI({
      apiKey: config.analysis.apiKey,
      baseURL: config.analysis.baseUrl
    });

    const stream = await client.chat.completions.create({
      model: config.analysis.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1500,
      stream: true
    });

    let text = '';
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      text += delta;
      await onDelta(delta);
    }

    return normalizeText(text);
  }

  private async chatWithClaudeStream(
    config: UserModelConfig,
    messages: ChatMessageInput[],
    onDelta: StreamDeltaHandler,
    options?: ChatOptions
  ): Promise<string> {
    const client = new Anthropic({
      apiKey: config.analysis.apiKey,
      baseURL: config.analysis.baseUrl || undefined
    });

    const systemParts = messages.filter((m) => m.role === 'system').map((m) => m.content.trim());
    const nonSystem = messages.filter((m) => m.role !== 'system');

    const stream = await client.messages.create({
      model: config.analysis.model,
      max_tokens: options?.maxTokens ?? 1500,
      temperature: options?.temperature ?? 0.3,
      system: systemParts.join('\n\n'),
      messages: nonSystem.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      stream: true
    });

    let text = '';
    for await (const event of stream) {
      if (event.type !== 'content_block_delta') continue;
      if (!event.delta || event.delta.type !== 'text_delta') continue;

      const delta = event.delta.text || '';
      if (!delta) continue;
      text += delta;
      await onDelta(delta);
    }

    return normalizeText(text);
  }
}

export const llmService = new LlmService();
