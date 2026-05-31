import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { authService } from '../../services/auth.service';

export const sendCode = async (req: Request, res: Response): Promise<void> => {
  const { email, purpose } = req.body as { email?: string; purpose?: string };
  const data = await authService.sendCode(email || '', purpose || '');
  created(res, data, 'code sent');
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  const data = await authService.login(email || '', password || '');
  ok(res, data, 'login success');
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, code, password } = req.body as {
    email?: string;
    code?: string;
    password?: string;
  };
  const data = await authService.register(email || '', code || '', password || '');
  created(res, data, 'register success');
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword } = req.body as {
    email?: string;
    code?: string;
    newPassword?: string;
  };
  const data = await authService.forgotPassword(email || '', code || '', newPassword || '');
  ok(res, data, 'password reset success');
};
