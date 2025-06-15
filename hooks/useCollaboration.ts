import { useCallback, useState } from 'react';
import type {
  Collaborator,
  CollaborationEvent,
  ServiceError,
  ICollaborationService,
  ServiceResult
} from '@/types/services';
import { CollaborationService } from '@/services';

/**
 * Custom React hook for real-time collaboration features.
 * Uses the CollaborationService singleton for all business logic.
 */
export function useCollaboration() {
  const service: ICollaborationService = CollaborationService.getInstance();

  // State for async operations
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null);
  const [activeCollaborators, setActiveCollaborators] = useState<Collaborator[] | null>(null);

  /** Fetch all collaborators for a room */
  const getCollaborators = useCallback(async (roomId: string) => {
    setLoading(true); setError(null);
    const result = await service.getCollaborators(roomId);
    setLoading(false);
    if (result.success) setCollaborators(result.data ?? []);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Fetch only active (online) collaborators for a room */
  const getActiveCollaborators = useCallback(async (roomId: string) => {
    setLoading(true); setError(null);
    const result = await service.getActiveCollaborators(roomId);
    setLoading(false);
    if (result.success) setActiveCollaborators(result.data ?? []);
    else setError(result.error!);
    return result;
  }, [service]);

  /** Update the current user's presence in a room */
  const updateUserPresence = useCallback(async (roomId: string, presence: any) => {
    setLoading(true); setError(null);
    const result = await service.updateUserPresence(roomId, presence);
    setLoading(false);
    if (!result.success) setError(result.error!);
    return result;
  }, [service]);

  /** Subscribe to real-time collaboration events for a room */
  const subscribeToCollaborationEvents = useCallback((roomId: string, callback: (event: CollaborationEvent) => void) => {
    return service.subscribeToCollaborationEvents(roomId, callback);
  }, [service]);

  /** Share a document with a new user */
  const shareDocument = useCallback(async (params: {
    roomId: string;
    email: string;
    userType: 'creator' | 'editor' | 'viewer';
    updatedBy: any;
  }) => {
    setLoading(true); setError(null);
    const result = await service.shareDocument(params);
    setLoading(false);
    if (!result.success) setError(result.error!);
    return result;
  }, [service]);

  return {
    loading,
    error,
    collaborators,
    activeCollaborators,
    getCollaborators,
    getActiveCollaborators,
    updateUserPresence,
    subscribeToCollaborationEvents,
    shareDocument,
  };
}

export type { Collaborator, CollaborationEvent, ServiceError }; 