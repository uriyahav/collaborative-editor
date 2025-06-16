import { EventMiddleware, IEvent, EventBusError, EventValidationResult } from '@/types/events';

/**
 * Logging middleware that logs all events passing through the event bus
 */
export const loggingMiddleware: EventMiddleware = async (event: IEvent, next) => {
  const startTime = performance.now();
  try {
    console.debug(`[EventBus] Processing event: ${event.type}`, {
      timestamp: event.timestamp,
      source: event.source,
      metadata: event.metadata
    });
    await next();
    const duration = performance.now() - startTime;
    console.debug(`[EventBus] Completed event: ${event.type} (${duration.toFixed(2)}ms)`);
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[EventBus] Error processing event: ${event.type} (${duration.toFixed(2)}ms)`, error);
    throw error;
  }
};

/**
 * Error handling middleware that catches and formats errors
 */
export const errorHandlingMiddleware: EventMiddleware = async (event: IEvent, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof EventBusError) {
      throw error;
    }
    throw new EventBusError(
      'Middleware chain error',
      'MIDDLEWARE_ERROR',
      event,
      error instanceof Error ? error : new Error(String(error))
    );
  }
};

/**
 * Validation middleware that ensures required event properties are present
 */
export const validationMiddleware: EventMiddleware = async (event: IEvent, next) => {
  const validationResult = validateEvent(event);
  if (!validationResult.isValid) {
    throw new EventBusError(
      `Event validation failed: ${validationResult.errors?.join(', ')}`,
      'VALIDATION_ERROR',
      event
    );
  }
  await next();
};

/**
 * Performance monitoring middleware that tracks event processing time
 */
export const performanceMiddleware: EventMiddleware = async (event: IEvent, next) => {
  const startTime = performance.now();
  try {
    await next();
  } finally {
    const duration = performance.now() - startTime;
    if (duration > 1000) { // Log slow events (over 1 second)
      console.warn(`[EventBus] Slow event detected: ${event.type} (${duration.toFixed(2)}ms)`);
    }
  }
};

/**
 * Rate limiting middleware that prevents event flooding
 */
export const createRateLimitMiddleware = (maxEventsPerSecond: number = 100): EventMiddleware => {
  const eventTimestamps: number[] = [];
  const windowSize = 1000; // 1 second window

  return async (event: IEvent, next) => {
    const now = Date.now();
    // Remove timestamps outside the window
    while (eventTimestamps.length > 0 && now - eventTimestamps[0] > windowSize) {
      eventTimestamps.shift();
    }

    // Check if we're over the rate limit
    if (eventTimestamps.length >= maxEventsPerSecond) {
      throw new EventBusError(
        `Rate limit exceeded: ${maxEventsPerSecond} events per second`,
        'RATE_LIMIT_EXCEEDED',
        event
      );
    }

    eventTimestamps.push(now);
    await next();
  };
};

/**
 * Event validation function that checks required properties
 */
function validateEvent(event: IEvent): EventValidationResult {
  const errors: string[] = [];

  if (!event.type) {
    errors.push('Event type is required');
  }
  if (!event.timestamp) {
    errors.push('Event timestamp is required');
  }
  if (!event.source) {
    errors.push('Event source is required');
  }
  if (typeof event.timestamp !== 'number') {
    errors.push('Event timestamp must be a number');
  }
  if (typeof event.source !== 'string') {
    errors.push('Event source must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Create a middleware that transforms events before they are processed
 */
export const createTransformMiddleware = <T extends IEvent>(
  transform: (event: T) => Promise<T> | T
): EventMiddleware => {
  return async (event: IEvent, next) => {
    const transformedEvent = await transform(event as T);
    await next();
  };
};

/**
 * Create a middleware that filters events based on a predicate
 */
export const createFilterMiddleware = <T extends IEvent>(
  predicate: (event: T) => boolean
): EventMiddleware => {
  return async (event: IEvent, next) => {
    if (predicate(event as T)) {
      await next();
    }
  };
};

/**
 * Create a middleware that batches events for processing
 */
export const createBatchMiddleware = <T extends IEvent>(
  batchSize: number = 10,
  batchTimeout: number = 1000
): EventMiddleware => {
  let batch: T[] = [];
  let timeout: NodeJS.Timeout | null = null;

  const processBatch = async (events: T[]) => {
    if (events.length > 0) {
      // Process the batch
      console.debug(`[EventBus] Processing batch of ${events.length} events`);
      // Here you would typically emit a batch event or process the events in bulk
      batch = [];
    }
  };

  return async (event: IEvent, next) => {
    batch.push(event as T);

    if (batch.length >= batchSize) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      await processBatch(batch);
    } else if (!timeout) {
      timeout = setTimeout(async () => {
        await processBatch(batch);
        timeout = null;
      }, batchTimeout);
    }

    await next();
  };
};

/**
 * Default middleware configuration
 */
export const defaultMiddleware: EventMiddleware[] = [
  loggingMiddleware,
  errorHandlingMiddleware,
  validationMiddleware,
  performanceMiddleware,
  createRateLimitMiddleware(100)
]; 