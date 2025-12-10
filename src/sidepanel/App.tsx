import React, { useState, useEffect, useMemo } from 'react';
import { usePageContent } from '@/hooks/usePageContent';
import { useSettings } from '@/hooks/useSettings';
import { useAI } from '@/hooks/useAI';
import { useSession } from '@/hooks/useSession';
import { PageContent, AVAILABLE_MODELS, ImageInfo, AIConfig, DEFAULT_AI_CONFIG, VideoConfig, DEFAULT_VIDEO_CONFIG, VIDEO_MODELS, VideoModel } from '@/types';
import { buildSystemPrompt, OUTPUT_LANGUAGES, OUTPUT_FORMATS, REASONING_LEVELS, buildVideoSystemPrompt, VIDEO_OUTPUT_LANGUAGES, VIDEO_STYLES } from '@/utils/templates';

type Step = 'read' | 'edit' | 'config' | 'result';
type ResultView = 'rendered' | 'raw';
type ConfigMode = 'text' | 'video';
type SidePanel = 'sessions' | 'media' | null;

export const App: React.FC = () => {
  const { getPageContent, loading: pageLoading, error: pageError } = usePageContent();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const { sendPrompt, sendVideoRequest, loading: aiLoading, error: aiError, result: aiResult, videoResult, videoPolling, clearResult, stopPolling } = useAI();
  
  // Session management
  const {
    sessions,
    activeSession,
    activeSessionId,
    isLoading: sessionLoading,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    mediaLibrary,
    addMediaItem,
    removeMediaItem,
    renameMediaItem,
    clearMediaLibrary,
    aiConfig: sessionAiConfig,
    updateAIConfig: updateSessionAIConfig,
    videoConfig: sessionVideoConfig,
    updateVideoConfig: updateSessionVideoConfig,
    updatePageContent: updateSessionPageContent,
  } = useSession();

  const [step, setStep] = useState<Step>('read');
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [resultView, setResultView] = useState<ResultView>('rendered');
  const [editTab, setEditTab] = useState<'text' | 'images'>('text');
  
  // Side panel state
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editingMediaName, setEditingMediaName] = useState('');
  
  // Config mode: text generation vs video generation
  const [configMode, setConfigMode] = useState<ConfigMode>('text');
  
  // AI Config State (for text generation) - synced with session
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    ...DEFAULT_AI_CONFIG,
    systemPrompt: buildSystemPrompt('auto', 'markdown', 'medium', false),
  });
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  
  // Video Config State - synced with session
  const [videoConfig, setVideoConfig] = useState<VideoConfig>(DEFAULT_VIDEO_CONFIG);
  
  // Sync local config with session config ONLY when session ID changes (not on every config update)
  useEffect(() => {
    if (activeSession && activeSessionId) {
      setAiConfig(sessionAiConfig);
      setVideoConfig(sessionVideoConfig);
      if (activeSession.pageContent) {
        setPageContent(activeSession.pageContent);
        setEditedContent(activeSession.pageContent.text);
      }
    }
    // Only depend on activeSessionId - not on config objects to avoid resetting editedContent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);
  
  // Update session config when local config changes (debounced to avoid loops)
  const configUpdateTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (activeSession && !sessionLoading) {
      // Debounce config updates to avoid too many writes
      if (configUpdateTimeoutRef.current) {
        clearTimeout(configUpdateTimeoutRef.current);
      }
      configUpdateTimeoutRef.current = setTimeout(() => {
        updateSessionAIConfig(aiConfig);
      }, 500);
    }
    return () => {
      if (configUpdateTimeoutRef.current) {
        clearTimeout(configUpdateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiConfig]);
  
  useEffect(() => {
    if (activeSession && !sessionLoading) {
      updateSessionVideoConfig(videoConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoConfig]);

  // Build final system prompt when config changes (for text mode)
  const finalSystemPrompt = useMemo(() => {
    return buildSystemPrompt(
      aiConfig.outputLanguage,
      aiConfig.outputFormat,
      aiConfig.reasoningEffort,
      aiConfig.enableWebSearch
    );
  }, [aiConfig.outputLanguage, aiConfig.outputFormat, aiConfig.reasoningEffort, aiConfig.enableWebSearch]);

  // Update aiConfig.systemPrompt when finalSystemPrompt changes
  useEffect(() => {
    setAiConfig(c => ({ ...c, systemPrompt: finalSystemPrompt }));
  }, [finalSystemPrompt]);
  
  // Get current video model config
  const currentVideoModel = useMemo(() => {
    return VIDEO_MODELS.find(m => m.name === videoConfig.model) || VIDEO_MODELS[0];
  }, [videoConfig.model]);
  
  // Calculate aspect ratio string from width/height
  const getAspectRatio = (w: number, h: number): string => {
    if (w === h) return '1:1';
    if (w > h) return `${Math.round(w/h * 9)}:9`;
    return `9:${Math.round(h/w * 9)}`;
  };
  
  // Build video system prompt when video config changes
  const finalVideoSystemPrompt = useMemo(() => {
    const aspectRatio = getAspectRatio(videoConfig.width, videoConfig.height);
    return buildVideoSystemPrompt({
      modelName: currentVideoModel.displayName,
      minDuration: currentVideoModel.minDuration,
      maxDuration: currentVideoModel.maxDuration,
      aspectRatio: aspectRatio,
      brandName: videoConfig.brandName,
      brandUrl: videoConfig.brandUrl,
      targetLanguage: videoConfig.targetLanguage,
      videoStyle: videoConfig.videoStyle,
      enableSound: videoConfig.enableSound && currentVideoModel.supportsSoundGeneration,
      useImageReference: videoConfig.useImageReference && currentVideoModel.supportsImageReference,
      referenceImageUrl: videoConfig.referenceImageUrl,
    });
  }, [videoConfig, currentVideoModel]);
  
  // Update videoConfig.systemPrompt when finalVideoSystemPrompt changes
  useEffect(() => {
    setVideoConfig(c => ({ ...c, systemPrompt: finalVideoSystemPrompt }));
  }, [finalVideoSystemPrompt]);
  
  // Update video config when model changes (reset to model defaults)
  const handleVideoModelChange = (modelName: VideoModel) => {
    const model = VIDEO_MODELS.find(m => m.name === modelName);
    if (model) {
      setVideoConfig(c => ({
        ...c,
        model: modelName,
        duration: Math.min(Math.max(c.duration, model.minDuration), model.maxDuration),
        width: model.defaultWidth,
        height: model.defaultHeight,
        enableSound: model.supportsSoundGeneration ? c.enableSound : false,
        useImageReference: model.supportsImageReference ? c.useImageReference : false,
      }));
    }
  };

  useEffect(() => {
    if (!settingsLoading && !settings.apiKey) {
      setShowSettings(true);
    }
  }, [settingsLoading, settings.apiKey]);

  const handleReadPage = async () => {
    const content = await getPageContent();
    if (content) {
      setPageContent(content);
      setEditedContent(content.text);
      setSelectedImages([]); // 默认不选择任何图片
      // Save page content to session
      updateSessionPageContent(content);
      setStep('edit');
    }
  };

  const handleToggleImage = (index: number) => {
    if (!pageContent) return;
    const img = pageContent.images[index];
    const isSelected = selectedImages.some(i => i.src === img.src);
    
    if (isSelected) {
      setSelectedImages(selectedImages.filter(i => i.src !== img.src));
    } else {
      setSelectedImages([...selectedImages, img]);
    }
  };

  const handleSelectAllImages = () => {
    if (!pageContent) return;
    setSelectedImages([...pageContent.images]);
  };

  const handleDeselectAllImages = () => {
    setSelectedImages([]);
  };

  const handleConfirmContent = () => {
    setStep('config');
  };

  const handleResetConfig = () => {
    if (configMode === 'text') {
      setAiConfig({
        ...DEFAULT_AI_CONFIG,
        outputLanguage: 'auto',
        outputFormat: 'markdown',
        reasoningEffort: 'medium',
        enableWebSearch: false,
        systemPrompt: buildSystemPrompt('auto', 'markdown', 'medium', false),
      });
    } else {
      setVideoConfig(DEFAULT_VIDEO_CONFIG);
    }
  };

  const handleSendToAI = async () => {
    // Build user content with images
    let userContent = editedContent;
    
    if (selectedImages.length > 0) {
      userContent += '\n\n---\n\n## Images on this page:\n\n';
      selectedImages.forEach((img, index) => {
        userContent += `${index + 1}. ![${img.alt || 'Image'}](${img.src})`;
        if (img.alt) userContent += ` - Alt: "${img.alt}"`;
        if (img.width && img.height) userContent += ` (${img.width}x${img.height})`;
        userContent += '\n';
      });
    }
    
    if (configMode === 'video') {
      // Use video generation
      const result = await sendVideoRequest(userContent, finalVideoSystemPrompt, videoConfig, settings);
      
      // Save to media library if successful (result is VideoGenerationResult directly)
      if (result && result.status === 'completed') {
        const mediaType = result.type === 'video' ? 'video' : 'text';
        addMediaItem({
          type: mediaType,
          name: `${mediaType === 'video' ? '🎬' : '📝'} ${new Date().toLocaleString()}`,
          prompt: result.prompt || userContent.substring(0, 100),
          content: result.content,
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          metadata: {
            model: videoConfig.model,
            duration: videoConfig.duration,
            width: videoConfig.width,
            height: videoConfig.height,
            style: videoConfig.videoStyle,
            language: videoConfig.targetLanguage,
          },
        });
      }
    } else {
      // Use text generation
      await sendPrompt(userContent, settings, aiConfig);
    }
    setStep('result');
  };
  
  // Save text result to media library
  const handleSaveTextToLibrary = () => {
    if (!aiResult) return;
    
    addMediaItem({
      type: 'text',
      name: `📝 ${pageContent?.title?.substring(0, 30) || 'Text'} - ${new Date().toLocaleString()}`,
      prompt: editedContent.substring(0, 200),
      content: aiResult,
      metadata: {
        model: settings.model,
        language: aiConfig.outputLanguage,
      },
    });
  };

  const handleReset = () => {
    setStep('read');
    setPageContent(null);
    setEditedContent('');
    setSelectedImages([]);
    clearResult();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    if (!aiResult) return;
    const ext = aiConfig.outputFormat === 'json' ? 'json' : aiConfig.outputFormat === 'html' ? 'html' : 'md';
    const blob = new Blob([aiResult], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page-reader-result-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Enhanced Markdown renderer
  const renderMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];
    let orderedListItems: string[] = [];
    let codeBlock: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let blockquoteLines: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className="list-disc list-inside space-y-1 my-3 text-dark-200 pl-2">
            {listItems.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}
          </ul>
        );
        listItems = [];
      }
    };

    const flushOrderedList = () => {
      if (orderedListItems.length > 0) {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-1 my-3 text-dark-200 pl-2">
            {orderedListItems.map((item, i) => <li key={i}>{renderInlineMarkdown(item)}</li>)}
          </ol>
        );
        orderedListItems = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlock.length > 0) {
        elements.push(
          <div key={elements.length} className="my-4 rounded-xl overflow-hidden border border-dark-700">
            {codeLanguage && (
              <div className="px-3 py-1.5 bg-dark-800 border-b border-dark-700 text-xs text-dark-400 font-mono">
                {codeLanguage}
              </div>
            )}
            <pre className="p-3 bg-dark-900 overflow-x-auto">
              <code className="text-sm text-emerald-400 font-mono">{codeBlock.join('\n')}</code>
            </pre>
          </div>
        );
        codeBlock = [];
        codeLanguage = '';
      }
    };

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        elements.push(
          <blockquote key={elements.length} className="my-4 pl-4 border-l-4 border-primary-500 bg-dark-800/30 py-2 pr-4 rounded-r-lg">
            {blockquoteLines.map((line, i) => (
              <p key={i} className="text-dark-300 italic">{renderInlineMarkdown(line)}</p>
            ))}
          </blockquote>
        );
        blockquoteLines = [];
      }
    };

    // Render inline markdown (bold, italic, code, links)
    const renderInlineMarkdown = (text: string): React.ReactNode => {
      const parts: React.ReactNode[] = [];
      let remaining = text;
      let key = 0;

      while (remaining.length > 0) {
        // Bold **text** or __text__
        const boldMatch = remaining.match(/^(.*?)(\*\*|__)(.+?)\2(.*)$/s);
        if (boldMatch) {
          if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
          parts.push(<strong key={key++} className="font-semibold text-white">{boldMatch[3]}</strong>);
          remaining = boldMatch[4];
          continue;
        }

        // Italic *text* or _text_
        const italicMatch = remaining.match(/^(.*?)(\*|_)([^*_]+)\2(.*)$/s);
        if (italicMatch) {
          if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
          parts.push(<em key={key++} className="italic text-dark-300">{italicMatch[3]}</em>);
          remaining = italicMatch[4];
          continue;
        }

        // Inline code `code`
        const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
        if (codeMatch) {
          if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
          parts.push(<code key={key++} className="px-1.5 py-0.5 bg-dark-800 text-amber-400 rounded text-sm font-mono">{codeMatch[2]}</code>);
          remaining = codeMatch[3];
          continue;
        }

        // Links [text](url)
        const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)$/s);
        if (linkMatch) {
          if (linkMatch[1]) parts.push(<span key={key++}>{linkMatch[1]}</span>);
          parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline">{linkMatch[2]}</a>);
          remaining = linkMatch[4];
          continue;
        }

        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Code block
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          flushCodeBlock();
        } else {
          flushList();
          flushOrderedList();
          flushBlockquote();
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlock.push(line);
        return;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        flushList();
        flushOrderedList();
        blockquoteLines.push(trimmed.slice(2));
        return;
      } else {
        flushBlockquote();
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        flushList();
        flushOrderedList();
        elements.push(<h1 key={index} className="text-2xl font-bold text-white mt-6 mb-3">{renderInlineMarkdown(trimmed.slice(2))}</h1>);
      } else if (trimmed.startsWith('## ')) {
        flushList();
        flushOrderedList();
        elements.push(<h2 key={index} className="text-xl font-semibold text-white mt-5 mb-2 border-b border-dark-700 pb-2">{renderInlineMarkdown(trimmed.slice(3))}</h2>);
      } else if (trimmed.startsWith('### ')) {
        flushList();
        flushOrderedList();
        elements.push(<h3 key={index} className="text-lg font-medium text-primary-300 mt-4 mb-2">{renderInlineMarkdown(trimmed.slice(4))}</h3>);
      } else if (trimmed.startsWith('#### ')) {
        flushList();
        flushOrderedList();
        elements.push(<h4 key={index} className="text-base font-medium text-primary-400 mt-3 mb-1">{renderInlineMarkdown(trimmed.slice(5))}</h4>);
      } else if (trimmed.startsWith('##### ')) {
        flushList();
        flushOrderedList();
        elements.push(<h5 key={index} className="text-sm font-medium text-dark-200 mt-2 mb-1">{renderInlineMarkdown(trimmed.slice(6))}</h5>);
      }
      // Horizontal rule
      else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        flushList();
        flushOrderedList();
        elements.push(<hr key={index} className="my-6 border-dark-700" />);
      }
      // Unordered list
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushOrderedList();
        listItems.push(trimmed.slice(2));
      }
      // Ordered list
      else if (/^\d+\.\s/.test(trimmed)) {
        flushList();
        orderedListItems.push(trimmed.replace(/^\d+\.\s/, ''));
      }
      // Tags
      else if (trimmed.startsWith('Tags:')) {
        flushList();
        flushOrderedList();
        const tags = trimmed.slice(5).split(',').map(t => t.trim()).filter(Boolean);
        elements.push(
          <div key={index} className="mt-6 pt-4 border-t border-dark-700">
            <span className="text-xs text-dark-400 mr-2">Tags:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-primary-500/20 text-primary-300 text-xs rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        );
      }
      // Paragraph
      else if (trimmed) {
        flushList();
        flushOrderedList();
        elements.push(<p key={index} className="text-dark-200 my-2 leading-relaxed">{renderInlineMarkdown(trimmed)}</p>);
      }
    });
    
    flushList();
    flushOrderedList();
    flushBlockquote();
    flushCodeBlock();
    return elements;
  };

  // HTML renderer - sanitize and render
  const renderHtml = (html: string) => {
    // Basic sanitization - remove script tags
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
    
    return (
      <div 
        className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-dark-200 prose-a:text-primary-400 prose-strong:text-white prose-code:text-amber-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:rounded"
        dangerouslySetInnerHTML={{ __html: sanitized }} 
      />
    );
  };

  // JSON renderer with syntax highlighting
  const renderJson = (jsonStr: string) => {
    try {
      // Try to extract JSON from code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      const cleanJson = jsonMatch ? jsonMatch[1].trim() : jsonStr.trim();
      const data = JSON.parse(cleanJson);
      return renderJsonObject(data, 0);
    } catch {
      // If not valid JSON, show as formatted text
      return <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono">{jsonStr}</pre>;
    }
  };

  const renderJsonObject = (obj: unknown, depth: number): React.ReactNode => {
    if (obj === null) {
      return <span className="text-dark-500 italic">null</span>;
    }
    if (obj === undefined) {
      return <span className="text-dark-500 italic">undefined</span>;
    }
    if (typeof obj === 'string') {
      return <span className="text-emerald-400">"{obj}"</span>;
    }
    if (typeof obj === 'number') {
      return <span className="text-amber-400">{obj}</span>;
    }
    if (typeof obj === 'boolean') {
      return <span className="text-purple-400">{String(obj)}</span>;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return <span className="text-dark-400">[]</span>;
      }
      // Check if simple array (all primitives)
      const isSimple = obj.every(item => typeof item !== 'object' || item === null);
      if (isSimple && obj.length <= 5) {
        return (
          <span>
            <span className="text-dark-400">[</span>
            {obj.map((item, i) => (
              <span key={i}>
                {renderJsonObject(item, depth + 1)}
                {i < obj.length - 1 && <span className="text-dark-400">, </span>}
              </span>
            ))}
            <span className="text-dark-400">]</span>
          </span>
        );
      }
      return (
        <div className={`${depth > 0 ? 'ml-4' : ''}`}>
          <span className="text-dark-400">[</span>
          {obj.map((item, i) => (
            <div key={i} className="ml-4">
              {renderJsonObject(item, depth + 1)}
              {i < obj.length - 1 && <span className="text-dark-400">,</span>}
            </div>
          ))}
          <span className="text-dark-400">]</span>
        </div>
      );
    }
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return <span className="text-dark-400">{'{}'}</span>;
      }
      return (
        <div className={`${depth > 0 ? 'ml-4 border-l-2 border-dark-700 pl-3' : ''} space-y-2`}>
          {entries.map(([key, value], i) => (
            <div key={i} className="group">
              <span className="text-primary-300 font-medium">{key}</span>
              <span className="text-dark-500">: </span>
              {typeof value === 'object' && value !== null && !Array.isArray(value) ? (
                <div className="mt-1">{renderJsonObject(value, depth + 1)}</div>
              ) : Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? (
                <div className="mt-1">{renderJsonObject(value, depth + 1)}</div>
              ) : (
                renderJsonObject(value, depth + 1)
              )}
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-dark-300">{String(obj)}</span>;
  };

  // Plain text renderer with line breaks preserved
  const renderPlainText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="font-mono text-sm space-y-2">
        {lines.map((line, i) => {
          // Detect ALL CAPS headings
          if (/^[A-Z][A-Z\s&]+$/.test(line.trim()) && line.trim().length > 3) {
            return <h3 key={i} className="text-lg font-bold text-white mt-4 mb-2">{line}</h3>;
          }
          // Detect dashed list items
          if (line.trim().startsWith('-')) {
            return <p key={i} className="text-dark-200 pl-4">{line}</p>;
          }
          // Empty lines
          if (!line.trim()) {
            return <div key={i} className="h-2" />;
          }
          return <p key={i} className="text-dark-200">{line}</p>;
        })}
      </div>
    );
  };

  // Main render function that detects format
  const renderResult = (content: string, format: string) => {
    switch (format) {
      case 'html':
        return renderHtml(content);
      case 'json':
        return renderJson(content);
      case 'plain':
        return renderPlainText(content);
      case 'markdown':
      default:
        return renderMarkdown(content);
    }
  };

  // Get current config summary
  const getConfigSummary = () => {
    const parts: string[] = [];
    
    const lang = OUTPUT_LANGUAGES.find(l => l.code === aiConfig.outputLanguage);
    if (lang) parts.push(`🌐 ${lang.label}`);
    
    const fmt = OUTPUT_FORMATS.find(f => f.code === aiConfig.outputFormat);
    if (fmt) parts.push(`${fmt.icon} ${fmt.label}`);
    
    const reason = REASONING_LEVELS.find(r => r.value === aiConfig.reasoningEffort);
    if (reason) parts.push(`🧠 ${reason.label}`);
    
    if (aiConfig.enableWebSearch) parts.push('🔍 Web');
    
    return parts.join(' • ');
  };

  if (settingsLoading) {
    return (
      <div className="h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-pulse text-dark-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-dark flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-dark-800 bg-dark-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            </div>
          <div>
            <h1 className="text-base font-bold text-white">Page Reader</h1>
            <p className="text-xs text-dark-400 truncate max-w-32" title={activeSession?.name}>
              {activeSession?.name || settings.model}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Sessions Button */}
          <button
            onClick={() => setSidePanel(sidePanel === 'sessions' ? null : 'sessions')}
            className={`p-2 rounded-lg transition-colors ${sidePanel === 'sessions' ? 'bg-blue-500/20 text-blue-400' : 'text-dark-400 hover:bg-dark-800'}`}
            title="Sessions"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>
          {/* Media Library Button - folder/collection icon */}
          <button
            onClick={() => setSidePanel(sidePanel === 'media' ? null : 'media')}
            className={`p-2 rounded-lg transition-colors relative ${sidePanel === 'media' ? 'bg-purple-500/20 text-purple-400' : 'text-dark-400 hover:bg-dark-800'}`}
            title="My Library"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {mediaLibrary.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {mediaLibrary.length}
              </span>
            )}
          </button>
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:bg-dark-800'}`}
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>
      
      {/* Side Panel - Sessions & Media Library */}
      {sidePanel && (
        <div className="border-b border-dark-800 bg-dark-900/80 animate-fadeIn">
          {/* Sessions Panel */}
          {sidePanel === 'sessions' && (
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-blue-400">📁 Sessions</h3>
                <button
                  onClick={() => createSession()}
                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                >
                  + New
                </button>
              </div>
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    session.id === activeSessionId 
                      ? 'bg-blue-500/20 border border-blue-500/50' 
                      : 'bg-dark-800/50 border border-dark-700/50 hover:bg-dark-800'
                  }`}
                >
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editingSessionName}
                      onChange={(e) => setEditingSessionName(e.target.value)}
                      onBlur={() => {
                        if (editingSessionName.trim()) {
                          renameSession(session.id, editingSessionName.trim());
                        }
                        setEditingSessionId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editingSessionName.trim()) {
                            renameSession(session.id, editingSessionName.trim());
                          }
                          setEditingSessionId(null);
                        } else if (e.key === 'Escape') {
                          setEditingSessionId(null);
                        }
                      }}
                      className="flex-1 px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                  ) : (
                    <>
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => switchSession(session.id)}
                      >
                        <p className="text-sm text-white truncate">{session.name}</p>
                        <p className="text-xs text-dark-500 truncate">
                          {session.mediaLibrary.length} items • {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(session.id);
                          setEditingSessionName(session.name);
                        }}
                        className="p-1 text-dark-400 hover:text-white transition-colors"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      {sessions.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this session?')) {
                              deleteSession(session.id);
                            }
                          }}
                          className="p-1 text-dark-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* My Library Panel */}
          {sidePanel === 'media' && (
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-400">📚 My Library</h3>
                {mediaLibrary.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Clear all media items?')) {
                        clearMediaLibrary();
                      }
                    }}
                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {mediaLibrary.length === 0 ? (
                <p className="text-xs text-dark-500 text-center py-4">
                  No media yet. Generate videos or text to populate your library.
                </p>
              ) : (
                mediaLibrary.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 p-2 bg-dark-800/50 border border-dark-700/50 rounded-lg hover:bg-dark-800 transition-all"
                  >
                    {/* Thumbnail/Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'video' ? 'bg-purple-500/20' : 'bg-green-500/20'
                    }`}>
                      {item.type === 'video' ? '🎬' : '📝'}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {editingMediaId === item.id ? (
                        <input
                          type="text"
                          value={editingMediaName}
                          onChange={(e) => setEditingMediaName(e.target.value)}
                          onBlur={() => {
                            if (editingMediaName.trim()) {
                              renameMediaItem(item.id, editingMediaName.trim());
                            }
                            setEditingMediaId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingMediaName.trim()) {
                                renameMediaItem(item.id, editingMediaName.trim());
                              }
                              setEditingMediaId(null);
                            } else if (e.key === 'Escape') {
                              setEditingMediaId(null);
                            }
                          }}
                          className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                          autoFocus
                        />
                      ) : (
                        <p className="text-sm text-white truncate">{item.name}</p>
                      )}
                      <p className="text-xs text-dark-500 truncate">{item.metadata.model}</p>
                      {item.type === 'video' && item.metadata.duration && (
                        <p className="text-xs text-purple-400">{item.metadata.duration}s • {item.metadata.width}x{item.metadata.height}</p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      {item.type === 'video' && item.videoUrl && (
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-purple-400 hover:bg-purple-500/20 rounded transition-colors"
                          title="Open Video"
                        >
                          ▶️
                        </a>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.content || item.videoUrl || '');
                        }}
                        className="p-1 text-dark-400 hover:text-white transition-colors"
                        title="Copy"
                      >
                        📋
                      </button>
                      <button
                        onClick={() => {
                          setEditingMediaId(item.id);
                          setEditingMediaName(item.name);
                        }}
                        className="p-1 text-dark-400 hover:text-white transition-colors"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => removeMediaItem(item.id)}
                        className="p-1 text-dark-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 space-y-4 animate-fadeIn max-h-96 overflow-y-auto">
          {/* Text AI Settings */}
          <div className="p-3 bg-dark-800/50 rounded-xl border border-dark-700/50 space-y-3">
            <h4 className="text-xs font-semibold text-primary-400 flex items-center gap-2">
              📝 Text AI (POE / OpenAI Compatible)
            </h4>
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">API Key</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder="Enter your API key"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Base URL</label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                placeholder="https://api.poe.com/v1"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1.5">Model</label>
              <select
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                {AVAILABLE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          
          {/* Video AI Info */}
          <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-700/50">
            <h4 className="text-xs font-semibold text-purple-400 flex items-center gap-2 mb-2">
              🎬 Video Generation
            </h4>
            <p className="text-xs text-dark-400">
              Video generation uses the same POE API key. Select a video model in Step 3 (Video Mode) to generate videos.
            </p>
            <p className="text-xs text-dark-500 mt-2">
              Available video models: Sora, Veo, Runway, Kling, Hailuo, Pika, Luma
            </p>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="px-4 py-3 border-b border-dark-800 flex gap-2">
        {(['read', 'edit', 'config', 'result'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? 'bg-primary-500 text-white' : 
                ['read', 'edit', 'config', 'result'].indexOf(step) > i ? 'bg-emerald-500 text-white' : 'bg-dark-700 text-dark-400'}`}>
              {i + 1}
            </div>
            <span className={`text-xs ${step === s ? 'text-white' : 'text-dark-400'}`}>
              {s === 'read' ? 'Read' : s === 'edit' ? 'Edit' : s === 'config' ? 'Config' : 'Result'}
            </span>
            {i < 3 && <div className="w-4 h-px bg-dark-700" />}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Read Page */}
        {step === 'read' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-dark-800 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Read Page Content</h2>
            <p className="text-dark-400 mb-6 max-w-xs">Extract text and images from the current page</p>
            
            {pageError && <p className="text-red-400 text-sm mb-4">{pageError}</p>}
            
            <button
              onClick={handleReadPage}
              disabled={pageLoading || !settings.apiKey}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-medium rounded-xl disabled:opacity-50"
            >
              {pageLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
              Read Page
            </button>
            
            {!settings.apiKey && (
              <p className="text-amber-400 text-xs mt-4">Please configure API key in settings first</p>
            )}
          </div>
        )}

        {/* Step 2: Edit Content */}
        {step === 'edit' && pageContent && (
          <div className="h-full flex flex-col">
            {/* Tabs */}
            <div className="flex gap-1 mb-3 bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setEditTab('text')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${editTab === 'text' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                📄 Text
                <span className="text-xs opacity-70">({editedContent.length.toLocaleString()})</span>
              </button>
              <button
                onClick={() => setEditTab('images')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${editTab === 'images' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                🖼️ Images
                <span className="text-xs opacity-70">({selectedImages.length}/{pageContent.images.length})</span>
              </button>
            </div>

            {/* Text Tab */}
            {editTab === 'text' && (
              <div className="flex-1 flex flex-col">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="flex-1 w-full p-3 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  placeholder="Edit the text content..."
            />
          </div>
        )}

            {/* Images Tab */}
            {editTab === 'images' && (
        <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-dark-400">
                    {selectedImages.length} of {pageContent.images.length} images selected
                  </span>
                  <div className="flex gap-2">
                    <button onClick={handleSelectAllImages} className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg">Select All</button>
                    <button onClick={handleDeselectAllImages} className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg">Deselect All</button>
              </div>
            </div>
                
                <div className="flex-1 overflow-y-auto">
                  {pageContent.images.length === 0 ? (
                    <div className="text-center py-8 text-dark-400">No images found on this page</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {pageContent.images.map((img, index) => {
                        const isSelected = selectedImages.some(i => i.src === img.src);
                        return (
                          <div
                  key={index}
                            onClick={() => handleToggleImage(index)}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all
                              ${isSelected ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-dark-700 hover:border-dark-600 opacity-50'}`}
                          >
                            <img src={img.src} alt={img.alt} className="w-full h-24 object-cover bg-dark-900"
                              onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23334155" width="100" height="100"/><text x="50" y="50" text-anchor="middle" fill="%2394a3b8" font-size="12">Error</text></svg>'; }}
                            />
                            <div className="absolute top-2 right-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSelected ? 'bg-primary-500' : 'bg-dark-800/80'}`}>
                                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                              </div>
                            </div>
                            <div className="p-2 bg-dark-900/90">
                              <p className="text-xs text-dark-300 truncate">{img.alt || 'No alt text'}</p>
                              <p className="text-xs text-dark-500">{img.width}×{img.height}</p>
                      </div>
                    </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}
              
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep('read')} className="flex-1 px-4 py-2.5 bg-dark-800 text-dark-300 rounded-xl border border-dark-700 hover:bg-dark-700">Back</button>
              <button onClick={handleConfirmContent} disabled={!editedContent.trim()} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-medium rounded-xl disabled:opacity-50">Next: Config</button>
            </div>
            </div>
          )}

        {/* Step 3: AI Config */}
        {step === 'config' && (
          <div className="h-full flex flex-col">
            {/* Mode Toggle */}
            <div className="flex gap-1 mb-4 bg-dark-800 rounded-lg p-1">
              <button
                onClick={() => setConfigMode('text')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${configMode === 'text' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                📝 Text Generation
              </button>
              <button
                onClick={() => setConfigMode('video')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${configMode === 'video' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'text-dark-400 hover:text-white'}`}
              >
                🎬 Video Prompt
              </button>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">
                {configMode === 'text' ? 'Text AI Configuration' : 'Video Prompt Configuration'}
              </h3>
              <button
                onClick={handleResetConfig}
                className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg"
              >
                Reset to Default
              </button>
            </div>
            
            {/* Text Generation Config */}
            {configMode === 'text' && (
              <>
                {/* Quick Options */}
                <div className="space-y-4 mb-4">
                  {/* Output Language */}
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">🌐 Output Language</label>
                    <div className="grid grid-cols-3 gap-2">
                      {OUTPUT_LANGUAGES.slice(0, 6).map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => setAiConfig(c => ({ ...c, outputLanguage: lang.code }))}
                          className={`px-3 py-2 text-xs rounded-lg transition-all
                            ${aiConfig.outputLanguage === lang.code 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                    <select
                      value={aiConfig.outputLanguage}
                      onChange={(e) => setAiConfig(c => ({ ...c, outputLanguage: e.target.value }))}
                      className="mt-2 w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 text-xs"
                    >
                      {OUTPUT_LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.label}</option>)}
                    </select>
                  </div>

                  {/* Output Format */}
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">📄 Output Format</label>
                    <div className="grid grid-cols-4 gap-2">
                      {OUTPUT_FORMATS.map(fmt => (
                        <button
                          key={fmt.code}
                          onClick={() => setAiConfig(c => ({ ...c, outputFormat: fmt.code }))}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all
                            ${aiConfig.outputFormat === fmt.code 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
                        >
                          <span>{fmt.icon}</span>
                          <span className="text-xs">{fmt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reasoning Effort */}
                  <div>
                    <label className="block text-xs text-dark-400 mb-2">🧠 Reasoning Effort</label>
                    <div className="grid grid-cols-3 gap-2">
                      {REASONING_LEVELS.map(level => (
                        <button
                          key={level.value}
                          onClick={() => setAiConfig(c => ({ ...c, reasoningEffort: level.value as AIConfig['reasoningEffort'] }))}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all
                            ${aiConfig.reasoningEffort === level.value 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
                        >
                          <span className="text-sm font-medium">{level.label}</span>
                          <span className="text-xs opacity-70">{level.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Web Search Toggle */}
                  <div className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                    <div>
                      <p className="text-sm text-white">🔍 Enable Web Search</p>
                      <p className="text-xs text-dark-400">Allow AI to search the web for additional context</p>
                    </div>
                    <button
                      onClick={() => setAiConfig(c => ({ ...c, enableWebSearch: !c.enableWebSearch }))}
                      className={`w-12 h-6 rounded-full transition-colors relative
                        ${aiConfig.enableWebSearch ? 'bg-primary-500' : 'bg-dark-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                        ${aiConfig.enableWebSearch ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                {/* System Prompt Preview */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-dark-400">📝 Generated System Prompt</label>
                    <button
                      onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                      className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg"
                    >
                      {showSystemPrompt ? 'Hide' : 'Preview'}
                    </button>
                  </div>
                  
                  {/* Config Summary Badge */}
                  <div className="mb-2 px-3 py-1.5 bg-dark-800/50 rounded-lg border border-dark-700/50 inline-flex items-center gap-2 text-xs text-dark-300">
                    <span className="text-dark-500">Active:</span>
                    <span>{getConfigSummary()}</span>
                  </div>
                  
                  {showSystemPrompt && (
                    <div className="flex-1 overflow-y-auto p-3 bg-dark-800 border border-dark-700 rounded-xl text-xs text-dark-200 font-mono whitespace-pre-wrap">
                      {finalSystemPrompt}
                    </div>
                  )}
                  
                  {!showSystemPrompt && (
                    <div className="p-3 bg-dark-800/50 rounded-xl border border-dark-700/50">
                      <p className="text-xs text-dark-400">
                        System prompt generated ({finalSystemPrompt.length.toLocaleString()} characters)
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        Click "Preview" to view the full prompt with your settings integrated.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Video Prompt Config */}
            {configMode === 'video' && (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Video Model Selection */}
                <div>
                  <label className="block text-xs text-dark-400 mb-2">🎥 Video Model</label>
                  <select
                    value={videoConfig.model}
                    onChange={(e) => handleVideoModelChange(e.target.value as VideoModel)}
                    className="w-full px-3 py-2.5 bg-dark-800 border border-purple-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {VIDEO_MODELS.map(model => (
                      <option key={model.name} value={model.name}>
                        {model.displayName} ({model.provider}) - {model.minDuration}-{model.maxDuration}s
                        {model.supportsSoundGeneration ? ' 🔊' : ''}
                        {model.supportsImageReference ? ' 🖼️' : ''}
                      </option>
                    ))}
                  </select>
                  {/* Model Info Card */}
                  <div className="mt-2 p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">{currentVideoModel.displayName}</span>
                      <span className="text-xs text-purple-400">{currentVideoModel.provider}</span>
                    </div>
                    <p className="text-xs text-dark-400 mt-1">{currentVideoModel.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-dark-700 rounded-full">{currentVideoModel.minDuration}-{currentVideoModel.maxDuration}s</span>
                      <span className="text-xs px-2 py-0.5 bg-dark-700 rounded-full">{currentVideoModel.defaultWidth}×{currentVideoModel.defaultHeight}</span>
                      {currentVideoModel.supportsImageReference && <span className="text-xs px-2 py-0.5 bg-dark-700 rounded-full">🖼️ Image</span>}
                      {currentVideoModel.supportsSoundGeneration && <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">🔊 Audio</span>}
                    </div>
                  </div>
                </div>
                
                {/* Duration Slider */}
                <div>
                  <label className="block text-xs text-dark-400 mb-2">⏱️ Duration: {videoConfig.duration}s</label>
                  <input
                    type="range"
                    min={currentVideoModel.minDuration}
                    max={currentVideoModel.maxDuration}
                    step={currentVideoModel.durationStep}
                    value={videoConfig.duration}
                    onChange={(e) => setVideoConfig(c => ({ ...c, duration: Number(e.target.value) }))}
                    className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-dark-500 mt-1">
                    <span>{currentVideoModel.minDuration}s</span>
                    <span>{currentVideoModel.maxDuration}s</span>
                  </div>
                </div>
                
                {/* Video Dimensions */}
                <div>
                  <label className="block text-xs text-dark-400 mb-2">📐 Video Size ({videoConfig.width}×{videoConfig.height})</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { w: 1280, h: 720, label: '720p 16:9' },
                      { w: 720, h: 1280, label: '720p 9:16' },
                      { w: 1920, h: 1080, label: '1080p 16:9' },
                      { w: 1080, h: 1920, label: '1080p 9:16' },
                      { w: 1080, h: 1080, label: '1080p 1:1' },
                      { w: 720, h: 720, label: '720p 1:1' },
                    ].map(size => {
                      const isSelected = videoConfig.width === size.w && videoConfig.height === size.h;
                      return (
                        <button
                          key={`${size.w}x${size.h}`}
                          onClick={() => setVideoConfig(c => ({ ...c, width: size.w, height: size.h }))}
                          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all text-xs
                            ${isSelected 
                              ? 'bg-purple-500 text-white' 
                              : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
                        >
                          <div className={`border-2 ${isSelected ? 'border-white' : 'border-dark-500'} rounded
                            ${size.w > size.h ? 'w-5 h-3' : size.w < size.h ? 'w-3 h-5' : 'w-4 h-4'}`} />
                          <span>{size.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Video Style */}
                <div>
                  <label className="block text-xs text-dark-400 mb-2">🎨 Video Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIDEO_STYLES.map(style => (
                      <button
                        key={style.code}
                        onClick={() => setVideoConfig(c => ({ ...c, videoStyle: style.code as VideoConfig['videoStyle'] }))}
                        className={`flex flex-col items-start p-3 rounded-xl transition-all text-left
                          ${videoConfig.videoStyle === style.code 
                            ? 'bg-purple-500/20 border-2 border-purple-500' 
                            : 'bg-dark-800 border-2 border-dark-700 hover:border-dark-600'}`}
                      >
                        <span className="text-base">{style.icon} {style.label}</span>
                        <span className="text-xs text-dark-400 mt-1">{style.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Target Language */}
                <div>
                  <label className="block text-xs text-dark-400 mb-2">🌐 On-screen Text Language</label>
                  <div className="grid grid-cols-4 gap-2">
                    {VIDEO_OUTPUT_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => setVideoConfig(c => ({ ...c, targetLanguage: lang.code as VideoConfig['targetLanguage'] }))}
                        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all
                          ${videoConfig.targetLanguage === lang.code 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'}`}
                      >
                        <span>{lang.flag}</span>
                        <span className="text-xs">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Brand Settings */}
                <div className="p-3 bg-dark-800 rounded-xl space-y-3">
                  <label className="block text-xs text-dark-400">🏷️ Brand Settings</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-dark-500 mb-1">Brand Name</label>
                      <input
                        type="text"
                        value={videoConfig.brandName}
                        onChange={(e) => setVideoConfig(c => ({ ...c, brandName: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="XOOBAY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-dark-500 mb-1">Brand URL</label>
                      <input
                        type="text"
                        value={videoConfig.brandUrl}
                        onChange={(e) => setVideoConfig(c => ({ ...c, brandUrl: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder="https://www.xoobay.com/"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Sound Toggle */}
                {currentVideoModel.supportsSoundGeneration && (
                  <div className="flex items-center justify-between p-3 bg-dark-800 rounded-xl">
                    <div>
                      <p className="text-sm text-white">🔊 Generate Audio</p>
                      <p className="text-xs text-dark-400">Include ambient sounds and effects</p>
                    </div>
                    <button
                      onClick={() => setVideoConfig(c => ({ ...c, enableSound: !c.enableSound }))}
                      className={`w-12 h-6 rounded-full transition-colors relative
                        ${videoConfig.enableSound ? 'bg-purple-500' : 'bg-dark-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                        ${videoConfig.enableSound ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                )}
                
                {/* Image Reference Toggle */}
                {currentVideoModel.supportsImageReference && (
                  <div className="p-3 bg-dark-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">🖼️ Use Image Reference</p>
                        <p className="text-xs text-dark-400">Provide a product image as reference</p>
                      </div>
                      <button
                        onClick={() => setVideoConfig(c => ({ ...c, useImageReference: !c.useImageReference }))}
                        className={`w-12 h-6 rounded-full transition-colors relative
                          ${videoConfig.useImageReference ? 'bg-purple-500' : 'bg-dark-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                          ${videoConfig.useImageReference ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {videoConfig.useImageReference && (
                      <>
                        <input
                          type="text"
                          value={videoConfig.referenceImageUrl}
                          onChange={(e) => setVideoConfig(c => ({ ...c, referenceImageUrl: e.target.value }))}
                          className="w-full px-3 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          placeholder="https://example.com/product-image.jpg"
                        />
                        {selectedImages.length > 0 && (
                          <div>
                            <p className="text-xs text-dark-400 mb-2">Or select from page images:</p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {selectedImages.slice(0, 5).map((img, i) => (
                                <button
                                  key={i}
                                  onClick={() => setVideoConfig(c => ({ ...c, referenceImageUrl: img.src }))}
                                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all
                                    ${videoConfig.referenceImageUrl === img.src ? 'border-purple-500' : 'border-dark-600 hover:border-dark-500'}`}
                                >
                                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {/* Video System Prompt Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-dark-400">📝 Video System Prompt</label>
                    <button
                      onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                      className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg"
                    >
                      {showSystemPrompt ? 'Hide' : 'Preview'}
                    </button>
                  </div>
                  
                  {/* Video Config Summary */}
                  <div className="mb-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30 text-xs text-purple-300">
                    🎬 {currentVideoModel.displayName} • {videoConfig.duration}s • {videoConfig.width}×{videoConfig.height} • {videoConfig.videoStyle}
                  </div>
                  
                  {showSystemPrompt && (
                    <div className="max-h-48 overflow-y-auto p-3 bg-dark-800 border border-dark-700 rounded-xl text-xs text-dark-200 font-mono whitespace-pre-wrap">
                      {finalVideoSystemPrompt}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="my-4 p-3 bg-dark-800/50 rounded-xl border border-dark-700/50">
              <p className="text-xs text-dark-400 mb-1">Ready to process:</p>
              <p className="text-sm text-dark-200">
                {configMode === 'text' ? '📝' : '🎬'} {editedContent.length.toLocaleString()} chars • 🖼️ {selectedImages.length} images
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('edit')} className="flex-1 px-4 py-2.5 bg-dark-800 text-dark-300 rounded-xl border border-dark-700 hover:bg-dark-700">Back</button>
              <button
                onClick={handleSendToAI}
                disabled={aiLoading || (configMode === 'text' ? !aiConfig.systemPrompt.trim() : !finalVideoSystemPrompt.trim())}
                className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2
                  ${configMode === 'video' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-primary-500 to-indigo-500'}`}
              >
                {aiLoading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
                ) : configMode === 'video' ? (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Generate Video Prompt</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Generate</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 'result' && (
          <div className="h-full flex flex-col">
            {/* Result Type Indicator */}
            <div className="flex items-center gap-2 mb-3">
              {configMode === 'video' ? (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-purple-300 text-xs font-medium rounded-full flex items-center gap-1">
                  🎬 Video Generation Result
                </span>
              ) : (
                <span className="px-3 py-1 bg-primary-500/20 border border-primary-500/50 text-primary-300 text-xs font-medium rounded-full flex items-center gap-1">
                  📝 Text Generation Result
                </span>
              )}
            </div>
            
            {/* Controls - Responsive layout */}
            <div className="flex flex-col gap-2 mb-3">
              {/* View toggle and action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
                  <button
                    onClick={() => setResultView('rendered')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${resultView === 'rendered' ? (configMode === 'video' ? 'bg-purple-500' : 'bg-primary-500') + ' text-white' : 'text-dark-400 hover:text-white'}`}
                  >{configMode === 'video' ? '🎬 Video' : '📊 Preview'}</button>
                  <button
                    onClick={() => setResultView('raw')}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${resultView === 'raw' ? (configMode === 'video' ? 'bg-purple-500' : 'bg-primary-500') + ' text-white' : 'text-dark-400 hover:text-white'}`}
                  >📄 {configMode === 'video' ? 'Prompt' : 'Source'}</button>
                </div>
                
                {/* Action Buttons */}
                {(aiResult || videoResult) && (
                  <div className="flex flex-wrap gap-1.5">
                    <button 
                      onClick={() => handleCopy(videoResult?.prompt || videoResult?.content || aiResult || '')} 
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg whitespace-nowrap"
                      title="Copy to clipboard"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      <span className="hidden sm:inline">Copy</span>
                    </button>
                    {configMode !== 'video' && aiResult && (
                      <>
                        <button 
                          onClick={handleDownload} 
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg whitespace-nowrap"
                          title="Download file"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        <button 
                          onClick={handleSaveTextToLibrary} 
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg whitespace-nowrap"
                          title="Save to library"
                        >
                          📚 <span className="hidden sm:inline">Save</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {aiError && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl mb-3">
                <p className="text-red-400 text-sm">{aiError}</p>
              </div>
            )}
            
            {/* Video Result */}
            {configMode === 'video' && videoResult && (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Video Generating Status */}
                {(videoResult.type === 'pending' || videoPolling) && resultView === 'rendered' && (
                  <div className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="relative w-20 h-20 mb-4">
                        <svg className="w-20 h-20 animate-spin" viewBox="0 0 100 100">
                          <circle 
                            cx="50" cy="50" r="40" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            fill="none" 
                            className="text-dark-700"
                          />
                          <circle 
                            cx="50" cy="50" r="40" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            fill="none" 
                            strokeDasharray={`${(videoResult.progress || 0) * 2.51} 251`}
                            strokeLinecap="round"
                            className="text-purple-500"
                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-purple-300">{videoResult.progress || 0}%</span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Generating Video...</h3>
                      <p className="text-sm text-dark-400 mb-4">
                        {videoResult.status === 'pending' ? 'Waiting in queue...' : 'Processing your video...'}
                      </p>
                      <div className="text-xs text-dark-500 space-y-1">
                        <p>Model: {currentVideoModel.displayName}</p>
                        <p>Duration: {videoConfig.duration}s • Size: {videoConfig.width}×{videoConfig.height}</p>
                      </div>
                      <button
                        onClick={() => { stopPolling(); clearResult(); setStep('config'); }}
                        className="mt-4 px-4 py-2 text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Video Player */}
                {videoResult.type === 'video' && videoResult.videoUrl && resultView === 'rendered' && (
                  <div className="bg-black rounded-xl overflow-hidden">
                    <video 
                      src={videoResult.videoUrl} 
                      controls 
                      autoPlay
                      className="w-full aspect-video"
                      poster={videoResult.thumbnailUrl}
                    >
                      Your browser does not support video playback.
                    </video>
                    <div className="p-3 bg-dark-800 border-t border-dark-700">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dark-400">✅ Video Generated Successfully</span>
                        <a 
                          href={videoResult.videoUrl} 
                          download 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download Video
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* No Video - Show Prompt */}
                {videoResult.type === 'text' && resultView === 'rendered' && (
                  <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-purple-300">
                        📝 Generated Video Prompt
                      </span>
                      {videoResult.status === 'failed' && (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">Failed</span>
                      )}
                    </div>
                    <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono bg-dark-900 p-3 rounded-lg max-h-64 overflow-y-auto">
                      {videoResult.prompt || videoResult.content}
                    </pre>
                    <div className="mt-3 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
                      <p className="text-amber-400 text-xs">
                        💡 {!settings.apiKey 
                          ? 'API Key not configured. Add your POE API key in Settings to generate videos.'
                          : 'Copy this prompt and use it with video generation tools, or check if the selected model supports video generation.'}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Raw Prompt View */}
                {resultView === 'raw' && videoResult.prompt && (
                  <div className="p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-purple-300">📝 Video Prompt</span>
                    </div>
                    <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono bg-dark-900 p-3 rounded-lg">
                      {videoResult.prompt}
                    </pre>
                  </div>
                )}
                
                {/* Video Info */}
                {videoResult.type === 'video' && resultView === 'rendered' && (
                  <div className="p-3 bg-dark-800/50 border border-dark-700/50 rounded-xl">
                    <h4 className="text-xs font-medium text-dark-400 mb-2">Video Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-dark-500">Model:</span> <span className="text-dark-200">{currentVideoModel.displayName}</span></div>
                      <div><span className="text-dark-500">Duration:</span> <span className="text-dark-200">{videoConfig.duration}s</span></div>
                      <div><span className="text-dark-500">Size:</span> <span className="text-dark-200">{videoConfig.width}×{videoConfig.height}</span></div>
                      <div><span className="text-dark-500">Style:</span> <span className="text-dark-200">{videoConfig.videoStyle}</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Text Result */}
            {configMode === 'text' && aiResult && (
              <div className="flex-1 overflow-y-auto p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
                {resultView === 'raw' ? (
                  <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono">{aiResult}</pre>
                ) : (
                  <div className="prose prose-invert max-w-none">{renderResult(aiResult, aiConfig.outputFormat)}</div>
                )}
              </div>
            )}
            
            {/* No Result */}
            {!aiResult && !videoResult && !aiError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-dark-400">
                  <p>No result generated</p>
                </div>
              </div>
            )}
            
            <button 
              onClick={handleReset} 
              className={`mt-4 px-4 py-2.5 text-white font-medium rounded-xl flex items-center justify-center gap-2
                ${configMode === 'video' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-primary-500 to-indigo-500'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Start New
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
