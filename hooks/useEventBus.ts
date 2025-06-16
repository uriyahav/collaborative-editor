import { useEffect, useCallback, useRef } from 'react';
import { EventBus } from '@/services/events/EventBus';
import { IEvent, EventHandler, EventSubscription, EventSubscriptionOptions } from '@/types/events';

/**
 * Hook for using the EventBus in React components
 * Provides a type-safe way to subscribe to and emit events
 */
export function useEventBus() {
  const eventBus = useRef(EventBus.getInstance());
  const subscriptions = useRef<EventSubscription[]>([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptions.current.forEach(subscription => subscription.unsubscribe());
      subscriptions.current = [];
    };
  }, []);

  /**
   * Subscribe to an event type
   * @param eventType The type of event to subscribe to
   * @param handler The event handler function
   * @param options Optional subscription options (once, timeout)
   * @returns A function to unsubscribe from the event
   */
  const subscribe = useCallback(<T extends IEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options?: EventSubscriptionOptions
  ) => {
    const subscription = eventBus.current.subscribe(eventType, handler, options);
    subscriptions.current.push(subscription);
    return () => {
      subscription.unsubscribe();
      subscriptions.current = subscriptions.current.filter(sub => sub !== subscription);
    };
  }, []);

  /**
   * Emit an event
   * @param event The event to emit
   */
  const emit = useCallback(<T extends IEvent>(event: T) => {
    return eventBus.current.emit(event);
  }, []);

  /**
   * Add middleware to the event bus
   * @param middleware The middleware function to add
   */
  const useMiddleware = useCallback((middleware: (event: IEvent, next: () => Promise<void>) => Promise<void>) => {
    useEffect(() => {
      eventBus.current.use(middleware);
      return () => {
        eventBus.current.removeMiddleware(middleware);
      };
    }, [middleware]);
  }, []);

  /**
   * Add a validator for an event type
   * @param eventType The type of event to validate
   * @param validator The validator function
   */
  const addValidator = useCallback(<T extends IEvent>(
    eventType: string,
    validator: (event: T) => { isValid: boolean; errors?: string[] }
  ) => {
    useEffect(() => {
      eventBus.current.addValidator(eventType, validator as any);
      return () => {
        eventBus.current.removeValidator(eventType);
      };
    }, [eventType, validator]);
  }, []);

  /**
   * Get current event bus statistics
   */
  const getStats = useCallback(() => {
    return eventBus.current.getStats();
  }, []);

  return {
    subscribe,
    emit,
    useMiddleware,
    addValidator,
    getStats
  };
}

/**
 * Hook for subscribing to a specific event type
 * @param eventType The type of event to subscribe to
 * @param handler The event handler function
 * @param options Optional subscription options
 */
export function useEventSubscription<T extends IEvent>(
  eventType: string,
  handler: EventHandler<T>,
  options?: EventSubscriptionOptions
) {
  const { subscribe } = useEventBus();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler, options);
    return unsubscribe;
  }, [eventType, handler, options, subscribe]);
}

/**
 * Hook for using middleware in a component
 * @param middleware The middleware function to use
 */
export function useEventMiddleware(middleware: (event: IEvent, next: () => Promise<void>) => Promise<void>) {
  const { useMiddleware } = useEventBus();
  useMiddleware(middleware);
}

/**
 * Hook for adding a validator in a component
 * @param eventType The type of event to validate
 * @param validator The validator function
 */
export function useEventValidator<T extends IEvent>(
  eventType: string,
  validator: (event: T) => { isValid: boolean; errors?: string[] }
) {
  const { addValidator } = useEventBus();
  addValidator(eventType, validator);
} 