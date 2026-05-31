import { Request, Response } from 'express';
import { ok } from '../../common/http/response';
import { authService } from '../../services/auth.service';

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = await authService.getCurrentUser(userId);
  ok(res, data);
};
