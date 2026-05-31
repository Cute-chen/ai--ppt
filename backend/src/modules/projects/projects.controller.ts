import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { AppError } from '../../common/errors/app-error';
import { projectService } from '../../services/project.service';

export const listProjects = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const data = await projectService.listProjects(userId);
  ok(res, data);
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const { name } = req.body as { name?: string };
  const data = await projectService.createProject(userId, name || '');
  created(res, data, 'project created');
};

export const getProjectDetail = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.getProject(userId, projectId);
  ok(res, data);
};

export const patchProjectCustomStyle = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const body = req.body as { customStyle?: unknown };

  if (body.customStyle !== undefined && typeof body.customStyle !== 'string') {
    throw new AppError('customStyle must be a string', 400);
  }

  const data = await projectService.updateProjectCustomStyle(
    userId,
    projectId,
    String(body.customStyle || '')
  );
  ok(res, data, 'custom style updated');
};

export const getProjectAnalysisSummary = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.getProjectAnalysisSummary(userId, projectId);
  ok(res, data);
};
