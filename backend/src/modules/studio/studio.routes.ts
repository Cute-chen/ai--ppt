import { Router } from 'express';
import { authRequired } from '../../common/http/auth-middleware';
import { generateDeck, getDeck, regenerateSlideImage, updateSlide } from './studio.controller';

const router = Router();

router.post('/projects/:id/deck/generate', authRequired, generateDeck);
router.get('/projects/:id/deck', authRequired, getDeck);
router.patch('/projects/:id/slides/:slideId/spec', authRequired, updateSlide);
router.patch('/projects/:id/slides/:slideId', authRequired, updateSlide);
router.post('/projects/:id/slides/:slideId/regenerate-image', authRequired, regenerateSlideImage);

export default router;
