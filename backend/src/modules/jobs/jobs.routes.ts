import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { cancelJob, deleteJob, getJob, getJobEvents, getJobs, retryJob } from './jobs.controller';

const router = Router();

router.get('/jobs', authRequired, getJobs);
router.get('/jobs/:jobId', authRequired, getJob);
router.get('/jobs/:jobId/events', authRequired, getJobEvents);
router.post('/jobs/:jobId/retry', authRequired, retryJob);
router.post('/jobs/:jobId/cancel', authRequired, cancelJob);
router.delete('/jobs/:jobId', authRequired, deleteJob);

export default router;
