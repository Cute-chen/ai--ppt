import fs from 'fs';
import path from 'path';
import { StyleRecord } from '../common/types/style';
import { AppError } from '../common/errors/app-error';
import { env } from '../config/env';

const FALLBACK_PREVIEW_STYLE_IDS = new Set([
  'clean-tech-blue',
  'dark-aurora',
  'editorial-mono',
  'gradient-glass',
  'hand-sketch',
  'japanese-wabi',
  'risograph',
  'swiss-grid',
  'vector-illustration',
  'y2k-chrome'
]);

const STYLE_ID_SAFE_RE = /^[a-z0-9-]+$/;

type StyleCategory = StyleRecord['category'];

const readSection = (content: string, heading: string): string => {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^##\\s+${escapedHeading}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'm');
  const match = content.match(regex);
  if (!match) return '';
  return match[1].trim();
};

const normalizeTextBlock = (value: string): string => {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
};

const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

const classifyStyle = (id: string, text: string): StyleCategory => {
  const corpus = `${id} ${text}`.toLowerCase();
  if (
    /(health|medical|clinical|mindfulness|呼吸|医疗|健康|公共健康|病例|phd)/.test(corpus)
  ) {
    return 'health';
  }
  if (
    /(education|school|classroom|workshop|thesis|training|校园|课堂|教学|教育|答辩|工作坊)/.test(
      corpus
    )
  ) {
    return 'education';
  }
  if (
    /(creative|art|fashion|illustration|wabi|flowery|agency|艺术|创意|时尚|插画|文化)/.test(corpus)
  ) {
    return 'creative';
  }
  if (
    /(business|agenda|investment|company|consulting|corporate|商业|商务|企业|咨询|会议|路演|战略)/.test(
      corpus
    )
  ) {
    return 'business';
  }
  if (/(tech|data|science|aurora|glass|ai|saas|科技|技术|数据)/.test(corpus)) {
    return 'tech';
  }
  return 'general';
};

const extractTags = (id: string, name: string, scene: string, description: string): string[] => {
  const tags: string[] = [];
  const source = `${id} ${name} ${scene} ${description}`;

  const mapping: Array<{ re: RegExp; tag: string }> = [
    { re: /(tech|科技|技术|saas|ai)/i, tag: 'tech' },
    { re: /(business|商务|商业|路演|战略|咨询|投资|会议)/i, tag: 'business' },
    { re: /(creative|创意|艺术|插画|时尚|品牌)/i, tag: 'creative' },
    { re: /(education|教育|课堂|培训|答辩|工作坊)/i, tag: 'education' },
    { re: /(health|医疗|健康|临床)/i, tag: 'health' },
    { re: /(dark|深色|霓虹)/i, tag: 'dark' },
    { re: /(minimal|极简|grid|网格)/i, tag: 'minimal' }
  ];

  for (const item of mapping) {
    if (item.re.test(source)) {
      tags.push(item.tag);
    }
  }

  return unique(tags);
};

const hasCustomPreviewImage = async (previewDir: string, styleId: string): Promise<boolean> => {
  const candidate = path.join(previewDir, `${styleId}.jpg`);
  try {
    await fs.promises.access(candidate, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

export class StylesService {
  private readonly stylesDir = path.join(env.skill.rootDir, 'styles');
  private readonly previewDir = path.join(env.skill.rootDir, 'docs', 'assets', 'distilled-styles');
  private readonly fallbackPreviewUrl = '/api/styles/preview/_default';

  public async listStyles(): Promise<StyleRecord[]> {
    if (!fs.existsSync(this.stylesDir)) {
      throw new AppError(`styles dir not found: ${this.stylesDir}`, 500);
    }

    const entries = await fs.promises.readdir(this.stylesDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const records: StyleRecord[] = [];

    for (const file of files) {
      const id = file.replace(/\.md$/i, '');
      const absPath = path.join(this.stylesDir, file);
      const content = await fs.promises.readFile(absPath, 'utf8');

      const name = normalizeTextBlock(readSection(content, '风格名称')) || id;
      const description = normalizeTextBlock(readSection(content, '风格描述')) || '';
      const scene = normalizeTextBlock(readSection(content, '适用场景')) || '通用演示场景';
      const tags = extractTags(id, name, scene, description);
      const category = classifyStyle(id, `${name} ${description} ${scene}`);

      const hasCustomPreview = await hasCustomPreviewImage(this.previewDir, id);
      const hasPreview = hasCustomPreview || FALLBACK_PREVIEW_STYLE_IDS.has(id);
      const previewUrl = hasCustomPreview
        ? `/api/styles/preview/${id}`
        : hasPreview
          ? this.fallbackPreviewUrl
          : '';

      records.push({
        id,
        name,
        description,
        scene,
        tags,
        category,
        previewUrl,
        hasPreview,
        filePath: absPath
      });
    }

    return records;
  }

  public resolveStylePath(styleId: string): string {
    if (!styleId) {
      throw new AppError('styleId is required', 400);
    }

    const stylePath = path.join(env.skill.rootDir, 'styles', `${styleId}.md`);
    if (!fs.existsSync(stylePath)) {
      throw new AppError(`style not found: ${styleId}`, 404);
    }

    return stylePath;
  }

  public resolvePreviewPath(styleId: string): string {
    const fallback = path.join(env.skill.rootDir, 'docs', 'assets', 'style-gallery.jpg');
    const resolveFallback = (): string => {
      if (!fs.existsSync(fallback)) {
        throw new AppError('default style preview not found', 404);
      }
      return fallback;
    };

    if (styleId === '_default') return resolveFallback();

    if (!STYLE_ID_SAFE_RE.test(styleId)) {
      throw new AppError('invalid styleId', 400);
    }

    const filePath = path.join(this.previewDir, `${styleId}.jpg`);
    if (fs.existsSync(filePath)) {
      return filePath;
    }

    const styleMd = path.join(this.stylesDir, `${styleId}.md`);
    if (!fs.existsSync(styleMd)) {
      throw new AppError(`style not found: ${styleId}`, 404);
    }

    return resolveFallback();
  }
}

export const stylesService = new StylesService();
