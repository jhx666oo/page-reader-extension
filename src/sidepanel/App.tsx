import React, { useState, useEffect, useMemo } from 'react';
import { usePageContent } from '@/hooks/usePageContent';
import { useSettings } from '@/hooks/useSettings';
import { useAI } from '@/hooks/useAI';
import { PageContent, AVAILABLE_MODELS, ImageInfo, AIConfig, DEFAULT_AI_CONFIG } from '@/types';
import { buildSystemPrompt, OUTPUT_LANGUAGES, OUTPUT_FORMATS, REASONING_LEVELS } from '@/utils/templates';

type Step = 'read' | 'edit' | 'config' | 'result';
type ResultView = 'rendered' | 'raw';

export const App: React.FC = () => {
  const { getPageContent, loading: pageLoading, error: pageError } = usePageContent();
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const { sendPrompt, loading: aiLoading, error: aiError, result: aiResult, clearResult } = useAI();

  const [step, setStep] = useState<Step>('read');
  const [pageContent, setPageContent] = useState<PageContent | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [resultView, setResultView] = useState<ResultView>('rendered');
  const [editTab, setEditTab] = useState<'text' | 'images'>('text');
  
  // AI Config State
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    ...DEFAULT_AI_CONFIG,
    systemPrompt: buildSystemPrompt('auto', 'markdown', 'medium', false),
  });
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  // Build final system prompt when config changes
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
    setAiConfig({
      ...DEFAULT_AI_CONFIG,
      outputLanguage: 'auto',
      outputFormat: 'markdown',
      reasoningEffort: 'medium',
      enableWebSearch: false,
      systemPrompt: buildSystemPrompt('auto', 'markdown', 'medium', false),
    });
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
    
    await sendPrompt(userContent, settings, aiConfig);
    setStep('result');
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
            <p className="text-xs text-dark-400">{settings.model}</p>
          </div>
        </div>
        <button
            onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:bg-dark-800'}`}
          >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-dark-800 bg-dark-900/50 space-y-4 animate-fadeIn">
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">AI Configuration</h3>
              <button
                onClick={handleResetConfig}
                className="px-2 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg"
              >
                Reset to Default
              </button>
            </div>
            
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

            {/* Summary */}
            <div className="my-4 p-3 bg-dark-800/50 rounded-xl border border-dark-700/50">
              <p className="text-xs text-dark-400 mb-1">Ready to process:</p>
              <p className="text-sm text-dark-200">📄 {editedContent.length.toLocaleString()} chars • 🖼️ {selectedImages.length} images</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep('edit')} className="flex-1 px-4 py-2.5 bg-dark-800 text-dark-300 rounded-xl border border-dark-700 hover:bg-dark-700">Back</button>
              <button
                onClick={handleSendToAI}
                disabled={aiLoading || !aiConfig.systemPrompt.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-medium rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {aiLoading ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1 bg-dark-800 rounded-lg p-1">
                <button
                  onClick={() => setResultView('rendered')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${resultView === 'rendered' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
                >📊 Rendered</button>
                <button
                  onClick={() => setResultView('raw')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${resultView === 'raw' ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-white'}`}
                >📄 Raw</button>
              </div>
              
              {aiResult && (
                <div className="flex gap-2">
                  <button onClick={() => handleCopy(aiResult)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-800 hover:bg-dark-700 text-dark-300 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy
                  </button>
                  <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Download
                  </button>
                </div>
              )}
            </div>
            
            {aiError && (
              <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl mb-3">
                <p className="text-red-400 text-sm">{aiError}</p>
              </div>
            )}
            
            {aiResult && (
              <div className="flex-1 overflow-y-auto p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl">
                {resultView === 'raw' ? (
                  <pre className="text-sm text-dark-200 whitespace-pre-wrap font-mono">{aiResult}</pre>
                ) : (
                  <div className="prose prose-invert max-w-none">{renderResult(aiResult, aiConfig.outputFormat)}</div>
                )}
              </div>
            )}
            
            <button onClick={handleReset} className="mt-4 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-indigo-500 text-white font-medium rounded-xl flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Start New
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
