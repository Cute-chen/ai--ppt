import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { exportService } from '../../services/export.service';
import { jobService } from '../../services/job.service';
import { projectService } from '../../services/project.service';

export const exportPptx = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');

  await projectService.getProject(userId, projectId);

  const job = await jobService.enqueueJob(userId, 'deck-export', {
    userId,
    projectId,
    format: 'pptx'
  });

  created(
    res,
    {
      job
    },
    'export started'
  );
};

export const exportPdf = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');

  await projectService.getProject(userId, projectId);

  const job = await jobService.enqueueJob(userId, 'deck-export', {
    userId,
    projectId,
    format: 'pdf'
  });

  created(
    res,
    {
      job
    },
    'export started'
  );
};

export const listProjectExports = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');

  await projectService.getProject(userId, projectId);

  const data = await exportService.listExports(userId, projectId);
  ok(res, data);
};
