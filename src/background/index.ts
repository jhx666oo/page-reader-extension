// Service Worker - Background Script
import { Settings, ChromeMessage } from '@/types';
import { getSettings, saveSettings } from '@/utils/storage';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Page Reader extension installed');
});

chrome.runtime.onMessage.addListener((message: ChromeMessage, _sender, sendResponse) => {
  (async () => {
    try {
      const result = await handleMessage(message);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
  })();
  return true;
});

async function handleMessage(message: ChromeMessage): Promise<unknown> {
    switch (message.type) {
    case 'GET_SETTINGS': {
        const settings = await getSettings();
      return { success: true, data: settings };
    }

    case 'SAVE_SETTINGS': {
        await saveSettings(message.payload as Partial<Settings>);
      return { success: true };
        }

      case 'GET_PAGE_CONTENT':
    case 'GET_SELECTED_TEXT': {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0]?.id) {
        return { success: false, error: 'No active tab' };
        }
      
      const tabUrl = tabs[0].url || '';
      if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
        return { success: false, error: 'Cannot read browser internal pages' };
      }
      
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { type: message.type });
        return { success: true, data: response };
      } catch {
        return { success: false, error: 'Please refresh the page and try again' };
      }
    }

    default:
      return { success: false, error: 'Unknown message type' };
    }
  }

console.log('[Background] Page Reader started');
