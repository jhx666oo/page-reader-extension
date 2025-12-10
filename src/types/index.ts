// Settings Types
// POE uses unified API for all models including video
// Reference: https://creator.poe.com/docs/poe-api-overview
export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  baseUrl: 'https://api.poe.com/v1',
  model: 'GPT-5.1',
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

// Video Generation Types
// POE uses unified chat/completions API for all models
// Video models are accessed like any other model through the same API
// Use "List available models" endpoint to find available video models
// Reference: https://creator.poe.com/docs/poe-api-overview
export type VideoModel = 
  // POE Video Models (check availability via List models API)
  | 'Sora'
  | 'Sora-Pro'
  | 'Veo-2'
  | 'Veo-3'
  | 'Runway-Gen3'
  | 'Kling-Video'
  | 'Kling-1.5'
  | 'Hailuo-Video'
  | 'Pika-Video'
  | 'Luma-Dream-Machine'
  // Custom video bot (user can create their own)
  | string;

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

// POE Video Models
// Note: Availability depends on POE platform - check with List available models API
// These are common video models that may be available on POE
export const VIDEO_MODELS: VideoModelConfig[] = [
  // OpenAI Sora
  {
    name: 'Sora',
    displayName: 'Sora',
    maxDuration: 20,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'OpenAI Sora video generation model',
    provider: 'OpenAI',
  },
  {
    name: 'Sora-Pro',
    displayName: 'Sora Pro',
    maxDuration: 60,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'OpenAI Sora Pro - longer videos',
    provider: 'OpenAI',
  },
  // Google Veo
  {
    name: 'Veo-2',
    displayName: 'Google Veo 2',
    maxDuration: 8,
    minDuration: 4,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Google Veo 2 video generation',
    provider: 'Google',
  },
  {
    name: 'Veo-3',
    displayName: 'Google Veo 3',
    maxDuration: 8,
    minDuration: 4,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: true,
    description: 'Google Veo 3 with audio support',
    provider: 'Google',
  },
  // Runway
  {
    name: 'Runway-Gen3',
    displayName: 'Runway Gen-3 Alpha',
    maxDuration: 10,
    minDuration: 4,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 768,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Runway Gen-3 Alpha video model',
    provider: 'Runway',
  },
  // Kuaishou Kling
  {
    name: 'Kling-Video',
    displayName: 'Kling Video',
    maxDuration: 10,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Kuaishou Kling video model',
    provider: 'Kuaishou',
  },
  {
    name: 'Kling-1.5',
    displayName: 'Kling 1.5',
    maxDuration: 10,
    minDuration: 5,
    durationStep: 1,
    defaultWidth: 1920,
    defaultHeight: 1080,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Kuaishou Kling 1.5 enhanced model',
    provider: 'Kuaishou',
  },
  // MiniMax Hailuo
  {
    name: 'Hailuo-Video',
    displayName: 'Hailuo Video',
    maxDuration: 6,
    minDuration: 4,
    durationStep: 1,
    defaultWidth: 1280,
    defaultHeight: 720,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'MiniMax Hailuo video model',
    provider: 'MiniMax',
  },
  // Pika Labs
  {
    name: 'Pika-Video',
    displayName: 'Pika Video',
    maxDuration: 4,
    minDuration: 3,
    durationStep: 1,
    defaultWidth: 1024,
    defaultHeight: 576,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Pika Labs video generation',
    provider: 'Pika',
  },
  // Luma AI
  {
    name: 'Luma-Dream-Machine',
    displayName: 'Luma Dream Machine',
    maxDuration: 5,
    minDuration: 4,
    durationStep: 1,
    defaultWidth: 1360,
    defaultHeight: 752,
    supportsImageReference: true,
    supportsSoundGeneration: false,
    description: 'Luma AI Dream Machine',
    provider: 'Luma',
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
  model: 'Sora',
  duration: 5,
  width: 1920,
  height: 1080,
  useImageReference: false,
  referenceImageUrl: '',
  enableSound: false,
  brandName: 'XOOBAY',
  brandUrl: 'https://www.xoobay.com/',
  targetLanguage: 'zh-CN',
  videoStyle: 'product-demo',
  systemPrompt: '',
};

// Available Models - Latest 2025 Models from POE
// Reference: https://poe.com (check available models)
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
// POE returns video URL in message.content (synchronous)
export interface VideoGenerationResult {
  type: 'video' | 'text' | 'pending';
  status: 'pending' | 'queued' | 'in_progress' | 'processing' | 'completed' | 'failed' | 'cancelled';
  content: string;        // For text: the text content; For video: the raw response
  videoUrl?: string;      // Direct video URL if available
  thumbnailUrl?: string;  // Video thumbnail if available
  duration?: number;      // Video duration in seconds
  prompt?: string;        // The generated prompt that was used
  taskId?: string;        // Task ID (if applicable)
  progress?: number;      // Progress percentage (0-100)
  error?: string;         // Error message if failed
}

// ============================================
// Session & Media Library Types
// ============================================

// Media item types in the library
export type MediaType = 'video' | 'text' | 'image';

// Individual media item in the library
export interface MediaItem {
  id: string;
  type: MediaType;
  createdAt: number;
  name: string;              // User-friendly name
  prompt?: string;           // The prompt used to generate this item
  content: string;           // For text: the content; For video/image: the URL
  videoUrl?: string;         // Video URL if type is 'video'
  thumbnailUrl?: string;     // Thumbnail URL for preview
  metadata: {
    model: string;           // Model used to generate
    duration?: number;       // Video duration in seconds
    width?: number;          // Video/image width
    height?: number;         // Video/image height
    style?: string;          // Video style
    language?: string;       // Target language
  };
}

// Session represents a workspace with its own page content and media library
export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageUrl?: string;          // Source page URL
  pageTitle?: string;        // Source page title
  pageContent?: PageContent; // Captured page content
  aiConfig: AIConfig;        // AI configuration for this session
  videoConfig: VideoConfig;  // Video configuration for this session
  mediaLibrary: MediaItem[]; // Generated media items
}

// Default session factory
export function createDefaultSession(name?: string): Session {
  const now = Date.now();
  return {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    name: name || `Session ${new Date(now).toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
    aiConfig: { ...DEFAULT_AI_CONFIG },
    videoConfig: { ...DEFAULT_VIDEO_CONFIG },
    mediaLibrary: [],
  };
}

// Session storage state
export interface SessionState {
  sessions: Session[];
  activeSessionId: string | null;
}
