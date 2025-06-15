// Service layer type definitions
export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

// Document Service Types
export interface DocumentMetadata {
  creatorId: string;
  email: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDocumentParams {
  userId: string;
  email: string;
  title?: string;
}

export interface UpdateDocumentParams {
  roomId: string;
  title: string;
}

export interface DocumentAccess {
  email: string;
  userType: 'creator' | 'editor' | 'viewer';
}

export interface ShareDocumentParams {
  roomId: string;
  email: string;
  userType: 'creator' | 'editor' | 'viewer';
  updatedBy: {
    name: string;
    avatar: string;
    email: string;
  };
}

// Collaboration Service Types
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  userType?: 'creator' | 'editor' | 'viewer';
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'permission_changed' | 'document_updated';
  userId: string;
  timestamp: Date;
  data?: any;
}

// Liveblocks Service Types
export interface LiveblocksConfig {
  namespace: string;
  nodes: any[];
  onError: (error: Error) => void;
  theme: any;
  editable: boolean;
}

export interface RoomAccesses {
  [email: string]: ['room:write'] | ['room:read', 'room:presence:write'];
}

// Service Interfaces
export interface IDocumentService {
  createDocument(params: CreateDocumentParams): Promise<ServiceResult<any>>;
  getDocument(roomId: string, userId: string): Promise<ServiceResult<any>>;
  updateDocument(params: UpdateDocumentParams): Promise<ServiceResult<any>>;
  getDocuments(email: string): Promise<ServiceResult<any>>;
  updateDocumentAccess(params: ShareDocumentParams): Promise<ServiceResult<any>>;
  removeCollaborator(roomId: string, email: string): Promise<ServiceResult<any>>;
  deleteDocument(roomId: string): Promise<ServiceResult<void>>;
}

export interface ICollaborationService {
  getCollaborators(roomId: string): Promise<ServiceResult<Collaborator[]>>;
  getActiveCollaborators(roomId: string): Promise<ServiceResult<Collaborator[]>>;
  updateUserPresence(roomId: string, presence: any): Promise<ServiceResult<void>>;
  subscribeToCollaborationEvents(roomId: string, callback: (event: CollaborationEvent) => void): () => void;
}

export interface ILiveblocksService {
  createRoom(roomId: string, options: any): Promise<ServiceResult<any>>;
  getRoom(roomId: string): Promise<ServiceResult<any>>;
  updateRoom(roomId: string, updates: any): Promise<ServiceResult<any>>;
  deleteRoom(roomId: string): Promise<ServiceResult<void>>;
  getRooms(options: any): Promise<ServiceResult<any>>;
  triggerInboxNotification(notification: any): Promise<ServiceResult<void>>;
  getConfig(): LiveblocksConfig;
} 