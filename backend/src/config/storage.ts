import fs from 'fs';
import path from 'path';
import { env } from './env';

type PresignInput = {
  filename: string;
  contentType: string;
};

type PresignOutput = {
  objectKey: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresIn: number;
};

const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeObjectKey = (value: string): string => {
  return value
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((segment) => segment && segment !== '.')
    .map((segment) => segment.replace(/\.\./g, '_'))
    .join('/');
};

const sanitizeFilename = (value: string): string => {
  const base = path.basename(value || '').trim();
  if (!base) return 'file.bin';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'file.bin';
};

const encodeObjectKeyToPath = (objectKey: string): string => {
  return objectKey
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
};

export class StorageService {
  public async createPresignedUpload(input: PresignInput): Promise<PresignOutput> {
    const stamp = Date.now();
    const safeName = sanitizeFilename(input.filename);
    const objectKey = sanitizeObjectKey(`uploads/${stamp}-${safeName}`);
    const encodedObjectKey = encodeObjectKeyToPath(objectKey);

    // 本地直传模式：前端 PUT 二进制内容到后端直传接口。
    return {
      objectKey,
      uploadUrl: `/api/uploads/direct/${encodedObjectKey}`,
      method: 'PUT',
      headers: {
        'Content-Type': input.contentType || 'application/octet-stream'
      },
      expiresIn: 900
    };
  }

  public createDownloadUrl(fileKey: string): string {
    return `${env.storage.endpoint || 'https://example-storage.local'}/${fileKey}`;
  }

  public getLocalAbsolutePath(objectKey: string): string {
    const normalized = sanitizeObjectKey(objectKey);
    return path.join(env.storage.localRootDir, normalized);
  }

  public ensureLocalParentDir(objectKey: string): void {
    const absPath = this.getLocalAbsolutePath(objectKey);
    ensureDir(path.dirname(absPath));
  }

  public async readObjectAsBuffer(objectKey: string): Promise<Buffer> {
    const absPath = this.getLocalAbsolutePath(objectKey);
    return fs.promises.readFile(absPath);
  }

  public async writeObjectBuffer(objectKey: string, content: Buffer): Promise<void> {
    this.ensureLocalParentDir(objectKey);
    const absPath = this.getLocalAbsolutePath(objectKey);
    await fs.promises.writeFile(absPath, content);
  }

  public async writeObjectText(objectKey: string, content: string): Promise<void> {
    this.ensureLocalParentDir(objectKey);
    const absPath = this.getLocalAbsolutePath(objectKey);
    await fs.promises.writeFile(absPath, content, 'utf8');
  }

  public async deleteObjectIfExists(objectKey: string): Promise<void> {
    const absPath = this.getLocalAbsolutePath(objectKey);
    await fs.promises.unlink(absPath).catch(() => undefined);
  }
}

export const storageService = new StorageService();
