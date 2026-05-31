import { Request, Response } from 'express';
import { ok } from '../../common/http/response';
import { modelConfigService } from '../../services/model-config.service';
import { modelConfigTutorialService } from '../../services/model-config-tutorial.service';

export const getMyModelConfig = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = await modelConfigService.getMaskedConfig(userId);
  ok(res, data);
};

export const putMyModelConfig = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = await modelConfigService.saveConfig(userId, req.body);
  ok(res, data, 'saved');
};

export const validateMyModelConfig = (req: Request, res: Response): void => {
  const data = modelConfigService.validateConfig(req.body || {});
  ok(res, data);
};

export const getModelConfigTutorial = (_req: Request, res: Response): void => {
  const data = modelConfigTutorialService.getTutorial();
  ok(res, data);
};
