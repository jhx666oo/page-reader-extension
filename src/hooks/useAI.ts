import { useState, useCallback } from 'react';
import { Settings, AIConfig, DEFAULT_AI_CONFIG } from '@/types';
import { sendToAI } from '@/services/ai';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const sendPrompt = useCallback(async (
    userContent: string,
    settings: Settings,
    aiConfig: AIConfig = DEFAULT_AI_CONFIG
  ) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await sendToAI(userContent, settings, aiConfig);
      
      if (response.error) {
        setError(response.error);
        return null;
      }

      setResult(response.content);
      return response.content;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    result,
    sendPrompt,
    clearResult,
  };
}
