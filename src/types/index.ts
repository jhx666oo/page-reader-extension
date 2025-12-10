// Settings Types
export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  // Video API settings (Together AI)
  videoApiKey: string;
  videoBaseUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.poe.com/v1',
  model: 'GPT-5.1',
  // Together AI for video generation
  videoApiKey: '',
  videoBaseUrl: 'https://api.together.xyz/v1',
};

// AI Config for request
export interface AIConfig {
  systemPrompt: string;
  outputLanguage: string;
  outputFormat: string;
  enableWebSearch: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  systemPrompt: '',
  outputLanguage: 'auto',
  outputFormat: 'markdown',
  enableWebSearch: false,
  reasoningEffort: 'medium',
};

// Video Generation Types (Together AI Models)
// Reference: https://docs.together.ai/docs/videos-overview
export type VideoModel = 
  | 'google/veo-3.0-audio'
  | 'google/veo-3.0' 
  | 'google/veo-3.0-fast-audio'
  | 'google/veo-3.0-fast'
  | 'google/veo-2.0'
  | 'openai/sora-2'
  | 'openai/sora-2-pro'
  | 'minimax/hailuo-02'
  | 'minimax/video-01-director'
  | 'kwaivgI/kling-2.1-master'
  | 'kwaivgI/kling-2.0-master'
  | 'vidu/vidu-2.0'
  | 'ByteDance/Seedance-1.0-pro'
  | 'pixverse/pixverse-v5'
  | 'Wan-AI/Wan2.2-T2V-A14B';

export interface VideoModelConfig {
  name: VideoModel;
  displayName: string;
  maxDuration: number;
  minDuration: number;
  durationStep: number;
  defaultWidth: number;
  defaultHeight: number;
  supportsImageReference: boolean;
  supportsSoundGeneration: boolean;
  description: string;
  provider: string;
}

export const VIDEO_MODELS: VideoModelConfig[] = [
  // Google Veo 3.0 Series
  {
    name: 'google/veo-3.0-audio',
    displayName: 'Google Veo 3.0 + Audio',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: true,
    description: 'Google\'s best video model with native audio',
    provider: 'Google',
  },
  {
    name: 'google/veo-3.0',
    displayName: 'Google Veo 3.0',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Google\'s flagship video generation model',
    provider: 'Google',
  },
  {
    name: 'google/veo-3.0-fast-audio',
    displayName: 'Google Veo 3.0 Fast + Audio',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: true,
    description: 'Faster Veo 3.0 with audio',
    provider: 'Google',
  },
  {
    name: 'google/veo-2.0',
    displayName: 'Google Veo 2.0',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Google Veo 2.0 video model',
    provider: 'Google',
  },
  // OpenAI Sora
  {
    name: 'openai/sora-2',
    displayName: 'OpenAI Sora 2',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'OpenAI\'s advanced Sora 2 video model',
    provider: 'OpenAI',
  },
  {
    name: 'openai/sora-2-pro',
    displayName: 'OpenAI Sora 2 Pro',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'OpenAI\'s premium Sora 2 model',
    provider: 'OpenAI',
  },
  // MiniMax
  {
    name: 'minimax/hailuo-02',
    displayName: 'MiniMax Hailuo 02',
    maxDuration: 10,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1366,
    defaultHeight: 768,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'MiniMax Hailuo 02 - up to 10s video',
    provider: 'MiniMax',
  },
  {
    name: 'minimax/video-01-director',
    displayName: 'MiniMax Director',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1366,
    defaultHeight: 768,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'MiniMax Video Director model',
    provider: 'MiniMax',
  },
  // Kuaishou Kling
  {
    name: 'kwaivgI/kling-2.1-master',
    displayName: 'Kling 2.1 Master',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Kuaishou\'s Kling 2.1 Master',
    provider: 'Kuaishou',
  },
  {
    name: 'kwaivgI/kling-2.0-master',
    displayName: 'Kling 2.0 Master',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Kuaishou\'s Kling 2.0 Master',
    provider: 'Kuaishou',
  },
  // Vidu
  {
    name: 'vidu/vidu-2.0',
    displayName: 'Vidu 2.0',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Vidu 2.0 video generation',
    provider: 'Vidu',
  },
  // ByteDance Seedance
  {
    name: 'ByteDance/Seedance-1.0-pro',
    displayName: 'ByteDance Seedance Pro',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1248,
    defaultHeight: 704,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'ByteDance Seedance 1.0 Pro',
    provider: 'ByteDance',
  },
  // PixVerse
  {
    name: 'pixverse/pixverse-v5',
    displayName: 'PixVerse V5',
    maxDuration: 5,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'PixVerse V5 video model',
    provider: 'PixVerse',
  },
  // Wan-AI
  {
    name: 'Wan-AI/Wan2.2-T2V-A14B',
    displayName: 'Wan 2.2 Text-to-Video',
    maxDuration: 8,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: false,
    supportsSoundGeneration: false,
    description: 'Wan-AI Text-to-Video model',
    provider: 'Wan-AI',
  },
];

