import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({
    code: 404,
    message: `Not Found: ${req.method} ${req.originalUrl}`
  });
};

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message
    });
    return;
  }

  res.status(500).json({
    code: 500,
    message: 'Internal Server Error',
    detail: err.message
  });
};
