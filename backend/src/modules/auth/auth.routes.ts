import { Router } from 'express';
import { forgotPassword, login, register, sendCode } from './auth.controller';

const router = Router();

router.post('/send-code', sendCode);
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

export default router;
