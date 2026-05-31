import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { exportPdf, exportPptx, listProjectExports } from './export.controller';

const router = Router();

router.post('/projects/:id/export/pptx', authRequired, exportPptx);
router.post('/projects/:id/export/pdf', authRequired, exportPdf);
router.get('/projects/:id/export', authRequired, listProjectExports);

export default router;
