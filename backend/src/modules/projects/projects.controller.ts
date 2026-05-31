import { Request, Response } from 'express';
import { created, ok } from '../../common/http/response';
import { AppError } from '../../common/errors/app-error';
import { storageService } from '../../config/storage';
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

export const patchProjectName = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const { name } = req.body as { name?: unknown };

  if (typeof name !== 'string') {
    throw new AppError('name must be a string', 400);
  }

  const data = await projectService.renameProject(userId, projectId, name);
  ok(res, data, 'project name updated');
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');

  const result = await projectService.deleteProject(userId, projectId);
  const allObjectKeys = [...result.sourceObjectKeys, ...result.exportFileKeys, ...result.slideImageKeys];
  await Promise.all(allObjectKeys.map((objectKey) => storageService.deleteObjectIfExists(objectKey)));

  ok(res, { id: projectId, deleted: true }, 'project removed');
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

export const reanalyzeProjectAnalysisSummary = async (req: Request, res: Response): Promise<void> => {
  const userId = req.userId!;
  const projectId = String(req.params.id || '');
  const data = await projectService.reanalyzeProjectAnalysisSummary(userId, projectId);
  ok(res, data, 'analysis summary reanalyzed');
};
