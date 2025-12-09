export type Gender = 'male' | 'female';

export interface PhotoStyle {
  id: number;
  name: string;
  category: string;
  promptSuffix: string; // English translation or description for better prompting
}

export interface GeneratedImage {
  styleId: number;
  imageUrl: string | null;
  status: 'idle' | 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface AppState {
  gender: Gender;
  uploadedImage: string | null; // Base64
  queue: number[]; // Array of Style IDs waiting to be processed
  activeRequests: number;
}