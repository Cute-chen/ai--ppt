import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { createChatMessage, listChatMessages } from './chat.controller';

const router = Router();

router.get('/projects/:id/chat/messages', authRequired, listChatMessages);
router.post('/projects/:id/chat/messages', authRequired, createChatMessage);

export default router;
