import express, { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import {
  completeSourceUpload,
  createUploadPresign,
  directUploadObject,
  listProjectSources,
  removeProjectSource,
  reparseProjectSource
} from './sources.controller';

const router = Router();

router.put('/uploads/direct/*objectKey', express.raw({ type: () => true, limit: '100mb' }), directUploadObject);
router.post('/presign', authRequired, createUploadPresign);
router.post('/uploads/presign', authRequired, createUploadPresign);
router.post('/projects/:id/sources/complete', authRequired, completeSourceUpload);
router.get('/projects/:id/sources', authRequired, listProjectSources);
router.delete('/projects/:id/sources/:sourceId', authRequired, removeProjectSource);
router.post('/projects/:id/sources/:sourceId/reparse', authRequired, reparseProjectSource);

export default router;
