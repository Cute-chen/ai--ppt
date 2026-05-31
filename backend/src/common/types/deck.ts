export type DeckSlide = {
  id: string;
  title: string;
  bullets: string[];
  speakerNotes: string;
  imagePrompt: string;
  imageAssetKey: string;
  order: number;
};

export type DeckSpec = {
  deckTitle: string;
  audience: string;
  tone: string;
  slides: DeckSlide[];
};

export type DeckSlideDTO = DeckSlide;
export type DeckDTO = DeckSpec;
