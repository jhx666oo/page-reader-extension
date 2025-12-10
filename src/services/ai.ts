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

// POE API uses unified chat/completions endpoint for all models including video
// Reference: https://creator.poe.com/docs/poe-api-overview
// Video models return video URLs in message.content

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
  console.log('[Video Prompt] ========== GENERATING VIDEO PROMPT ==========');
  console.log('[Video Prompt] Using Text AI to generate video prompt');
  console.log('[Video Prompt] Text API Base URL:', settings.baseUrl);
  console.log('[Video Prompt] Model:', settings.model);
  
  if (!settings.apiKey) {
    console.error('[Video Prompt] API Key not configured');
    return { prompt: '', error: 'API Key not configured. Please add your POE API key in Settings.' };
  }

  const promptMessages: AIMessage[] = [
    { role: 'system', content: videoSystemPrompt },
    { role: 'user', content: productDescription }
  ];

  try {
    const textApiUrl = `${settings.baseUrl}/chat/completions`;
    console.log('[Video Prompt] Calling Text API:', textApiUrl);
    
    const response = await fetch(textApiUrl, {
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

    console.log('[Video Prompt] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Video Prompt] Error response:', errorText.substring(0, 500));
      try {
        const error = JSON.parse(errorText);
        return { prompt: '', error: error.error?.message || `Prompt API Error: ${response.status}` };
      } catch {
        return { prompt: '', error: `Prompt API Error: ${response.status} - ${response.statusText}` };
      }
    }

    const data = await response.json();
    const generatedPrompt = data.choices?.[0]?.message?.content || '';
    console.log('[Video Prompt] Generated prompt length:', generatedPrompt.length, 'chars');
    console.log('[Video Prompt] SUCCESS - Video prompt generated');
    return { prompt: generatedPrompt };
  } catch (err) {
    console.error('[Video Prompt] Exception:', err);
    return { prompt: '', error: String(err) };
  }
}

// Parse video URL from POE model response
// Video models may return URLs in different formats:
// 1. Direct URL: https://...mp4
// 2. Markdown: ![video](https://...mp4) or [video](https://...)
// 3. JSON: {"video_url": "https://..."}
// 4. Plain text with URL embedded
function parseVideoUrlFromResponse(content: string): string | null {
  if (!content) return null;
  
  console.log('[Video Parse] Parsing response for video URL...');
  console.log('[Video Parse] Content length:', content.length, 'chars');
  console.log('[Video Parse] Content preview:', content.substring(0, 500));
  
  // Try to parse as JSON first
  try {
    const json = JSON.parse(content);
    if (json.video_url) return json.video_url;
    if (json.url) return json.url;
    if (json.videoUrl) return json.videoUrl;
    if (json.data?.video_url) return json.data.video_url;
    if (json.result?.url) return json.result.url;
  } catch {
    // Not JSON, continue with other methods
  }
  
  // Try to find video URL patterns
  const videoUrlPatterns = [
    // Direct video URLs
    /https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mov|avi|mkv)(?:\?[^\s"'<>]*)?/gi,
    // URLs in markdown format
    /\[.*?\]\((https?:\/\/[^\s)]+\.(?:mp4|webm|mov)(?:\?[^\s)]*)?)\)/gi,
    // URLs in image/video markdown
    /!\[.*?\]\((https?:\/\/[^\s)]+)\)/gi,
    // General HTTPS URLs (fallback)
    /https?:\/\/[^\s"'<>]+/gi,
  ];
  
  for (const pattern of videoUrlPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Extract URL from markdown if needed
      let url = matches[0];
      const markdownMatch = url.match(/\((https?:\/\/[^)]+)\)/);
      if (markdownMatch) {
        url = markdownMatch[1];
      }
      console.log('[Video Parse] Found URL:', url);
      return url;
    }
  }
  
  console.log('[Video Parse] No video URL found in response');
  return null;
}

