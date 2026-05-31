import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { llmService } from '../../services/llm/llm.service';
import { modelConfigService } from '../../services/model-config.service';
import { projectService } from '../../services/project.service';

const buildAssistantReply = async (input: {
  userId: string;
  projectId: string;
  userContent: string;
}): Promise<string> => {
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

  try {
    const answer = await llmService.chat(
      modelConfig,
      [
        {
          role: 'system',
          content: '你是专业 PPT 策划助手，回答要简洁、结构清晰、可执行。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        temperature: 0.5,
        maxTokens: 1200
      }
    );

    return answer || `已收到你的调整：${input.userContent}`;
  } catch {
    return `已收到你的调整：${input.userContent}`;
  }
};

export const listChatMessages = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.listChatMessages(userId, projectId);
  ok(res, data);
};

export const createChatMessage = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const { content } = req.body as { content?: string };

  const userMsg = await projectService.addChatMessage(userId, projectId, 'user', content || '');
  const assistantContent = await buildAssistantReply({
    userId,
    projectId,
    userContent: content || ''
  });

  const assistantMsg = await projectService.addChatMessage(
    userId,
    projectId,
    'assistant',
    assistantContent
  );

  created(
    res,
    {
      user: userMsg,
      assistant: assistantMsg
    },
    'message added'
  );
};
