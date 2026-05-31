import { Request, Response } from 'express';

export const healthCheck = (_req: Request, res: Response): void => {
  res.status(200).json({
    code: 0,
    message: 'ok',
    timestamp: new Date().toISOString()
  });
};
