import { PDFParse } from 'pdf-parse';
import mammoth = require('mammoth');

const splitToChunks = (text: string, chunkSize = 1500): string[] => {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(normalized.length, cursor + chunkSize);
    chunks.push(normalized.slice(cursor, end));
    cursor = end;
  }

  return chunks;
};

const estimateTokens = (text: string): number => {
  return Math.max(1, Math.ceil(text.length / 4));
};

const normalizeSpaces = (text: string): string => {
  return text.replace(/\u00A0/g, ' ').replace(/[ \t]+/g, ' ').trim();
};

const stripMarkdownAndMeta = (text: string): string => {
  return text
    .replace(/^---[\r\n]+[\s\S]*?[\r\n]+---[\r\n]*/m, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+[.)、]\s+/gm, '')
    .replace(/\[(cover|content|data)\]\s*/gi, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^\s*(title|date|author|tags|description)\s*:\s*.*$/gim, '')
    .replace(/^\s*\|.*\|\s*$/gm, '')
    .replace(/^\s*[-:| ]{3,}\s*$/gm, '');
};

const isLikelyMetaLine = (line: string): boolean => {
  if (!line) return true;
  if (/^(小组|成员|汇报人|日期|来源)[:：]/.test(line)) return true;
  if (/^[\W_]+$/.test(line)) return true;
  return false;
};

const scoreSentence = (sentence: string): number => {
  let score = 0;
  if (/[。！？.!?]/.test(sentence)) score += 3;
  if (sentence.length >= 16) score += 2;
  if (/^(为什么|本项目|系统|该架构|通过|旨在|核心|关键|用于)/.test(sentence)) score += 2;
  if (/工作流|智能体|路由|分支|意图|用户画像|语音交互|模块化/.test(sentence)) score += 2;
  if (/^[A-Za-z0-9 _-]+$/.test(sentence)) score -= 3;
  return score;
};

const splitToSentences = (text: string): string[] => {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => normalizeSpaces(line))
    .filter((line) => line && !isLikelyMetaLine(line));

  const parts: string[] = [];
  for (const line of lines) {
    const sentences = line
      .split(/(?<=[。！？.!?；;])/)
      .map((item) => normalizeSpaces(item))
      .filter(Boolean);
    if (sentences.length > 0) {
      parts.push(...sentences);
    } else {
      parts.push(line);
    }
  }

  return parts;
};

const buildReadableSummary = (text: string, filename: string): string => {
  const normalized = stripMarkdownAndMeta(text).replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '未解析到有效文本内容。';
  }

  const sentences = splitToSentences(normalized).filter((line) => line.length >= 8);
  if (sentences.length === 0) {
    return normalizeSpaces(normalized.slice(0, 220));
  }

  const ranked = sentences
    .map((line, idx) => ({ line, idx, score: scoreSentence(line) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .slice(0, 3)
    .sort((a, b) => a.idx - b.idx)
    .map((item) => item.line.replace(/[。！？.!?；;]+$/, ''));

  const picked = ranked.length ? ranked : sentences.slice(0, 3);
  const merged = normalizeSpaces(picked.join('。'));
  const clipped = merged.length > 320 ? `${merged.slice(0, 320)}...` : merged;

  if (!clipped) {
    return `已完成对《${filename}》的文本解析。`;
  }

  return clipped.endsWith('。') ? clipped : `${clipped}。`;
};

export class SourceParseService {
  public async parseBuffer(input: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<{ summary: string; chunks: Array<{ content: string; tokenEstimate: number }> }> {
    const text = await this.extractText(input.filename, input.mimeType, input.buffer);
    const chunks = splitToChunks(text).map((content) => ({
      content,
      tokenEstimate: estimateTokens(content)
    }));

    const summary = buildReadableSummary(text, input.filename);

    return {
      summary,
      chunks
    };
  }

  private async extractText(filename: string, mimeType: string, buffer: Buffer): Promise<string> {
    const lowerName = filename.toLowerCase();

    if (mimeType.includes('pdf') || lowerName.endsWith('.pdf')) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text || '';
    }

    if (mimeType.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    }

    if (
      mimeType.startsWith('text/') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.csv')
    ) {
      return buffer.toString('utf8');
    }

    // 其他格式暂时走二进制兼容提示。
    return `文件 ${filename}（${mimeType}）当前版本暂未支持深度解析，可先转为 PDF/DOCX/TXT 后上传。`;
  }
}

export const sourceParseService = new SourceParseService();
