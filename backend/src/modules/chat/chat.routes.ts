import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import {
  clearChatMessages,
  createChatMessage,
  createChatMessageStream,
  deleteChatMessage,
  listChatMessages
} from './chat.controller';

const router = Router();

router.get('/projects/:id/chat/messages', authRequired, listChatMessages);
router.post('/projects/:id/chat/messages', authRequired, createChatMessage);
router.post('/projects/:id/chat/messages/stream', authRequired, createChatMessageStream);
router.delete('/projects/:id/chat/messages', authRequired, clearChatMessages);
router.delete('/projects/:id/chat/messages/:messageId', authRequired, deleteChatMessage);

export default router;
