import { Settings, AIConfig, VideoConfig, VideoGenerationResult, VIDEO_MODELS } from '@/types';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

interface AIResponse {
  content: string;
  error?: string;
}

interface VideoResponse {
  result: VideoGenerationResult;
  error?: string;
}

// Together AI Video API response types
// Statuses: queued, in_progress, completed, failed, cancelled
interface TogetherVideoTask {
  id: string;
  status: 'queued' | 'in_progress' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  output?: {
    video_url?: string;
    url?: string;
  };
  result?: {
    url?: string;
  };
  error?: string;
}

export async function sendToAI(
  userContent: string,
  settings: Settings,
  aiConfig: AIConfig
): Promise<AIResponse> {
  if (!settings.apiKey) {
    return { content: '', error: 'API Key not configured' };
  }

  // Use the systemPrompt directly - it already includes all config options
  const messages: AIMessage[] = [
    { role: 'system', content: aiConfig.systemPrompt },
    { role: 'user', content: userContent }
  ];

  // Build request body
  const requestBody: Record<string, unknown> = {
    model: settings.model,
    messages,
  };

  // Add optional parameters based on config
  if (aiConfig.enableWebSearch) {
    requestBody.web_search = true;
  }

  // Map reasoning effort to temperature
  const reasoningMap: Record<string, number> = {
    'low': 0.3,
    'medium': 0.7,
    'high': 1.0,
  };
  requestBody.temperature = reasoningMap[aiConfig.reasoningEffort] || 0.7;

  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return { content: '', error: error.error?.message || `API Error: ${response.status}` };
    }

    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '' };
  } catch (err) {
    return { content: '', error: String(err) };
  }
}

// Legacy function for backwards compatibility
export function buildPrompt(
  pageContent: string,
  formatTemplate: string,
  formatType: 'json' | 'xml' | 'custom'
): string {
  let formatInstruction = '';
  
  if (formatType === 'json') {
    formatInstruction = `Please analyze the content and return the result in the following JSON format. Only return valid JSON, no other text:

\`\`\`json
${formatTemplate}
\`\`\``;
  } else if (formatType === 'xml') {
    formatInstruction = `Please analyze the content and return the result in the following XML format. Only return valid XML, no other text:

\`\`\`xml
${formatTemplate}
\`\`\``;
  } else {
    formatInstruction = formatTemplate;
  }

  return `${formatInstruction}

---

Here is the content to analyze:

${pageContent}`;
}

// Generate video prompt using text AI model
export async function generateVideoPrompt(
  productDescription: string,
  videoSystemPrompt: string,
  settings: Settings
): Promise<{ prompt: string; error?: string }> {
  if (!settings.apiKey) {
    return { prompt: '', error: 'Text API Key not configured' };
  }

  const promptMessages: AIMessage[] = [
    { role: 'system', content: videoSystemPrompt },
    { role: 'user', content: productDescription }
  ];

  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages: promptMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      return { prompt: '', error: error.error?.message || `Prompt API Error: ${response.status}` };
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content || '';
    return { prompt: generatedPrompt };
  } catch (err) {
    return { prompt: '', error: String(err) };
  }
}

