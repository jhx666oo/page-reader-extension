import { useState, useEffect, useCallback } from 'react';
import { 
  Session, 
  SessionState, 
  MediaItem, 
  PageContent, 
  AIConfig, 
  VideoConfig,
  createDefaultSession,
  DEFAULT_AI_CONFIG,
  DEFAULT_VIDEO_CONFIG
} from '@/types';

const STORAGE_KEY = 'page_reader_sessions';

// Load sessions from Chrome storage
async function loadSessionsFromStorage(): Promise<SessionState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      return result[STORAGE_KEY] as SessionState;
    }
  } catch (error) {
    console.error('[useSession] Failed to load sessions:', error);
  }
  
  // Return default state with one session
  const defaultSession = createDefaultSession('Default Session');
  return {
    sessions: [defaultSession],
    activeSessionId: defaultSession.id,
  };
}

// Save sessions to Chrome storage
async function saveSessionsToStorage(state: SessionState): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    console.log('[useSession] Sessions saved:', state.sessions.length);
  } catch (error) {
    console.error('[useSession] Failed to save sessions:', error);
  }
}

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Load sessions on mount
  useEffect(() => {
    loadSessionsFromStorage().then(state => {
      setSessions(state.sessions);
      setActiveSessionId(state.activeSessionId);
      setIsLoading(false);
    });
  }, []);

  // Save sessions when they change
  useEffect(() => {
    if (!isLoading && sessions.length > 0) {
      saveSessionsToStorage({ sessions, activeSessionId });
    }
  }, [sessions, activeSessionId, isLoading]);

  // Create a new session
  const createSession = useCallback((name?: string): Session => {
    const newSession = createDefaultSession(name);
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  // Switch to a session
  const switchSession = useCallback((sessionId: string) => {
    if (sessions.some(s => s.id === sessionId)) {
      setActiveSessionId(sessionId);
    }
  }, [sessions]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);
      
      // If we deleted the active session, switch to the first one
      if (sessionId === activeSessionId && newSessions.length > 0) {
        setActiveSessionId(newSessions[0].id);
      } else if (newSessions.length === 0) {
        // Create a new default session if all sessions are deleted
        const defaultSession = createDefaultSession('Default Session');
        setActiveSessionId(defaultSession.id);
        return [defaultSession];
      }
      
      return newSessions;
    });
  }, [activeSessionId]);

  // Rename a session
  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId 
        ? { ...s, name: newName, updatedAt: Date.now() }
        : s
    ));
  }, []);

  // Update active session's page content
  const updatePageContent = useCallback((pageContent: PageContent) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            pageContent,
            pageUrl: pageContent.url,
            pageTitle: pageContent.title,
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Update active session's AI config
  const updateAIConfig = useCallback((config: Partial<AIConfig>) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            aiConfig: { ...s.aiConfig, ...config },
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Update active session's video config
  const updateVideoConfig = useCallback((config: Partial<VideoConfig>) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            videoConfig: { ...s.videoConfig, ...config },
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Add a media item to the active session's library
  const addMediaItem = useCallback((item: Omit<MediaItem, 'id' | 'createdAt'>): MediaItem => {
    const newItem: MediaItem = {
      ...item,
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };
    
    if (activeSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { 
              ...s, 
              mediaLibrary: [newItem, ...s.mediaLibrary],
              updatedAt: Date.now()
            }
          : s
      ));
    }
    
    return newItem;
  }, [activeSessionId]);

  // Remove a media item from the active session's library
  const removeMediaItem = useCallback((itemId: string) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            mediaLibrary: s.mediaLibrary.filter(m => m.id !== itemId),
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Rename a media item
  const renameMediaItem = useCallback((itemId: string, newName: string) => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            mediaLibrary: s.mediaLibrary.map(m => 
              m.id === itemId ? { ...m, name: newName } : m
            ),
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Clear media library for active session
  const clearMediaLibrary = useCallback(() => {
    if (!activeSessionId) return;
    
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { 
            ...s, 
            mediaLibrary: [],
            updatedAt: Date.now()
          }
        : s
    ));
  }, [activeSessionId]);

  // Get media library for active session
  const mediaLibrary = activeSession?.mediaLibrary || [];

  // Get AI config for active session
  const aiConfig = activeSession?.aiConfig || DEFAULT_AI_CONFIG;

  // Get video config for active session
  const videoConfig = activeSession?.videoConfig || DEFAULT_VIDEO_CONFIG;

  // Get page content for active session
  const pageContent = activeSession?.pageContent || null;

  return {
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    
    // Page content
    pageContent,
    updatePageContent,
    
    // Config management
    aiConfig,
    updateAIConfig,
    videoConfig,
    updateVideoConfig,
    
    // Media library
    mediaLibrary,
    addMediaItem,
    removeMediaItem,
    renameMediaItem,
    clearMediaLibrary,
  };
}
