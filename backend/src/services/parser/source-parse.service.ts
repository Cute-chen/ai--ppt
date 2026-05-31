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

    const summary =
      chunks.length === 0
        ? '未解析到有效文本内容'
        : `已解析 ${chunks.length} 个文本分块，约 ${chunks.reduce((acc, it) => acc + it.tokenEstimate, 0)} tokens`;

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
