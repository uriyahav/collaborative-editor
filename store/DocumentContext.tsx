import { createContext, useContext, useCallback, useReducer, useEffect, ReactNode } from 'react';
import { DocumentMetadata, ServiceError } from '@/types/services';
import { DocumentService } from '@/services/documents/DocumentService';
import { useEventBus } from '@/hooks/useEventBus';

// Types
interface DocumentState {
  documents: DocumentMetadata[] | null;
  currentDocument: DocumentMetadata | null;
  loading: boolean;
  error: ServiceError | null;
}

type DocumentAction =
  | { type: 'SET_DOCUMENTS'; payload: DocumentMetadata[] }
  | { type: 'SET_CURRENT_DOCUMENT'; payload: DocumentMetadata }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ServiceError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: DocumentState = {
  documents: null,
  currentDocument: null,
  loading: false,
  error: null,
};

// Context
interface DocumentContextType extends DocumentState {
  getDocuments: (email: string) => Promise<void>;
  getDocument: (roomId: string, userId: string) => Promise<void>;
  createDocument: (params: any) => Promise<void>;
  updateDocument: (params: any) => Promise<void>;
  deleteDocument: (roomId: string) => Promise<void>;
  clearError: () => void;
  resetState: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

// Reducer
function documentReducer(state: DocumentState, action: DocumentAction): DocumentState {
  switch (action.type) {
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload, error: null };
    case 'SET_CURRENT_DOCUMENT':
      return { ...state, currentDocument: action.payload, error: null };
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
interface DocumentProviderProps {
  children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
  const [state, dispatch] = useReducer(documentReducer, initialState);
  const documentService = DocumentService.getInstance();
  const { emit } = useEventBus();

  // Persist state to localStorage
  useEffect(() => {
    if (state.currentDocument) {
      localStorage.setItem('currentDocument', JSON.stringify(state.currentDocument));
    }
  }, [state.currentDocument]);

  // Load persisted state
  useEffect(() => {
    const persistedDocument = localStorage.getItem('currentDocument');
    if (persistedDocument) {
      try {
        const document = JSON.parse(persistedDocument);
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: document });
      } catch (error) {
        console.error('Failed to load persisted document:', error);
        localStorage.removeItem('currentDocument');
      }
    }
  }, []);

  const getDocuments = useCallback(async (email: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await documentService.getDocuments(email);
      if (result.success) {
        dispatch({ type: 'SET_DOCUMENTS', payload: result.data });
        emit({ type: 'DOCUMENTS_LOADED', payload: result.data, timestamp: new Date(), source: 'DocumentContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'DOCUMENTS_ERROR', payload: result.error, timestamp: new Date(), source: 'DocumentContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to fetch documents', code: 'FETCH_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [documentService, emit]);

  const getDocument = useCallback(async (roomId: string, userId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await documentService.getDocument(roomId, userId);
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: result.data });
        emit({ type: 'DOCUMENT_LOADED', payload: result.data, timestamp: new Date(), source: 'DocumentContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'DOCUMENT_ERROR', payload: result.error, timestamp: new Date(), source: 'DocumentContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to fetch document', code: 'FETCH_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [documentService, emit]);

  const createDocument = useCallback(async (params: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await documentService.createDocument(params);
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: result.data });
        emit({ type: 'DOCUMENT_CREATED', payload: result.data, timestamp: new Date(), source: 'DocumentContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'DOCUMENT_ERROR', payload: result.error, timestamp: new Date(), source: 'DocumentContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to create document', code: 'CREATE_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [documentService, emit]);

  const updateDocument = useCallback(async (params: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await documentService.updateDocument(params);
      if (result.success) {
        dispatch({ type: 'SET_CURRENT_DOCUMENT', payload: result.data });
        emit({ type: 'DOCUMENT_UPDATED', payload: result.data, timestamp: new Date(), source: 'DocumentContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'DOCUMENT_ERROR', payload: result.error, timestamp: new Date(), source: 'DocumentContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to update document', code: 'UPDATE_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [documentService, emit]);

  const deleteDocument = useCallback(async (roomId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await documentService.deleteDocument(roomId);
      if (result.success) {
        dispatch({ type: 'RESET_STATE' });
        emit({ type: 'DOCUMENT_DELETED', payload: { roomId }, timestamp: new Date(), source: 'DocumentContext' });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error! });
        emit({ type: 'DOCUMENT_ERROR', payload: result.error, timestamp: new Date(), source: 'DocumentContext' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: { message: 'Failed to delete document', code: 'DELETE_ERROR', timestamp: new Date() } });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [documentService, emit]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    localStorage.removeItem('currentDocument');
  }, []);

  const value = {
    ...state,
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    clearError,
    resetState,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

// Hook
export function useDocument() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
} 