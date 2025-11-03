
export interface StoryFormData {
  title: string;
  genre: string;
  tone: string;
  characters: string;
  setting: string;
  plot: string;
  numPages: number;
  audience: string;
  style: string;
  author: string;
  extra: string;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  imagePrompt: string;
  imageUrl: string;
  isGeneratingImage: boolean;
  mimeType?: string;
}

export interface StoryCover {
  title: string;
  author: string;
  imagePrompt: string;
  imageUrl: string;
  isGeneratingImage: boolean;
  mimeType?: string;
}

export interface Storybook {
  cover: StoryCover;
  pages: StoryPage[];
}

export interface ImageForEditing {
    type: 'cover' | 'page';
    index: number; // page index, 0 for cover
    imageUrl: string;
    mimeType: string;
}
