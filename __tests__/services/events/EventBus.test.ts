import { EventBus } from '@/services/events/EventBus';
import { EventBusError, IEvent } from '@/types/events';
import {
  loggingMiddleware,
  errorHandlingMiddleware,
  validationMiddleware,
  performanceMiddleware,
  createRateLimitMiddleware,
  createTransformMiddleware,
  createFilterMiddleware,
  createBatchMiddleware
} from '@/services/events/middleware';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    // Clear the singleton instance before each test
    (EventBus as any).instance = undefined;
    eventBus = EventBus.getInstance();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when getInstance is called multiple times', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should allow configuration only on first instantiation', () => {
      const instance1 = EventBus.getInstance({ enableLogging: false });
      const instance2 = EventBus.getInstance({ enableLogging: true });
      expect(instance1).toBe(instance2);
      // The second config should be ignored
      expect(eventBus.getStats().totalEventsEmitted).toBe(0);
    });
  });

  describe('Event Emission and Subscription', () => {
    it('should emit events to subscribers', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.subscribe('test', handler);
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
      expect(eventBus.getStats().totalEventsEmitted).toBe(1);
    });

    it('should handle multiple subscribers', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.subscribe('test', handler1);
      eventBus.subscribe('test', handler2);
      await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(eventBus.getStats().activeSubscriptions).toBe(2);
    });

    it('should unsubscribe handlers', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      const subscription = eventBus.subscribe('test', handler);
      subscription.unsubscribe();
      await eventBus.emit(event);

      expect(handler).not.toHaveBeenCalled();
      expect(eventBus.getStats().activeSubscriptions).toBe(0);
    });

    it('should handle once subscriptions', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.subscribe('test', handler, { once: true });
      await eventBus.emit(event);
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(eventBus.getStats().activeSubscriptions).toBe(0);
    });

    it('should handle timeout options', async () => {
      const handler = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.subscribe('test', handler, { timeout: 50 });
      await expect(eventBus.emit(event)).rejects.toThrow('Handler timeout');
    });

    it('should throw when max listeners exceeded', () => {
      const maxListeners = 2;
      const eventBus = EventBus.getInstance({ maxListeners });

      for (let i = 0; i < maxListeners; i++) {
        eventBus.subscribe('test', () => {});
      }

      expect(() => {
        eventBus.subscribe('test', () => {});
      }).toThrow('Max listeners exceeded');
    });
  });

  describe('Middleware', () => {
    it('should process events through middleware chain', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const middleware = jest.fn().mockImplementation((event, next) => next());

      eventBus.use(middleware);
      eventBus.subscribe('test', handler);
      await eventBus.emit(event);

      expect(middleware).toHaveBeenCalledWith(event, expect.any(Function));
      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle middleware errors', async () => {
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const error = new Error('Middleware error');
      const middleware = jest.fn().mockRejectedValue(error);

      eventBus.use(middleware);
      await expect(eventBus.emit(event)).rejects.toThrow('Middleware chain error');
    });

    it('should support rate limiting', async () => {
      const rateLimitMiddleware = createRateLimitMiddleware(2);
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.use(rateLimitMiddleware);
      await eventBus.emit(event);
      await eventBus.emit(event);
      await expect(eventBus.emit(event)).rejects.toThrow('Rate limit exceeded');
    });

    it('should support event transformation', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const transformMiddleware = createTransformMiddleware(e => ({
        ...e,
        metadata: { transformed: true }
      }));

      eventBus.use(transformMiddleware);
      eventBus.subscribe('test', handler);
      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        metadata: { transformed: true }
      }));
    });

    it('should support event filtering', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const filterMiddleware = createFilterMiddleware(e => e.type === 'test');

      eventBus.use(filterMiddleware);
      eventBus.subscribe('test', handler);
      await eventBus.emit(event);
      await eventBus.emit({ ...event, type: 'other' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support event batching', async () => {
      const handler = jest.fn();
      const events: IEvent[] = Array.from({ length: 3 }, (_, i) => ({
        type: 'test',
        timestamp: new Date(Date.now() + i),
        source: 'test'
      }));
      const batchMiddleware = createBatchMiddleware(2, 100);

      eventBus.use(batchMiddleware);
      eventBus.subscribe('test', handler);

      for (const event of events) {
        await eventBus.emit(event);
      }

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('Validation', () => {
    it('should validate event properties', async () => {
      const invalidEvent = { type: 'test' } as any;
      await expect(eventBus.emit(invalidEvent)).rejects.toThrow('Event validation failed');

      const validEvent: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      await expect(eventBus.emit(validEvent)).resolves.not.toThrow();
    });

    it('should support custom validators', async () => {
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Custom validation failed'] });

      eventBus.addValidator('test', validator);
      await expect(eventBus.emit(event)).rejects.toThrow('Custom validation failed');
      expect(validator).toHaveBeenCalledWith(event);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors', async () => {
      const error = new Error('Handler error');
      const handler = jest.fn().mockRejectedValue(error);
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.subscribe('test', handler);
      await expect(eventBus.emit(event)).rejects.toThrow('Handler execution failed');
      expect(eventBus.getStats().errors).toHaveLength(1);
    });

    it('should handle middleware errors', async () => {
      const error = new Error('Middleware error');
      const middleware = jest.fn().mockRejectedValue(error);
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      eventBus.use(middleware);
      await expect(eventBus.emit(event)).rejects.toThrow('Middleware chain error');
      expect(eventBus.getStats().errors).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    it('should track event statistics', async () => {
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const handler = jest.fn();

      eventBus.subscribe('test', handler);
      await eventBus.emit(event);

      const stats = eventBus.getStats();
      expect(stats.totalEventsEmitted).toBe(1);
      expect(stats.activeSubscriptions).toBe(1);
      expect(stats.eventTypes).toContain('test');
    });

    it('should clear statistics', async () => {
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const handler = jest.fn();

      eventBus.subscribe('test', handler);
      await eventBus.emit(event);
      eventBus.clear();

      const stats = eventBus.getStats();
      expect(stats.totalEventsEmitted).toBe(0);
      expect(stats.activeSubscriptions).toBe(0);
      expect(stats.eventTypes).toHaveLength(0);
    });
  });
}); 