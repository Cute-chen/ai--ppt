import { Request, Response } from 'express';
import { ok } from '../../common/http/response';
import { stylesService } from '../../services/styles.service';

export const listStyles = async (_req: Request, res: Response): Promise<void> => {
  const data = await stylesService.listStyles();
  ok(res, data);
};

export const getStylePreview = async (req: Request, res: Response): Promise<void> => {
  const styleId = String(req.params.id || '');
  const previewPath = stylesService.resolvePreviewPath(styleId);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.sendFile(previewPath);
};
