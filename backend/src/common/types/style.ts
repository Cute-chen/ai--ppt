export type StyleRecord = {
  id: string;
  name: string;
  description: string;
  scene: string;
  tags: string[];
  category: 'tech' | 'business' | 'creative' | 'education' | 'health' | 'general';
  previewUrl: string;
  hasPreview: boolean;
  filePath: string;
};

export type StyleDTO = StyleRecord;
