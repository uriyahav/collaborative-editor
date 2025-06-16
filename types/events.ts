/**
 * Event Bus Type Definitions
 * Following OOP principles with clear interfaces and type safety
 */

// Base event interface that all events must implement
export interface IEvent {
  type: string;
  timestamp: Date;
  source: string;
  metadata?: Record<string, unknown>;
}

// Event metadata for tracking and debugging
export interface EventMetadata {
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  [key: string]: unknown;
}

// Event handler type
export type EventHandler<T extends IEvent = IEvent> = (event: T) => Promise<void> | void;

// Event middleware type
export type EventMiddleware = (event: IEvent, next: () => Promise<void>) => Promise<void>;

// Event validation result
export interface EventValidationResult {
  isValid: boolean;
  errors?: string[];
}

// Event validator type
export type EventValidator<T extends IEvent = IEvent> = (event: T) => EventValidationResult;

// Event bus configuration
export interface EventBusConfig {
  enableLogging?: boolean;
  enableValidation?: boolean;
  defaultMiddleware?: EventMiddleware[];
  maxListeners?: number;
}

// Event subscription options
export interface EventSubscriptionOptions {
  once?: boolean;
  filter?: (event: IEvent) => boolean;
  timeout?: number;
}

// Event subscription
export interface EventSubscription {
  unsubscribe: () => void;
  eventType: string;
  handler: EventHandler;
}

// Event bus error
export class EventBusError extends Error {
  constructor(
    message: string,
    public code: string,
    public event?: IEvent,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'EventBusError';
  }
}

// Event bus statistics
export interface EventBusStats {
  totalEventsEmitted: number;
  activeSubscriptions: number;
  middlewareCount: number;
  eventTypes: string[];
  errors: EventBusError[];
}

// Event bus interface
export interface IEventBus {
  // Core event bus methods
  emit<T extends IEvent>(event: T): Promise<void>;
  subscribe<T extends IEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventSubscriptionOptions
  ): EventSubscription;
  unsubscribe(subscription: EventSubscription): void;
  
  // Middleware management
  use(middleware: EventMiddleware): void;
  removeMiddleware(middleware: EventMiddleware): void;
  
  // Event validation
  addValidator<T extends IEvent>(eventType: string, validator: EventValidator<T>): void;
  removeValidator(eventType: string): void;
  
  // Utility methods
  getStats(): EventBusStats;
  clear(): void;
}

// Specific event types for our application
export interface CollaborationEvent extends IEvent {
  type: 'user_joined' | 'user_left' | 'permission_changed' | 'document_updated';
  userId: string;
  data?: unknown;
}

export interface DocumentEvent extends IEvent {
  type: 'document_created' | 'document_updated' | 'document_deleted';
  documentId: string;
  userId: string;
  data?: unknown;
}

export interface PresenceEvent extends IEvent {
  type: 'presence_updated' | 'presence_removed';
  userId: string;
  roomId: string;
  data?: unknown;
}

// Event type registry for type safety
export type AppEvent = CollaborationEvent | DocumentEvent | PresenceEvent;

// Event type guard functions
export const isCollaborationEvent = (event: IEvent): event is CollaborationEvent => {
  return ['user_joined', 'user_left', 'permission_changed', 'document_updated'].includes(event.type);
};

export const isDocumentEvent = (event: IEvent): event is DocumentEvent => {
  return ['document_created', 'document_updated', 'document_deleted'].includes(event.type);
};

export const isPresenceEvent = (event: IEvent): event is PresenceEvent => {
  return ['presence_updated', 'presence_removed'].includes(event.type);
}; 