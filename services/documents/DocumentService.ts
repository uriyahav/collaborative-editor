import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { 
  IDocumentService, 
  ServiceResult, 
  ServiceError,
  CreateDocumentParams,
  UpdateDocumentParams,
  ShareDocumentParams,
  DocumentMetadata
} from '@/types/services';
import { LiveblocksService } from '../liveblocks/LiveblocksService';
import { getAccessType, parseStringify } from '@/lib/utils';

export class DocumentService implements IDocumentService {
  private static instance: DocumentService;
  private liveblocksService: LiveblocksService;

  private constructor() {
    this.liveblocksService = LiveblocksService.getInstance();
  }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
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

  async createDocument(params: CreateDocumentParams): Promise<ServiceResult<any>> {
    try {
      const roomId = this.liveblocksService.generateRoomId();
      
      const metadata: DocumentMetadata = {
        creatorId: params.userId,
        email: params.email,
        title: params.title || 'Untitled',
        createdAt: new Date()
      };

      const usersAccesses = {
        [params.email]: ['room:write'] as const
      };

      const roomResult = await this.liveblocksService.createRoom(roomId, {
        metadata,
        usersAccesses,
        defaultAccesses: []
      });

      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      revalidatePath('/');
      return this.createSuccessResult(parseStringify(roomResult.data));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'CREATE_DOCUMENT_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async getDocument(roomId: string, userId: string): Promise<ServiceResult<any>> {
    try {
      const roomResult = await this.liveblocksService.getRoom(roomId);
      
      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      const room = roomResult.data;
      const hasAccess = this.liveblocksService.validateUserAccess(room, userId);
      
      if (!hasAccess) {
        const accessError = this.createServiceError(
          new Error('You do not have access to this document'),
          'ACCESS_DENIED'
        );
        return this.createErrorResult(accessError);
      }

      return this.createSuccessResult(parseStringify(room));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_DOCUMENT_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async updateDocument(params: UpdateDocumentParams): Promise<ServiceResult<any>> {
    try {
      const roomResult = await this.liveblocksService.updateRoom(params.roomId, {
        metadata: {
          title: params.title
        }
      });

      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      revalidatePath(`/documents/${params.roomId}`);
      return this.createSuccessResult(parseStringify(roomResult.data));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'UPDATE_DOCUMENT_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async getDocuments(email: string): Promise<ServiceResult<any>> {
    try {
      const roomsResult = await this.liveblocksService.getRooms({ userId: email });
      
      if (!roomsResult.success) {
        return this.createErrorResult(roomsResult.error!);
      }

      return this.createSuccessResult(parseStringify(roomsResult.data));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_DOCUMENTS_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async updateDocumentAccess(params: ShareDocumentParams): Promise<ServiceResult<any>> {
    try {
      const usersAccesses = {
        [params.email]: getAccessType(params.userType)
      };

      const roomResult = await this.liveblocksService.updateRoom(params.roomId, { 
        usersAccesses
      });

      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      // Send notification
      const notificationId = this.liveblocksService.generateRoomId();
      const notificationResult = await this.liveblocksService.triggerInboxNotification({
        userId: params.email,
        kind: '$documentAccess',
        subjectId: notificationId,
        activityData: {
          userType: params.userType,
          title: `You have been granted ${params.userType} access to the document by ${params.updatedBy.name}`,
          updatedBy: params.updatedBy.name,
          avatar: params.updatedBy.avatar,
          email: params.updatedBy.email
        },
        roomId: params.roomId
      });

      if (!notificationResult.success) {
        console.warn('Failed to send notification:', notificationResult.error);
      }

      revalidatePath(`/documents/${params.roomId}`);
      return this.createSuccessResult(parseStringify(roomResult.data));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'UPDATE_DOCUMENT_ACCESS_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async removeCollaborator(roomId: string, email: string): Promise<ServiceResult<any>> {
    try {
      const roomResult = await this.liveblocksService.getRoom(roomId);
      
      if (!roomResult.success) {
        return this.createErrorResult(roomResult.error!);
      }

      const room = roomResult.data;
      if (room.metadata.email === email) {
        const selfRemovalError = this.createServiceError(
          new Error('You cannot remove yourself from the document'),
          'SELF_REMOVAL_NOT_ALLOWED'
        );
        return this.createErrorResult(selfRemovalError);
      }

      const updateResult = await this.liveblocksService.updateRoom(roomId, {
        usersAccesses: {
          [email]: null
        }
      });

      if (!updateResult.success) {
        return this.createErrorResult(updateResult.error!);
      }

      revalidatePath(`/documents/${roomId}`);
      return this.createSuccessResult(parseStringify(updateResult.data));
    } catch (error) {
      const serviceError = this.createServiceError(error, 'REMOVE_COLLABORATOR_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async deleteDocument(roomId: string): Promise<ServiceResult<void>> {
    try {
      const deleteResult = await this.liveblocksService.deleteRoom(roomId);
      
      if (!deleteResult.success) {
        return this.createErrorResult(deleteResult.error!);
      }

      revalidatePath('/');
      redirect('/');
      return this.createSuccessResult(undefined);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'DELETE_DOCUMENT_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  // Utility methods
  validateDocumentTitle(title: string): boolean {
    return typeof title === 'string' && title.trim().length > 0;
  }

  sanitizeDocumentTitle(title: string): string {
    return title.trim().substring(0, 100); // Limit to 100 characters
  }
} 