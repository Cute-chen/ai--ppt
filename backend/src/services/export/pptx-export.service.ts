import PptxGenJS from 'pptxgenjs';
import { DeckSpec } from '../../common/types/deck';

type ExportPayload = {
  deckSpec: DeckSpec;
  imageResolver?: (imageAssetKey: string) => Promise<string | undefined>;
};

export class PptxExportService {
  public async renderPptxBuffer(payload: ExportPayload): Promise<Buffer> {
    const pptx = new PptxGenJS();
    pptx.defineLayout({
      name: 'LAYOUT_WIDE_CUSTOM',
      width: 13.333,
      height: 7.5
    });
    pptx.layout = 'LAYOUT_WIDE_CUSTOM';
    pptx.author = 'AI PPT Backend';
    pptx.subject = payload.deckSpec.deckTitle;
    pptx.title = payload.deckSpec.deckTitle;

    for (const slideData of payload.deckSpec.slides.sort((a, b) => a.order - b.order)) {
      const slide = pptx.addSlide();

      const imageData = payload.imageResolver
        ? await payload.imageResolver(slideData.imageAssetKey)
        : undefined;

      if (imageData) {
        slide.addImage({
          data: imageData,
          x: 0,
          y: 0,
          w: 13.333,
          h: 7.5
        });
      }

      // 半透明遮罩，增强文字可读性
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { color: '000000', transparency: imageData ? 45 : 100 },
        line: { color: '000000', transparency: 100 }
      });

      slide.addText(slideData.title, {
        x: 0.7,
        y: 0.4,
        w: 12,
        h: 0.8,
        fontFace: 'Calibri',
        fontSize: 30,
        bold: true,
        color: 'FFFFFF'
      });

      const bulletText = slideData.bullets.map((b) => `• ${b}`).join('\n');
      slide.addText(bulletText, {
        x: 0.9,
        y: 1.4,
        w: 6.4,
        h: 4.8,
        fontFace: 'Calibri',
        fontSize: 19,
        color: 'FFFFFF',
        valign: 'top'
      });

      slide.addNotes(`Speaker Notes:\n${slideData.speakerNotes || ''}`);
    }

    const arrayBuffer = (await pptx.write({ outputType: 'arraybuffer' })) as ArrayBuffer;
    return Buffer.from(arrayBuffer);
  }
}

export const pptxExportService = new PptxExportService();
