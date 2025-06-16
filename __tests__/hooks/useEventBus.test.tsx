import { renderHook, act } from '@testing-library/react';
import { useEventBus, useEventSubscription, useEventMiddleware, useEventValidator } from '@/hooks/useEventBus';
import { EventBus } from '@/services/events/EventBus';
import { IEvent } from '@/types/events';

describe('EventBus Hooks', () => {
  beforeEach(() => {
    // Clear the singleton instance before each test
    (EventBus as any).instance = undefined;
  });

  describe('useEventBus', () => {
    it('should provide event bus functionality', async () => {
      const { result } = renderHook(() => useEventBus());
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      // Test subscribe
      const unsubscribe = result.current.subscribe('test', handler);
      await act(async () => {
        await result.current.emit(event);
      });
      expect(handler).toHaveBeenCalledWith(event);

      // Test unsubscribe
      unsubscribe();
      await act(async () => {
        await result.current.emit(event);
      });
      expect(handler).toHaveBeenCalledTimes(1);

      // Test getStats
      const stats = result.current.getStats();
      expect(stats.totalEventsEmitted).toBe(2);
      expect(stats.activeSubscriptions).toBe(0);
    });

    it('should clean up subscriptions on unmount', async () => {
      const { result, unmount } = renderHook(() => useEventBus());
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      result.current.subscribe('test', handler);
      unmount();

      await act(async () => {
        await result.current.emit(event);
      });
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle middleware', async () => {
      const { result } = renderHook(() => useEventBus());
      const middleware = jest.fn().mockImplementation((event, next) => next());
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      act(() => {
        result.current.useMiddleware(middleware);
      });

      await act(async () => {
        await result.current.emit(event);
      });

      expect(middleware).toHaveBeenCalledWith(event, expect.any(Function));
    });

    it('should handle validators', async () => {
      const { result } = renderHook(() => useEventBus());
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Validation failed'] });
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };

      act(() => {
        result.current.addValidator('test', validator);
      });

      await expect(act(async () => {
        await result.current.emit(event);
      })).rejects.toThrow('Validation failed');

      expect(validator).toHaveBeenCalledWith(event);
    });
  });

  describe('useEventSubscription', () => {
    it('should subscribe to events', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const { result: eventBus } = renderHook(() => useEventBus());

      renderHook(() => useEventSubscription('test', handler));

      await act(async () => {
        await eventBus.current.emit(event);
      });

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should unsubscribe on unmount', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const { result: eventBus } = renderHook(() => useEventBus());

      const { unmount } = renderHook(() => useEventSubscription('test', handler));
      unmount();

      await act(async () => {
        await eventBus.current.emit(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle subscription options', async () => {
      const handler = jest.fn();
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const { result: eventBus } = renderHook(() => useEventBus());

      renderHook(() => useEventSubscription('test', handler, { once: true }));

      await act(async () => {
        await eventBus.current.emit(event);
        await eventBus.current.emit(event);
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('useEventMiddleware', () => {
    it('should add and remove middleware', async () => {
      const middleware = jest.fn().mockImplementation((event, next) => next());
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const { result: eventBus } = renderHook(() => useEventBus());

      const { unmount } = renderHook(() => useEventMiddleware(middleware));

      await act(async () => {
        await eventBus.current.emit(event);
      });

      expect(middleware).toHaveBeenCalledWith(event, expect.any(Function));

      unmount();

      await act(async () => {
        await eventBus.current.emit(event);
      });

      // Middleware should not be called after unmount
      expect(middleware).toHaveBeenCalledTimes(1);
    });
  });

  describe('useEventValidator', () => {
    it('should add and remove validators', async () => {
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Validation failed'] });
      const event: IEvent = { type: 'test', timestamp: new Date(), source: 'test' };
      const { result: eventBus } = renderHook(() => useEventBus());

      const { unmount } = renderHook(() => useEventValidator('test', validator));

      await expect(act(async () => {
        await eventBus.current.emit(event);
      })).rejects.toThrow('Validation failed');

      expect(validator).toHaveBeenCalledWith(event);

      unmount();

      // Event should pass after validator is removed
      await expect(act(async () => {
        await eventBus.current.emit(event);
      })).resolves.not.toThrow();
    });
  });
}); 