// Create video generation task using Together AI API
// Reference: https://docs.together.ai/docs/videos-overview
export async function createVideoTask(
  prompt: string,
  videoConfig: VideoConfig,
  settings: Settings
): Promise<VideoResponse> {
  if (!settings.videoApiKey) {
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: 'Video API Key (Together AI) not configured. Please add it in Settings.' 
    };
  }

  const modelConfig = VIDEO_MODELS.find(m => m.name === videoConfig.model);
  if (!modelConfig) {
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: 'Invalid video model selected' 
    };
  }

  try {
    // Build request body based on Together AI video API format
    // Reference: https://docs.together.ai/docs/videos-overview
    const requestBody: Record<string, unknown> = {
      model: videoConfig.model,  // Use the model name directly
      prompt: prompt,
      width: videoConfig.width || modelConfig.defaultWidth,
      height: videoConfig.height || modelConfig.defaultHeight,
      seconds: videoConfig.duration,
    };

    // Add reference image for models that support it (as frame_images)
    if (videoConfig.useImageReference && videoConfig.referenceImageUrl && modelConfig.supportsImageReference) {
      requestBody.frame_images = [{
        url: videoConfig.referenceImageUrl,
        frame: 0,  // First frame
      }];
    }

    const apiUrl = `${settings.videoBaseUrl}/videos`;
    
    // Clean API key - remove any non-ASCII characters and whitespace
    const cleanApiKey = (settings.videoApiKey || '').trim().replace(/[^\x20-\x7E]/g, '');
    
    console.log('[Video API] ========== VIDEO GENERATION REQUEST ==========');
    console.log('[Video API] URL:', apiUrl);
    console.log('[Video API] Model:', videoConfig.model);
    console.log('[Video API] Prompt length:', prompt.length, 'chars');
    console.log('[Video API] Request body:', JSON.stringify(requestBody, null, 2));
    console.log('[Video API] API Key length:', cleanApiKey.length);
    console.log('[Video API] API Key valid:', cleanApiKey.length > 0);
    
    if (!cleanApiKey) {
      console.error('[Video API] API Key is empty or invalid after cleaning');
      return { 
        result: { type: 'text', status: 'failed', content: prompt, prompt },
        error: 'Video API Key is empty or contains invalid characters. Please check your Together AI API key in Settings.' 
      };
    }

    // Together AI video endpoint is /videos
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cleanApiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('[Video API] Response status:', response.status, response.statusText);

    const responseText = await response.text();
    console.log('[Video API] Response status:', response.status);
    console.log('[Video API] Response:', responseText);

    if (!response.ok) {
      let errorMessage = `Video API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || errorData.detail || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText || errorMessage;
      }
      console.error('[Video API] Error:', errorMessage);
      return { 
        result: { type: 'text', status: 'failed', content: prompt, prompt },
        error: errorMessage 
      };
    }

    let data: TogetherVideoTask;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { 
        result: { type: 'text', status: 'failed', content: prompt, prompt },
        error: 'Invalid response from video API' 
      };
    }
    console.log('[Video API] Task created:', data);

    // Check if video URL is directly returned (synchronous response)
    const videoUrl = data.output?.video_url || data.output?.url || data.result?.url || (data as unknown as { url?: string }).url;
    if (videoUrl) {
      return {
        result: {
          type: 'video',
          status: 'completed',
          content: prompt,
          videoUrl: videoUrl,
          duration: videoConfig.duration,
          prompt: prompt,
          taskId: data.id,
          progress: 100,
        }
      };
    }

    // If we have an ID, it's async - return pending status for polling
    if (data.id) {
      return {
        result: {
          type: 'pending',
          status: data.status || 'queued',
          content: prompt,
          prompt: prompt,
          taskId: data.id,
          progress: 0,
        }
      };
    }

    // No video URL and no task ID - unexpected response
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: 'Unexpected response from video API. Check console for details.' 
    };
  } catch (err) {
    console.error('[Video API] Exception:', err);
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: String(err) 
    };
  }
}

// Poll video task status
// Together AI job statuses: queued, in_progress, completed, failed, cancelled
export async function pollVideoTask(
  taskId: string,
  settings: Settings
): Promise<VideoResponse> {
  if (!settings.videoApiKey) {
    return { 
      result: { type: 'text', status: 'failed', content: '', taskId },
      error: 'Video API Key not configured' 
    };
  }

  try {
    // Clean API key
    const cleanApiKey = (settings.videoApiKey || '').trim().replace(/[^\x20-\x7E]/g, '');
    
    // Together AI video polling endpoint
    const response = await fetch(`${settings.videoBaseUrl}/videos/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
      },
    });

    const responseText = await response.text();
    console.log('[Video API] Poll response:', response.status, responseText);

    if (!response.ok) {
      return { 
        result: { type: 'pending', status: 'processing', content: '', taskId },
        error: `Poll Error: ${response.status}` 
      };
    }

    let data: TogetherVideoTask;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { 
        result: { type: 'pending', status: 'processing', content: '', taskId },
        error: 'Invalid poll response' 
      };
    }
    console.log('[Video API] Poll result:', data);

    // Check for video URL in outputs
    const videoUrl = data.output?.video_url || data.output?.url || data.result?.url;
    
    if (data.status === 'completed' && videoUrl) {
      return {
        result: {
          type: 'video',
          status: 'completed',
          content: '',
          videoUrl: videoUrl,
          taskId: taskId,
          progress: 100,
        }
      };
    }

    if (data.status === 'failed' || data.status === 'cancelled') {
      return {
        result: {
          type: 'text',
          status: 'failed',
          content: '',
          taskId: taskId,
          error: data.error || 'Video generation failed',
        },
        error: data.error || 'Video generation failed'
      };
    }

    // Map Together AI status to progress
    let progress = 10;
    if (data.status === 'queued') progress = 10;
    else if (data.status === 'in_progress') progress = 50;

    // Still processing
    return {
      result: {
        type: 'pending',
        status: data.status || 'processing',
        content: '',
        taskId: taskId,
        progress: progress,
      }
    };
  } catch (err) {
    return { 
      result: { type: 'pending', status: 'processing', content: '', taskId },
      error: String(err) 
    };
  }
}

// Combined function for backwards compatibility
export async function generateVideo(
  productDescription: string,
  videoSystemPrompt: string,
  videoConfig: VideoConfig,
  settings: Settings
): Promise<VideoResponse> {
  // Step 1: Generate the video prompt
  const promptResult = await generateVideoPrompt(productDescription, videoSystemPrompt, settings);
  
  if (promptResult.error || !promptResult.prompt) {
    return {
      result: { type: 'text', status: 'failed', content: '' },
      error: promptResult.error || 'Failed to generate video prompt'
    };
  }

  // Step 2: Create video task with Together AI
  const videoResult = await createVideoTask(promptResult.prompt, videoConfig, settings);
  
  // Preserve the generated prompt in the result
  if (videoResult.result) {
    videoResult.result.prompt = promptResult.prompt;
  }

  return videoResult;
}
