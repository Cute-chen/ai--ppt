import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import {
  createProject,
  getProjectAnalysisSummary,
  getProjectDetail,
  listProjects,
  patchProjectCustomStyle
} from './projects.controller';

const router = Router();

router.get('/projects', authRequired, listProjects);
router.post('/projects', authRequired, createProject);
router.get('/projects/:id', authRequired, getProjectDetail);
router.patch('/projects/:id/custom-style', authRequired, patchProjectCustomStyle);
router.get('/projects/:id/analysis-summary', authRequired, getProjectAnalysisSummary);

export default router;
