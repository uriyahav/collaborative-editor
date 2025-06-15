// Service layer exports
export { LiveblocksService } from './liveblocks/LiveblocksService';
export { DocumentService } from './documents/DocumentService';
export { CollaborationService } from './collaboration/CollaborationService';

// Service types
export type {
  ServiceError,
  ServiceResult,
  IDocumentService,
  ICollaborationService,
  ILiveblocksService,
  CreateDocumentParams,
  UpdateDocumentParams,
  ShareDocumentParams,
  DocumentMetadata,
  Collaborator,
  CollaborationEvent
} from '@/types/services'; 