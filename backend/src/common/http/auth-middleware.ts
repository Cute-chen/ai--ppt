import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { authService } from '../../services/auth.service';

export const authRequired = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('authorization') || req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('unauthorized', 401);
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userId = await authService.resolveUserByToken(token);
    if (!userId) {
      throw new AppError('invalid token', 401);
    }

    req.token = token;
    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
};
