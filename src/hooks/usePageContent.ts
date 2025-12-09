import { useState, useCallback } from 'react';
import { PageContent } from '@/types';

export function usePageContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPageContent = useCallback(async (): Promise<PageContent | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTENT' });
      if (response?.success) {
        return response.data;
      }
      setError(response?.error || 'Failed to get page content');
      return null;
    } catch (err) {
      setError(String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSelectedText = useCallback(async (): Promise<string | null> => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SELECTED_TEXT' });
      return response?.data?.selectedText || null;
    } catch {
      return null;
    }
  }, []);

  return { loading, error, getPageContent, getSelectedText };
}
