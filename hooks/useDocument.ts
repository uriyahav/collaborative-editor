import { useCallback, useState } from 'react';
import type {
  DocumentMetadata,
  ServiceError,
  CreateDocumentParams,
  UpdateDocumentParams,
  ShareDocumentParams,
  IDocumentService,
  ServiceResult
} from '@/types/services';
import { DocumentService } from '@/services';

/**
 * Custom React hook for document CRUD and sharing operations.
 * Uses the DocumentService singleton for all business logic.
 */
export function useDocument() {
  const service: IDocumentService = DocumentService.getInstance();

  // State for async operations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[] | null>(null);
  const [document, setDocument] = useState<DocumentMetadata | null>(null);

  /** Fetch all documents for a user */
  const getDocuments = useCallback(async (email: string) => {
    setLoading(true); setError(null);
    const result = await service.getDocuments(email);
    setLoading(false);
    if (result.success) setDocuments(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Fetch a single document by roomId and userId */
  const getDocument = useCallback(async (roomId: string, userId: string) => {
    setLoading(true); setError(null);
    const result = await service.getDocument(roomId, userId);
    setLoading(false);
    if (result.success) setDocument(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Create a new document */
  const createDocument = useCallback(async (params: CreateDocumentParams) => {
    setLoading(true); setError(null);
    const result = await service.createDocument(params);
    setLoading(false);
    if (result.success) setDocument(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Update a document's title */
  const updateDocument = useCallback(async (params: UpdateDocumentParams) => {
    setLoading(true); setError(null);
    const result = await service.updateDocument(params);
    setLoading(false);
    if (result.success) setDocument(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Delete a document by roomId */
  const deleteDocument = useCallback(async (roomId: string) => {
    setLoading(true); setError(null);
    const result = await service.deleteDocument(roomId);
    setLoading(false);
    if (!result.success) setError(result.error!);
    return result;
  }, [service]);

  /** Share a document with another user */
  const shareDocument = useCallback(async (params: ShareDocumentParams) => {
    setLoading(true); setError(null);
    const result = await service.updateDocumentAccess(params);
    setLoading(false);
    if (result.success) setDocument(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Remove a collaborator from a document */
  const removeCollaborator = useCallback(async (roomId: string, email: string) => {
    setLoading(true); setError(null);
    const result = await service.removeCollaborator(roomId, email);
    setLoading(false);
    if (result.success) setDocument(result.data);
    else setError(result.error!);
    return result;
  }, [service]);

  return {
    loading,
    error,
    documents,
    document,
    getDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    removeCollaborator,
  };
}

export type { DocumentMetadata, ServiceError, CreateDocumentParams, UpdateDocumentParams, ShareDocumentParams }; 