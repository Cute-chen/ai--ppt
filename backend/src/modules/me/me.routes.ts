import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { getMe } from './me.controller';

const router = Router();

router.get('/', authRequired, getMe);

export default router;
