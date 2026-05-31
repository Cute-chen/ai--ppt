import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { AppError } from '../../common/errors/app-error';
import { jobService } from '../../services/job.service';
import { projectService } from '../../services/project.service';

export const generateDeck = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const { pageCount, styleId } = req.body as { pageCount?: number; styleId?: string };

  const planJob = await jobService.enqueueJob(userId, 'deck-plan', {
    userId,
    projectId,
    pageCount: pageCount || 10
  });

  const job = await jobService.enqueueJob(userId, 'deck-generate', {
    userId,
    projectId,
    pageCount: pageCount || 10,
    styleId: styleId || 'clean-tech-blue'
  });

  created(
    res,
    {
      planJob,
      job
    },
    'deck generation started'
  );
};

export const getDeck = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const project = await projectService.getProject(userId, projectId);
  ok(res, project.deckSpec || null);
};

export const updateSlide = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const id = String(req.params.id || '');
  const slideId = String(req.params.slideId || '');
  const data = await projectService.updateSlide(userId, id, slideId, req.body || {});
  ok(res, data, 'slide updated');
};

export const regenerateSlideImage = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const slideId = String(req.params.slideId || '');
  const { instruction } = req.body as { instruction?: string };

  const project = await projectService.getProject(userId, projectId);
  const slide = project.deckSpec?.slides.find((it) => it.id === slideId);
  if (!slide) {
    throw new AppError('slide not found', 404);
  }
  if (!slide.imageAssetKey) {
    throw new AppError('slide image not generated yet', 400);
  }

  const deckGenerateJob = await jobService.findLatestJob(userId, projectId, 'deck-generate');
  const deckGenerateJobId = deckGenerateJob?.id || '';

  const job = await jobService.enqueueJob(userId, 'slide-regenerate', {
    userId,
    projectId,
    slideId,
    slideOrder: slide.order,
    parentJobId: deckGenerateJobId,
    instruction: instruction || ''
  });

  created(res, { job }, 'slide image regenerate queued');
};
