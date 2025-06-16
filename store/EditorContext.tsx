import { createContext, useContext, useCallback, useReducer, useEffect, ReactNode } from 'react';
import { useEventBus } from '@/hooks/useEventBus';
import { ServiceError } from '@/types/services';

// Types
interface EditorState {
  content: string | null;
  selection: { start: number; end: number } | null;
  settings: {
    theme: 'light' | 'dark';
    fontSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
  };
  loading: boolean;
  error: ServiceError | null;
}

type EditorAction =
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_SELECTION'; payload: { start: number; end: number } }
  | { type: 'SET_SETTINGS'; payload: Partial<EditorState['settings']> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ServiceError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: EditorState = {
  content: null,
  selection: null,
  settings: {
    theme: 'light',
    fontSize: 14,
    wordWrap: true,
    lineNumbers: true,
  },
  loading: false,
  error: null,
};

// Context
interface EditorContextType extends EditorState {
  setContent: (content: string) => void;
  setSelection: (selection: { start: number; end: number }) => void;
  updateSettings: (settings: Partial<EditorState['settings']>) => void;
  clearError: () => void;
  resetState: () => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

// Reducer
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CONTENT':
      return { ...state, content: action.payload, error: null };
    case 'SET_SELECTION':
      return { ...state, selection: action.payload, error: null };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload }, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

// Provider
interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const { emit } = useEventBus();

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem('editorSettings', JSON.stringify(state.settings));
  }, [state.settings]);

  // Load persisted settings
  useEffect(() => {
    const persistedSettings = localStorage.getItem('editorSettings');
    if (persistedSettings) {
      try {
        const settings = JSON.parse(persistedSettings);
        dispatch({ type: 'SET_SETTINGS', payload: settings });
      } catch (error) {
        console.error('Failed to load persisted editor settings:', error);
        localStorage.removeItem('editorSettings');
      }
    }
  }, []);

  const setContent = useCallback((content: string) => {
    dispatch({ type: 'SET_CONTENT', payload: content });
    emit({
      type: 'EDITOR_CONTENT_UPDATED',
      payload: { content },
      timestamp: new Date(),
      source: 'EditorContext',
    });
  }, [emit]);

  const setSelection = useCallback((selection: { start: number; end: number }) => {
    dispatch({ type: 'SET_SELECTION', payload: selection });
    emit({
      type: 'EDITOR_SELECTION_UPDATED',
      payload: { selection },
      timestamp: new Date(),
      source: 'EditorContext',
    });
  }, [emit]);

  const updateSettings = useCallback((settings: Partial<EditorState['settings']>) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
    emit({
      type: 'EDITOR_SETTINGS_UPDATED',
      payload: { settings },
      timestamp: new Date(),
      source: 'EditorContext',
    });
  }, [emit]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    localStorage.removeItem('editorSettings');
  }, []);

  const value = {
    ...state,
    setContent,
    setSelection,
    updateSettings,
    clearError,
    resetState,
  };

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}

// Hook
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
} 