// Create video using POE Chat API
// POE uses unified chat/completions endpoint for all models
// Reference: https://creator.poe.com/docs/poe-api-overview
export async function createVideoTask(
  prompt: string,
  videoConfig: VideoConfig,
  settings: Settings
): Promise<VideoResponse> {
  if (!settings.apiKey) {
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: 'API Key not configured. Please add your POE API key in Settings.' 
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
    console.log('[Video API] ========== POE VIDEO GENERATION REQUEST ==========');
    console.log('[Video API] Using POE Chat Completions API');
    console.log('[Video API] Base URL:', settings.baseUrl);
    console.log('[Video API] Video Model:', videoConfig.model);
    console.log('[Video API] Prompt length:', prompt.length, 'chars');
    
    // Build the video generation prompt with parameters
    // Include video settings in the prompt for the video model
    let videoPrompt = prompt;
    
    // Add video parameters to the prompt
    const videoParams = [];
    if (videoConfig.duration) {
      videoParams.push(`Duration: ${videoConfig.duration} seconds`);
    }
    if (videoConfig.width && videoConfig.height) {
      videoParams.push(`Resolution: ${videoConfig.width}x${videoConfig.height}`);
      const aspectRatio = videoConfig.width > videoConfig.height ? 'landscape (16:9)' : 
                          videoConfig.width < videoConfig.height ? 'portrait (9:16)' : 'square (1:1)';
      videoParams.push(`Aspect ratio: ${aspectRatio}`);
    }
    
    if (videoParams.length > 0) {
      videoPrompt = `${prompt}\n\n[Video Parameters: ${videoParams.join(', ')}]`;
    }
    
    // Add reference image if configured
    const messages: AIMessage[] = [];
    
    if (videoConfig.useImageReference && videoConfig.referenceImageUrl && modelConfig.supportsImageReference) {
      // Use multimodal format with image
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: videoPrompt },
          { 
            type: 'image_url', 
            image_url: { url: videoConfig.referenceImageUrl } 
          }
        ]
      });
      console.log('[Video API] Including reference image:', videoConfig.referenceImageUrl);
    } else {
      messages.push({
        role: 'user',
        content: videoPrompt
      });
    }

    const requestBody = {
      model: videoConfig.model,
      messages: messages,
      temperature: 0.7,
    };

    console.log('[Video API] Request model:', requestBody.model);
    console.log('[Video API] Calling POE API:', `${settings.baseUrl}/chat/completions`);
    
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('[Video API] Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('[Video API] Response body:', responseText.substring(0, 1000));

    if (!response.ok) {
      let errorMessage = `POE API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData);
      } catch {
        errorMessage = responseText || errorMessage;
      }
      console.error('[Video API] Error:', errorMessage);
      return { 
        result: { type: 'text', status: 'failed', content: prompt, prompt },
        error: errorMessage 
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return { 
        result: { type: 'text', status: 'failed', content: prompt, prompt },
        error: 'Invalid response from POE API' 
      };
    }
    
    const responseContent = data.choices?.[0]?.message?.content || '';
    console.log('[Video API] Response content:', responseContent.substring(0, 500));

    // Try to parse video URL from the response
    const videoUrl = parseVideoUrlFromResponse(responseContent);
    
    if (videoUrl) {
      console.log('[Video API] SUCCESS - Video URL found:', videoUrl);
      return {
        result: {
          type: 'video',
          status: 'completed',
          content: responseContent,
          videoUrl: videoUrl,
          duration: videoConfig.duration,
          prompt: prompt,
          progress: 100,
        }
      };
    }
    
    // No video URL found - return the text content
    // This might happen if the model doesn't support video or returns text instead
    console.log('[Video API] No video URL found, returning text response');
    return {
      result: {
        type: 'text',
        status: 'completed',
        content: responseContent,
        prompt: prompt,
        progress: 100,
      }
    };
  } catch (err) {
    console.error('[Video API] Exception:', err);
    return { 
      result: { type: 'text', status: 'failed', content: prompt, prompt },
      error: String(err) 
    };
  }
}

// Poll video task status - Not needed for POE API (synchronous)
// Kept for API compatibility
export async function pollVideoTask(
  taskId: string,
  _settings: Settings // Unused - POE API is synchronous
): Promise<VideoResponse> {
  // POE API is synchronous, no polling needed
  // This function is kept for API compatibility
  console.log('[Video API] pollVideoTask called but POE API is synchronous');
  return {
    result: {
      type: 'text',
      status: 'completed',
      content: 'POE API does not require polling - responses are synchronous',
      taskId: taskId,
      progress: 100,
    }
  };
}

// Combined function for video generation
// Step 1: Generate video prompt using text model
// Step 2: Call video model with the prompt
export async function generateVideo(
  productDescription: string,
  videoSystemPrompt: string,
  videoConfig: VideoConfig,
  settings: Settings
): Promise<VideoResponse> {
  console.log('[generateVideo] ========== VIDEO GENERATION STARTED ==========');
  console.log('[generateVideo] Step 1: Generating video prompt using Text AI...');
  
  // Step 1: Generate the video prompt using text AI
  const promptResult = await generateVideoPrompt(productDescription, videoSystemPrompt, settings);
  
  if (promptResult.error || !promptResult.prompt) {
    console.error('[generateVideo] Step 1 FAILED:', promptResult.error);
    return {
      result: { type: 'text', status: 'failed', content: '' },
      error: promptResult.error || 'Failed to generate video prompt'
    };
  }
  
  console.log('[generateVideo] Step 1 SUCCESS - Prompt generated');
  console.log('[generateVideo] Step 2: Calling POE Video Model...');
  console.log('[generateVideo] Video Model:', videoConfig.model);

  // Step 2: Call the video model with the generated prompt
  const videoResult = await createVideoTask(promptResult.prompt, videoConfig, settings);
  
  console.log('[generateVideo] Step 2 Result:', videoResult.error ? 'FAILED' : 'SUCCESS');
  if (videoResult.error) {
    console.error('[generateVideo] Step 2 Error:', videoResult.error.substring(0, 200));
  }
  
  // Preserve the generated prompt in the result
  if (videoResult.result) {
    videoResult.result.prompt = promptResult.prompt;
  }

  return videoResult;
}
