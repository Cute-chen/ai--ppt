import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { getJob, getJobEvents, getJobs, retryJob } from './jobs.controller';

const router = Router();

router.get('/jobs', authRequired, getJobs);
router.get('/jobs/:jobId', authRequired, getJob);
router.get('/jobs/:jobId/events', authRequired, getJobEvents);
router.post('/jobs/:jobId/retry', authRequired, retryJob);

export default router;
