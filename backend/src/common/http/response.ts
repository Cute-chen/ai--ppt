import { Response } from 'express';

export const ok = <T>(res: Response, data: T, message = 'ok') => {
  return res.status(200).json({
    code: 0,
    message,
    data
  });
};

export const created = <T>(res: Response, data: T, message = 'created') => {
  return res.status(201).json({
    code: 0,
    message,
    data
  });
};