export interface VideoConfig {
  model: VideoModel;
  duration: number;
  width: number;
  height: number;
  useImageReference: boolean;
  referenceImageUrl: string;
  enableSound: boolean;
  brandName: string;
  brandUrl: string;
  targetLanguage: 'zh-CN' | 'en' | 'ja' | 'ko';
  videoStyle: 'product-demo' | 'lifestyle' | 'cinematic' | 'minimal';
  systemPrompt: string;
}

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  model: 'google/veo-3.0-audio',
  duration: 5,
  width: 1280,
  height: 720,
  useImageReference: false,
  referenceImageUrl: '',
  enableSound: true,
  brandName: 'XOOBAY',
  brandUrl: 'https://www.xoobay.com/',
  targetLanguage: 'zh-CN',
  videoStyle: 'product-demo',
  systemPrompt: '',
};

// Available Models - Latest 2025 Models from Leaderboard
// Reference: https://artificialanalysis.ai/leaderboards/models
export const AVAILABLE_MODELS = [
  // Top Tier Models
  'Gemini-3-Pro-Preview',
  'Claude-Opus-4.5',
  'GPT-5.1',
  'GPT-5',
  'Kimi-K2-Thinking',
  'GPT-5.1-Codex',
  'DeepSeek-V3.2',
  'o3',
  'Grok-4',
  
  // High Performance Models
  'GPT-5-mini',
  'Grok-4.1-Fast',
  'KAT-Coder-Pro-V1',
  'Claude-4.5-Sonnet',
  'Nova-2.0-Pro-Preview',
  'GPT-5.1-Codex-mini',
  'MiniMax-M2',
  'gpt-oss-120B',
  'Grok-4-Fast',
  
  // Gemini Series
  'Gemini-2.5-Pro',
  'Gemini-2.5-Flash',
  'Gemini-2.0-Flash',
  
  // DeepSeek Series
  'DeepSeek-V3.2-Speciale',
  'DeepSeek-V3.1-Terminus',
  'DeepSeek-R1',
  
  // Amazon Nova Series
  'Nova-2.0-Lite',
  'Nova-2.0-Omni',
  
  // Qwen Series
  'Qwen3-235B-A22B-2507',
  'Qwen-2.5-Max',
  
  // Other Models
  'Doubao-Seed-Code',
  'Grok-3-mini-Reasoning',
  'GLM-4.6',
  
  // Claude Series
  'Claude-3.7-Sonnet',
  'Claude-3.5-Sonnet',
  'Claude-3.5-Haiku',
  
  // Mistral Series
  'Mistral-Large-2',
  'Codestral',
];

// Page Content Types
export interface PageContent {
  url: string;
  title: string;
  text: string;
  html: string;
  selectedText: string | null;
  images: ImageInfo[];
  links: LinkInfo[];
  metadata: PageMetadata;
}

export interface ImageInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface LinkInfo {
  href: string;
  text: string;
}

export interface PageMetadata {
  description: string | null;
  keywords: string | null;
  author: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
}

// Format Template
export interface FormatTemplate {
  type: 'json' | 'xml' | 'custom';
  content: string;
}

// Message Types
export type MessageType = 
  | 'GET_PAGE_CONTENT'
  | 'GET_SELECTED_TEXT'
  | 'GET_SETTINGS'
  | 'SAVE_SETTINGS'
  | 'AI_REQUEST'
  | 'VIDEO_REQUEST';

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}

// Video Generation Result
// Together AI job statuses: queued, in_progress, completed, failed, cancelled
export interface VideoGenerationResult {
  type: 'video' | 'text' | 'pending';
  status: 'pending' | 'queued' | 'in_progress' | 'processing' | 'completed' | 'failed' | 'cancelled';
  content: string;        // For text: the text content; For video: the video URL
  videoUrl?: string;      // Direct video URL if available
  thumbnailUrl?: string;  // Video thumbnail if available
  duration?: number;      // Video duration in seconds
  prompt?: string;        // The generated prompt that was used
  taskId?: string;        // Together AI task ID for polling
  progress?: number;      // Progress percentage (0-100)
  error?: string;         // Error message if failed
}
