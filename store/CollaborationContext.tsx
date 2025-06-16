import { createContext, useContext, useCallback, useReducer, useEffect, ReactNode } from 'react';
import { Collaborator, CollaborationEvent, ServiceError } from '@/types/services';
import { CollaborationService } from '@/services/collaboration/CollaborationService';
import { useEventBus } from '@/hooks/useEventBus';

// Types
interface CollaborationState {
  collaborators: Collaborator[] | null;
  activeCollaborators: Collaborator[] | null;
  loading: boolean;
  error: ServiceError | null;
  presence: Record<string, any> | null;
}

type CollaborationAction =
  | { type: 'SET_COLLABORATORS'; payload: Collaborator[] }
  | { type: 'SET_ACTIVE_COLLABORATORS'; payload: Collaborator[] }
  | { type: 'SET_PRESENCE'; payload: Record<string, any> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ServiceError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: CollaborationState = {
  collaborators: null,
  activeCollaborators: null,
  loading: false,
  error: null,
  presence: null,
};

// Context
interface CollaborationContextType extends CollaborationState {
  getCollaborators: (roomId: string) => Promise<void>;
  getActiveCollaborators: (roomId: string) => Promise<void>;
  updateUserPresence: (roomId: string, presence: any) => Promise<void>;
  clearError: () => void;
  resetState: () => void;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

// Reducer
function collaborationReducer(state: CollaborationState, action: CollaborationAction): CollaborationState {
  switch (action.type) {
    case 'SET_COLLABORATORS':
      return { ...state, collaborators: action.payload, error: null };
    case 'SET_ACTIVE_COLLABORATORS':
      return { ...state, activeCollaborators: action.payload, error: null };
    case 'SET_PRESENCE':
      return { ...state, presence: action.payload, error: null };
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
interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const [state, dispatch] = useReducer(collaborationReducer, initialState);
  const collaborationService = CollaborationService.getInstance();
  const { emit } = useEventBus();

  // Persist presence to localStorage
  useEffect(() => {
    if (state.presence) {
      localStorage.setItem('collaborationPresence', JSON.stringify(state.presence));
    }
  }, [state.presence]);

  // Load persisted presence
  useEffect(() => {
    const persistedPresence = localStorage.getItem('collaborationPresence');
    if (persistedPresence) {
      try {
        const presence = JSON.parse(persistedPresence);
        dispatch({ type: 'SET_PRESENCE', payload: presence });
      } catch (error) {
        console.error('Failed to load persisted presence:', error);
        localStorage.removeItem('collaborationPresence');
      }
    }
  }, []);

  const getCollaborators = useCallback(async (roomId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await collaborationService.getCollaborators(roomId);
      if (result.success) {
        dispatch({ type: 'SET_COLLABORATORS', payload: result.data ?? [] });
        emit({ type: 'COLLABORATORS_LOADED', payload: result.data, timestamp: new Date(), source: 'CollaborationContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'COLLABORATION_ERROR', payload: result.error, timestamp: new Date(), source: 'CollaborationContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to fetch collaborators', code: 'FETCH_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [collaborationService, emit]);

  const getActiveCollaborators = useCallback(async (roomId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await collaborationService.getActiveCollaborators(roomId);
      if (result.success) {
        dispatch({ type: 'SET_ACTIVE_COLLABORATORS', payload: result.data ?? [] });
        emit({ type: 'ACTIVE_COLLABORATORS_LOADED', payload: result.data, timestamp: new Date(), source: 'CollaborationContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'COLLABORATION_ERROR', payload: result.error, timestamp: new Date(), source: 'CollaborationContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to fetch active collaborators', code: 'FETCH_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [collaborationService, emit]);

  const updateUserPresence = useCallback(async (roomId: string, presence: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await collaborationService.updateUserPresence(roomId, presence);
      if (result.success) {
        dispatch({ type: 'SET_PRESENCE', payload: presence });
        emit({ type: 'PRESENCE_UPDATED', payload: presence, timestamp: new Date(), source: 'CollaborationContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'COLLABORATION_ERROR', payload: result.error, timestamp: new Date(), source: 'CollaborationContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to update presence', code: 'UPDATE_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [collaborationService, emit]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    localStorage.removeItem('collaborationPresence');
  }, []);

  const value = {
    ...state,
    getCollaborators,
    getActiveCollaborators,
    updateUserPresence,
    clearError,
    resetState,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

// Hook
export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
} 