import { DeckSpec } from '../common/types/deck';
import { newId } from '../common/utils/id';

const normalizePageCount = (value: unknown): number => {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num) || num <= 0) return 10;
  return Math.min(30, Math.max(1, Math.floor(num)));
};

export class DeckService {
  public buildDraftDeck(input: {
    projectName: string;
    projectBrief: string;
    requestedPageCount?: number;
  }): DeckSpec {
    const pageCount = normalizePageCount(input.requestedPageCount);

    const slides = Array.from({ length: pageCount }).map((_, idx) => {
      const order = idx + 1;
      return {
        id: newId(),
        title: `第${order}页：${input.projectName} 关键点`,
        bullets: [
          `${input.projectName} 的核心观点 ${order}`,
          `基于素材总结的重点信息 ${order}`,
          '可在 Studio 中继续精修文案'
        ],
        speakerNotes: input.projectBrief || '待补充讲稿备注',
        imagePrompt: `${input.projectName} presentation slide ${order}, clean layout, 16:9, 1920x1080`,
        imageAssetKey: `slides/draft-${order}.png`,
        order
      };
    });

    return {
      deckTitle: input.projectName,
      audience: '通用受众',
      tone: '专业清晰',
      slides
    };
  }
}

export const deckService = new DeckService();
