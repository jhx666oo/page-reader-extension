import { useState, useEffect, useCallback } from 'react';
import { Settings, DEFAULT_SETTINGS } from '@/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response?.success) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: newSettings });
      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, updateSettings, reloadSettings: loadSettings };
}

