import { liveblocks } from '@/lib/liveblocks';
import { nanoid } from 'nanoid';
import { 
  ILiveblocksService, 
  ServiceResult, 
  ServiceError, 
  LiveblocksConfig,
  RoomAccesses 
} from '@/types/services';

export class LiveblocksService implements ILiveblocksService {
  private static instance: LiveblocksService;

  private constructor() {}

  public static getInstance(): LiveblocksService {
    if (!LiveblocksService.instance) {
      LiveblocksService.instance = new LiveblocksService();
    }
    return LiveblocksService.instance;
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

  async createRoom(roomId: string, options: any): Promise<ServiceResult<any>> {
    try {
      const room = await liveblocks.createRoom(roomId, options);
      return this.createSuccessResult(room);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'CREATE_ROOM_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async getRoom(roomId: string): Promise<ServiceResult<any>> {
    try {
      const room = await liveblocks.getRoom(roomId);
      return this.createSuccessResult(room);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_ROOM_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async updateRoom(roomId: string, updates: any): Promise<ServiceResult<any>> {
    try {
      const room = await liveblocks.updateRoom(roomId, updates);
      return this.createSuccessResult(room);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'UPDATE_ROOM_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async deleteRoom(roomId: string): Promise<ServiceResult<void>> {
    try {
      await liveblocks.deleteRoom(roomId);
      return this.createSuccessResult(undefined);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'DELETE_ROOM_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async getRooms(options: any): Promise<ServiceResult<any>> {
    try {
      const rooms = await liveblocks.getRooms(options);
      return this.createSuccessResult(rooms);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'GET_ROOMS_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  async triggerInboxNotification(notification: any): Promise<ServiceResult<void>> {
    try {
      await liveblocks.triggerInboxNotification(notification);
      return this.createSuccessResult(undefined);
    } catch (error) {
      const serviceError = this.createServiceError(error, 'TRIGGER_NOTIFICATION_FAILED');
      return this.createErrorResult(serviceError);
    }
  }

  getConfig(): LiveblocksConfig {
    return {
      namespace: 'Editor',
      nodes: [],
      onError: (error: Error) => {
        console.error('Liveblocks error:', error);
      },
      theme: {},
      editable: true
    };
  }

  // Utility methods
  generateRoomId(): string {
    return nanoid();
  }

  validateRoomId(roomId: string): boolean {
    return typeof roomId === 'string' && roomId.length > 0;
  }

  validateUserAccess(room: any, userId: string): boolean {
    return Object.keys(room.usersAccesses || {}).includes(userId);
  }
} 