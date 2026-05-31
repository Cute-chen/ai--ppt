import { Router } from 'express';
import authRoutes from './auth/auth.routes';
import modelConfigRoutes from './model-config/model-config.routes';
import projectsRoutes from './projects/projects.routes';
import sourcesRoutes from './sources/sources.routes';
import chatRoutes from './chat/chat.routes';
import studioRoutes from './studio/studio.routes';
import stylesRoutes from './styles/styles.routes';
import exportRoutes from './export/export.routes';
import jobsRoutes from './jobs/jobs.routes';
import meRoutes from './me/me.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', stylesRoutes);
router.use('/', modelConfigRoutes);
router.use('/me', meRoutes);
router.use('/me', modelConfigRoutes);
router.use('/', projectsRoutes);
router.use('/', sourcesRoutes);
router.use('/', chatRoutes);
router.use('/', studioRoutes);
router.use('/', exportRoutes);
router.use('/', jobsRoutes);

export default router;
