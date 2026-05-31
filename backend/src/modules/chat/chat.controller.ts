import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { llmService } from '../../services/llm/llm.service';
import { modelConfigService } from '../../services/model-config.service';
import { projectService } from '../../services/project.service';

const CHAT_STYLE_RULES = [
  '输出规范：',
  '1) 默认使用中文，除非用户明确要求其它语言。',
  '2) 不使用 Markdown 语法符号（如 **、#、```、- 列表）。',
  '3) 先给 1 句结论，再给最多 3 条可执行建议，每条尽量短。',
  '4) 最后一行必须是“下一步：...”。',
  '5) 不要输出“连接正常”“我已收到素材”等寒暄或状态播报。'
].join('\n');

const normalizeAssistantReply = (raw: string, fallbackSeed: string): string => {
  let text = String(raw || '').replace(/\r\n/g, '\n');

  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, (m) => m.trim())
    .replace(/连接正常[。！!\s]*/g, '')
    .replace(/我已收到[^。\n]*[。！!]\s*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    return `已收到你的调整：${fallbackSeed}`;
  }

  return text;
};

const buildAssistantPromptPayload = async (input: {
  userId: string;
  projectId: string;
  userContent: string;
}): Promise<{
  modelConfig: Awaited<ReturnType<typeof modelConfigService.getRawConfig>>;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}> => {
  const project = await projectService.getProject(input.userId, input.projectId);
  const modelConfig = await modelConfigService.getRawConfig(input.userId);
  const sourceChunks = await projectService.listSourceChunkContents(input.userId, input.projectId, 80);

  const prompt = [
    `项目名称：${project.name}`,
    `项目brief：${project.projectBrief || '无'}`,
    '你是演示文稿改稿助手。请基于用户要求给出明确可执行建议。',
    `用户请求：${input.userContent}`,
    '以下是素材分块（可能截断）：',
    sourceChunks.join('\n\n').slice(0, 10000) || '（无素材）'
  ].join('\n\n');

  return {
    modelConfig,
    messages: [
      {
        role: 'system',
        content: `你是专业 PPT 策划助手，回答要简洁、结构清晰、可执行。\n\n${CHAT_STYLE_RULES}`
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  };
};

const buildAssistantReply = async (input: {
  userId: string;
  projectId: string;
  userContent: string;
}): Promise<string> => {
  const payload = await buildAssistantPromptPayload(input);
  const answerRaw = await llmService.chat(payload.modelConfig, payload.messages, {
    temperature: 0.5,
    maxTokens: 1200
  });

  return normalizeAssistantReply(answerRaw, input.userContent);
};

export const listChatMessages = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.listChatMessages(userId, projectId);
  ok(res, data);
};

export const deleteChatMessage = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const messageId = String(req.params.messageId || '');
  const data = await projectService.deleteChatMessage(userId, projectId, messageId);
  ok(res, data, 'chat message deleted');
};

export const clearChatMessages = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.clearChatMessages(userId, projectId);
  ok(res, data, 'chat messages cleared');
};

export const createChatMessage = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const { content } = req.body as { content?: string };
  const userContent = content || '';

  const userMsg = await projectService.addChatMessage(userId, projectId, 'user', userContent);
  let assistantContent = '';
  try {
    assistantContent = await buildAssistantReply({
      userId,
      projectId,
      userContent
    });
  } catch {
    assistantContent = `已收到你的调整：${userContent}`;
  }

  assistantContent = normalizeAssistantReply(assistantContent, userContent);
  const assistantMsg = await projectService.addChatMessage(userId, projectId, 'assistant', assistantContent);

  created(
    res,
    {
      user: userMsg,
      assistant: assistantMsg
    },
    'message added'
  );
};

export const createChatMessageStream = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const { content } = req.body as { content?: string };
  const userContent = String(content || '').trim();

  if (!userContent) {
    res.status(400).json({ code: 400, message: 'content is required' });
    return;
  }

  const userMsg = await projectService.addChatMessage(userId, projectId, 'user', userContent);

  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const writeEvent = (event: string, data: Record<string, unknown>): void => {
    if (res.writableEnded || res.destroyed) return;
    res.write(`${JSON.stringify({ event, data })}\n`);
  };

  writeEvent('start', { user: userMsg });

  let assistantText = '';
  try {
    const payload = await buildAssistantPromptPayload({
      userId,
      projectId,
      userContent
    });

    assistantText = await llmService.chatStream(
      payload.modelConfig,
      payload.messages,
      async (delta) => {
        assistantText += delta;
        writeEvent('delta', { text: delta });
      },
      {
        temperature: 0.5,
        maxTokens: 1200
      }
    );

    if (!assistantText) {
      assistantText = `已收到你的调整：${userContent}`;
      writeEvent('delta', { text: assistantText });
    }

    assistantText = normalizeAssistantReply(assistantText, userContent);
    const assistantMsg = await projectService.addChatMessage(userId, projectId, 'assistant', assistantText);
    writeEvent('done', { assistant: assistantMsg });
  } catch {
    if (!assistantText) {
      assistantText = `已收到你的调整：${userContent}`;
      writeEvent('delta', { text: assistantText });
      assistantText = normalizeAssistantReply(assistantText, userContent);
      const assistantMsg = await projectService.addChatMessage(userId, projectId, 'assistant', assistantText);
      writeEvent('done', { assistant: assistantMsg, fallback: true });
    } else {
      assistantText = normalizeAssistantReply(assistantText, userContent);
      const assistantMsg = await projectService.addChatMessage(userId, projectId, 'assistant', assistantText);
      writeEvent('done', { assistant: assistantMsg, partial: true });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
};
