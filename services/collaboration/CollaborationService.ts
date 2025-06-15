import { 
  ICollaborationService, 
  ServiceResult, 
  ServiceError,
  Collaborator,
  CollaborationEvent
} from '@/types/services';
import { LiveblocksService } from '../liveblocks/LiveblocksService';
import { getUserColor } from '@/lib/utils';

export class CollaborationService implements ICollaborationService {
  private static instance: CollaborationService;
  private liveblocksService: LiveblocksService;
  private eventSubscribers: Map<string, Set<(event: CollaborationEvent) => void>>;

  private constructor() {
    this.liveblocksService = LiveblocksService.getInstance();
    this.eventSubscribers = new Map();
  }

  public static getInstance(): CollaborationService {
    if (!CollaborationService.instance) {
      CollaborationService.instance = new CollaborationService();
    }
    return CollaborationService.instance;
  }

  private createServiceError(error: any, code: string): ServiceError {
    return {
      code,
      message: error?.message || 'An unknown error occurred',
      details: error,
      timestamp: new Date()
    };
  }

  private createSuccessResult<T>(data: T): ServiceResult<T> {
    return {
      success: true,
      data
    };
  }

  private createErrorResult<T>(error: ServiceError): ServiceResult<T> {
    return {
      success: false,
      error
    };
  }

  async getCollaborators(roomId: string): Promise<ServiceResult<Collaborator[]>> {
    try {
      const roomResult = await this.liveblocksService.getRoom(roomId);
      
      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      const room = roomResult.data;
      const collaborators: Collaborator[] = [];

      // Extract collaborators from room metadata and user accesses
      if (room.usersAccesses) {
        for (const [email, access] of Object.entries(room.usersAccesses)) {
          const userType = this.determineUserType(access);
          const collaborator: Collaborator = {
            id: email, // Using email as ID for now
            name: email.split('@')[0], // Simple name extraction
            email,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=random`,
            color: getUserColor(email),
            userType,
            isOnline: true, // Default to true, will be updated by presence
            lastSeen: new Date()
          };
          collaborators.push(collaborator);
        }
      }

      return this.createSuccessResult(collaborators);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_COLLABORATORS_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async getActiveCollaborators(roomId: string): Promise<ServiceResult<Collaborator[]>> {
    try {
      const collaboratorsResult = await this.getCollaborators(roomId);
      
      if (!collaboratorsResult.success || !collaboratorsResult.data) {
        return this.createErrorResult(collaboratorsResult.error!);
      }

      // Filter to only active collaborators (online)
      const activeCollaborators = collaboratorsResult.data.filter(
        collaborator => collaborator.isOnline
      );

      return this.createSuccessResult(activeCollaborators);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_ACTIVE_COLLABORATORS_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async updateUserPresence(roomId: string, presence: any): Promise<ServiceResult<void>> {
    try {
      // This would typically update the user's presence in the room
      // For now, we'll emit a collaboration event
      const event: CollaborationEvent = {
        type: 'user_joined',
        userId: presence.userId || 'unknown',
        timestamp: new Date(),
        data: presence
      };

      this.emitCollaborationEvent(roomId, event);
      return this.createSuccessResult(undefined);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'UPDATE_USER_PRESENCE_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async shareDocument(params: {
    roomId: string;
    email: string;
    userType: 'creator' | 'editor' | 'viewer';
    updatedBy: any;
  }): Promise<ServiceResult<any>> {
    try {
      const { roomId, email, userType, updatedBy } = params;
      
      // Get access type based on user type
      const accessType = this.getAccessType(userType);
      
      // Update room access
      const roomResult = await this.liveblocksService.updateRoom(roomId, {
        usersAccesses: {
          [email]: accessType
        }
      });

      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      // Send notification to the new collaborator
      const notificationResult = await this.liveblocksService.triggerInboxNotification({
        userId: email,
        kind: '$documentAccess',
        subjectId: this.generateCollaborationId(),
        activityData: {
          userType,
          title: `You have been granted ${userType} access to the document by ${updatedBy.name}`,
          updatedBy: updatedBy.name,
          avatar: updatedBy.avatar,
          email: updatedBy.email
        },
        roomId
      });

      if (!notificationResult.success) {
        console.warn('Failed to send notification:', notificationResult.error);
      }

      // Emit collaboration event
      const event: CollaborationEvent = {
        type: 'user_joined',
        userId: email,
        timestamp: new Date(),
        data: { userType, updatedBy }
      };
      this.emitCollaborationEvent(roomId, event);

      return this.createSuccessResult(roomResult.data);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'SHARE_DOCUMENT_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  subscribeToCollaborationEvents(
    roomId: string, 
    callback: (event: CollaborationEvent) => void
  ): () => void {
    if (!this.eventSubscribers.has(roomId)) {
      this.eventSubscribers.set(roomId, new Set());
    }

    const subscribers = this.eventSubscribers.get(roomId)!;
    subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      const roomSubscribers = this.eventSubscribers.get(roomId);
      if (roomSubscribers) {
        roomSubscribers.delete(callback);
        if (roomSubscribers.size === 0) {
          this.eventSubscribers.delete(roomId);
        }
      }
    };
  }

  private emitCollaborationEvent(roomId: string, event: CollaborationEvent): void {
    const subscribers = this.eventSubscribers.get(roomId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in collaboration event callback:', error);
        }
      });
    }
  }

  private determineUserType(access: any): 'creator' | 'editor' | 'viewer' {
    if (Array.isArray(access)) {
      if (access.includes('room:write')) {
        return 'editor';
      } else if (access.includes('room:read')) {
        return 'viewer';
      }
    }
    return 'viewer'; // Default fallback
  }

  private getAccessType(userType: 'creator' | 'editor' | 'viewer'): string[] {
    switch (userType) {
      case 'creator':
      case 'editor':
        return ['room:write'];
      case 'viewer':
        return ['room:read'];
      default:
        return ['room:read'];
    }
  }

  // Utility methods for collaboration features
  generateCollaborationId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateCollaborator(collaborator: Partial<Collaborator>): boolean {
    return !!(
      collaborator.id &&
      collaborator.email &&
      collaborator.name
    );
  }

  sanitizeCollaboratorName(name: string): string {
    return name.trim().substring(0, 50); // Limit to 50 characters
  }

  // Method to handle user leaving
  handleUserLeft(roomId: string, userId: string): void {
    const event: CollaborationEvent = {
      type: 'user_left',
      userId,
      timestamp: new Date(),
      data: { roomId }
    };
    this.emitCollaborationEvent(roomId, event);
  }

  // Method to handle permission changes
  handlePermissionChanged(roomId: string, userId: string, newPermission: string): void {
    const event: CollaborationEvent = {
      type: 'permission_changed',
      userId,
      timestamp: new Date(),
      data: { newPermission }
    };
    this.emitCollaborationEvent(roomId, event);
  }

  // Method to handle document updates
  handleDocumentUpdated(roomId: string, userId: string, updateData: any): void {
    const event: CollaborationEvent = {
      type: 'document_updated',
      userId,
      timestamp: new Date(),
      data: updateData
    };
    this.emitCollaborationEvent(roomId, event);
  }
} 