import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { AppError } from '../../common/errors/app-error';

export class PdfExportService {
  public async imagesToPdfBuffer(imagePaths: string[]): Promise<Buffer> {
    if (!imagePaths.length) {
      throw new AppError('no images to export as pdf', 400);
    }

    for (const p of imagePaths) {
      if (!fs.existsSync(p)) {
        throw new AppError(`slide image not found: ${p}`, 400);
      }
    }

    const script = [
      'import json',
      'import sys',
      'from PIL import Image',
      'input_json = sys.argv[1]',
      'output_path = sys.argv[2]',
      'paths = json.loads(input_json)',
      'images = []',
      'for idx, p in enumerate(paths):',
      '  img = Image.open(p).convert("RGB")',
      '  images.append(img)',
      'if not images:',
      '  raise RuntimeError("no images")',
      'first = images[0]',
      'rest = images[1:]',
      'first.save(output_path, "PDF", resolution=150.0, save_all=True, append_images=rest)',
      'for img in images:',
      '  img.close()'
    ].join('\n');

    const tmpDir = path.join(process.cwd(), '.tmp-pdf');
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const outPath = path.join(tmpDir, `deck-${Date.now()}.pdf`);

    await new Promise<void>((resolve, reject) => {
      const child = spawn('python3', ['-c', script, JSON.stringify(imagePaths), outPath], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        reject(new AppError(`python process failed: ${error.message}`, 500));
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new AppError(`python pdf export failed: ${stderr.slice(-1200)}`, 500));
          return;
        }
        resolve();
      });
    });

    const buffer = await fs.promises.readFile(outPath);
    await fs.promises.unlink(outPath).catch(() => undefined);
    return buffer;
  }
}

export const pdfExportService = new PdfExportService();
