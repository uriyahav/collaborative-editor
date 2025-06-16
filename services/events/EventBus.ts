import {
  IEventBus,
  IEvent,
  EventHandler,
  EventMiddleware,
  EventSubscription,
  EventSubscriptionOptions,
  EventBusError,
  EventBusStats,
  EventValidator,
  EventValidationResult,
  EventBusConfig
} from '@/types/events';

/**
 * EventBus Service
 * A singleton service that implements a publish-subscribe pattern with middleware support.
 * Following OOP principles with clear separation of concerns and SOLID principles.
 */
export class EventBus implements IEventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventHandler>>;
  private middleware: EventMiddleware[];
  private validators: Map<string, EventValidator>;
  private stats: EventBusStats;
  private config: Required<EventBusConfig>;

  private constructor(config: EventBusConfig = {}) {
    this.handlers = new Map();
    this.middleware = [];
    this.validators = new Map();
    this.stats = {
      totalEventsEmitted: 0,
      activeSubscriptions: 0,
      middlewareCount: 0,
      eventTypes: [],
      errors: []
    };
    this.config = {
      enableLogging: config.enableLogging ?? true,
      enableValidation: config.enableValidation ?? true,
      defaultMiddleware: config.defaultMiddleware ?? [],
      maxListeners: config.maxListeners ?? 10
    };

    // Add default middleware if provided
    if (this.config.defaultMiddleware.length > 0) {
      this.config.defaultMiddleware.forEach(middleware => this.use(middleware));
    }
  }

  /**
   * Get the singleton instance of EventBus
   */
  public static getInstance(config?: EventBusConfig): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus(config);
    }
    return EventBus.instance;
  }

  /**
   * Emit an event to all subscribers
   * @throws {EventBusError} If event validation fails or middleware chain fails
   */
  public async emit<T extends IEvent>(event: T): Promise<void> {
    try {
      // Built-in validation (same as validation middleware)
      if (this.config.enableValidation) {
        // Built-in validation
        const { validateEvent } = await import('@/services/events/middleware');
        const builtInValidation = validateEvent(event);
        if (!builtInValidation.isValid) {
          throw new EventBusError(
            `Event validation failed: ${builtInValidation.errors?.join(', ')}`,
            'VALIDATION_ERROR',
            event
          );
        }
        // Custom validator
        const validator = this.validators.get(event.type);
        if (validator) {
          const validationResult = validator(event);
          if (!validationResult.isValid) {
            throw new EventBusError(
              `Event validation failed: ${validationResult.errors?.join(', ')}`,
              'VALIDATION_ERROR',
              event
            );
          }
        }
      }

      // Run middleware chain
      await this.runMiddlewareChain(event);

      // Get handlers for this event type
      const handlers = this.handlers.get(event.type);
      if (!handlers) {
        return;
      }

      // Call all handlers
      const promises = Array.from(handlers).map(handler => {
        try {
          return Promise.resolve(handler(event));
        } catch (error) {
          const eventError = new EventBusError(
            'Handler execution failed',
            'HANDLER_ERROR',
            event,
            error instanceof Error ? error : new Error(String(error))
          );
          this.stats.errors.push(eventError);
          throw eventError;
        }
      });

      await Promise.all(promises);

      // Update stats
      this.stats.totalEventsEmitted++;
      if (!this.stats.eventTypes.includes(event.type)) {
        this.stats.eventTypes.push(event.type);
      }

      // Log if enabled
      if (this.config.enableLogging) {
        console.debug(`[EventBus] Emitted event: ${event.type}`, event);
      }
    } catch (error) {
      const eventError = new EventBusError(
        'Event emission failed',
        'EMIT_ERROR',
        event,
        error instanceof Error ? error : new Error(String(error))
      );
      this.stats.errors.push(eventError);
      throw eventError;
    }
  }

  /**
   * Subscribe to an event type
   * @throws {EventBusError} If max listeners exceeded
   */
  public subscribe<T extends IEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options: EventSubscriptionOptions = {}
  ): EventSubscription {
    // Check max listeners
    const handlers = this.handlers.get(eventType) ?? new Set();
    if (handlers.size >= this.config.maxListeners) {
      throw new EventBusError(
        `Max listeners (${this.config.maxListeners}) exceeded for event type: ${eventType}`,
        'MAX_LISTENERS_EXCEEDED'
      );
    }

    // Add handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as EventHandler);

    // Update stats
    this.stats.activeSubscriptions++;
    if (!this.stats.eventTypes.includes(eventType)) {
      this.stats.eventTypes.push(eventType);
    }

    // Create subscription object
    const subscription: EventSubscription = {
      eventType,
      handler: handler as EventHandler,
      unsubscribe: () => this.unsubscribe({ eventType, handler: handler as EventHandler, unsubscribe: () => {} })
    };

    // Handle 'once' option
    if (options.once) {
      const originalHandler = handler;
      const wrappedHandler: EventHandler<T> = async (event: T) => {
        await originalHandler(event);
        this.unsubscribe({ eventType, handler: wrappedHandler as EventHandler, unsubscribe: () => {} });
      };
      this.handlers.get(eventType)!.delete(handler as EventHandler);
      this.handlers.get(eventType)!.add(wrappedHandler as EventHandler);
      subscription.handler = wrappedHandler as EventHandler;
      subscription.unsubscribe = () => this.unsubscribe({ eventType, handler: wrappedHandler as EventHandler, unsubscribe: () => {} });
    }

    // Handle timeout option
    if (options.timeout) {
      const originalHandler = handler;
      const wrappedHandler: EventHandler<T> = async (event: T) => {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new EventBusError('Handler timeout', 'HANDLER_TIMEOUT', event)), options.timeout);
        });
        await Promise.race([originalHandler(event), timeoutPromise]);
      };
      this.handlers.get(eventType)!.delete(handler as EventHandler);
      this.handlers.get(eventType)!.add(wrappedHandler as EventHandler);
      subscription.handler = wrappedHandler as EventHandler;
      subscription.unsubscribe = () => this.unsubscribe({ eventType, handler: wrappedHandler as EventHandler, unsubscribe: () => {} });
    }

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug(`[EventBus] New subscription for event: ${eventType}`);
    }

    return subscription;
  }

  /**
   * Unsubscribe from an event
   */
  public unsubscribe(subscription: EventSubscription): void {
    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      handlers.delete(subscription.handler);
      if (handlers.size === 0) {
        this.handlers.delete(subscription.eventType);
      }
      this.stats.activeSubscriptions = Math.max(0, this.stats.activeSubscriptions - 1);
    }

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug(`[EventBus] Unsubscribed from event: ${subscription.eventType}`);
    }
  }

  /**
   * Add middleware to the event bus
   */
  public use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
    this.stats.middlewareCount++;

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug('[EventBus] Added middleware');
    }
  }

  /**
   * Remove middleware from the event bus
   */
  public removeMiddleware(middleware: EventMiddleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      this.stats.middlewareCount--;

      // Log if enabled
      if (this.config.enableLogging) {
        console.debug('[EventBus] Removed middleware');
      }
    }
  }

  /**
   * Add a validator for an event type
   */
  public addValidator<T extends IEvent>(eventType: string, validator: EventValidator<T>): void {
    this.validators.set(eventType, validator as EventValidator);

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug(`[EventBus] Added validator for event: ${eventType}`);
    }
  }

  /**
   * Remove a validator for an event type
   */
  public removeValidator(eventType: string): void {
    this.validators.delete(eventType);

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug(`[EventBus] Removed validator for event: ${eventType}`);
    }
  }

  /**
   * Get current event bus statistics
   */
  public getStats(): EventBusStats {
    return { ...this.stats };
  }

  /**
   * Clear all subscriptions and reset stats
   */
  public clear(): void {
    this.handlers.clear();
    this.stats = {
      totalEventsEmitted: 0,
      activeSubscriptions: 0,
      middlewareCount: this.middleware.length,
      eventTypes: [],
      errors: []
    };

    // Log if enabled
    if (this.config.enableLogging) {
      console.debug('[EventBus] Cleared all subscriptions and reset stats');
    }
  }

  /**
   * Run the middleware chain for an event
   * @private
   */
  private async runMiddlewareChain(event: IEvent): Promise<void> {
    const runMiddleware = async (index: number): Promise<void> => {
      if (index === this.middleware.length) {
        return;
      }

      const middleware = this.middleware[index];
      await middleware(event, () => runMiddleware(index + 1));
    };

    await runMiddleware(0);
  }
} 