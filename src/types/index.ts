// Settings Types
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
  | 'AI_REQUEST';

export interface ChromeMessage {
  type: MessageType;
  payload?: unknown;
}
