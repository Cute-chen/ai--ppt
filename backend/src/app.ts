import cors from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import { errorMiddleware, notFoundMiddleware } from './common/http/error-middleware';
import { ok } from './common/http/response';
import router from './modules';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  '/api/model-img',
  express.static(path.join(process.cwd(), 'model-img'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    }
  })
);

app.get('/', (_req: Request, res: Response) => {
  ok(
    res,
    {
      service: 'ai-ppt-backend',
      status: 'running'
    },
    'service ok'
  );
});

app.get('/health', (_req: Request, res: Response) => {
  ok(res, { ok: true, timestamp: new Date().toISOString() });
});

app.use('/api', router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
