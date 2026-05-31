import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import {
  getModelConfigTutorial,
  getMyModelConfig,
  putMyModelConfig,
  validateMyModelConfig
} from './model-config.controller';

const router = Router();

router.get('/model-config/tutorial', getModelConfigTutorial);
router.get('/model-config', authRequired, getMyModelConfig);
router.put('/model-config', authRequired, putMyModelConfig);
router.post('/model-config/validate', authRequired, validateMyModelConfig);

export default router;
