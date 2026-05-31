import { Router } from 'express';
import { getStylePreview, listStyles } from './styles.controller';

const router = Router();

router.get('/styles/preview/:id', getStylePreview);
router.get('/styles', listStyles);

export default router;
