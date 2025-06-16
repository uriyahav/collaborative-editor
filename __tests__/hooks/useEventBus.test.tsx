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
    it('should provide event bus instance', () => {
      const { result } = renderHook(() => useEventBus());
      expect(result.current).toHaveProperty('subscribe');
      expect(result.current).toHaveProperty('emit');
      expect(result.current).toHaveProperty('useMiddleware');
      expect(result.current).toHaveProperty('addValidator');
      expect(result.current).toHaveProperty('getStats');
    });

    it('should handle subscriptions', async () => {
      const { result } = renderHook(() => useEventBus());
      const handler = jest.fn();
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      act(() => {
        result.current.subscribe('test', handler);
      });

      await act(async () => {
        await result.current.emit(event);
      });

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should handle middleware', async () => {
      const middleware = jest.fn().mockImplementation((event, next) => next(event));
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };
      function TestComponent() {
        useEventMiddleware(middleware);
        return null;
      }
      renderHook(() => TestComponent());
      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });
      expect(middleware).toHaveBeenCalled();
    });

    it('should handle validators', async () => {
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Validation failed'] });
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };
      function TestComponent() {
        useEventValidator('test', validator);
        return null;
      }
      renderHook(() => TestComponent());
      await act(async () => {
        const eventBus = EventBus.getInstance();
        await expect(eventBus.emit(event)).rejects.toThrow('Event emission failed');
      });
      expect(validator).toHaveBeenCalledWith(event);
    });
  });

  describe('useEventSubscription', () => {
    it('should subscribe to events', async () => {
      const handler = jest.fn();
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventSubscription('test', handler));

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });

      expect(handler).toHaveBeenCalledWith(event);
      unmount();
    });

    it('should unsubscribe on unmount', async () => {
      const handler = jest.fn();
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventSubscription('test', handler));
      unmount();

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('useEventMiddleware', () => {
    it('should add middleware', async () => {
      const middleware = jest.fn().mockImplementation((event, next) => next(event));
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventMiddleware(middleware));

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });

      expect(middleware).toHaveBeenCalled();
      unmount();
    });

    it('should remove middleware on unmount', async () => {
      const middleware = jest.fn().mockImplementation((event, next) => next(event));
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventMiddleware(middleware));
      unmount();

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });

      expect(middleware).not.toHaveBeenCalled();
    });
  });

  describe('useEventValidator', () => {
    it('should add validator', async () => {
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Validation failed'] });
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventValidator('test', validator));

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await expect(eventBus.emit(event)).rejects.toThrow('Event emission failed');
      });

      expect(validator).toHaveBeenCalledWith(event);
      unmount();
    });

    it('should remove validator on unmount', async () => {
      const validator = jest.fn().mockReturnValue({ isValid: false, errors: ['Validation failed'] });
      const event: IEvent = {
        type: 'test',
        timestamp: new Date(),
        source: 'test'
      };

      const { unmount } = renderHook(() => useEventValidator('test', validator));
      unmount();

      await act(async () => {
        const eventBus = EventBus.getInstance();
        await eventBus.emit(event);
      });

      expect(validator).not.toHaveBeenCalled();
    });
  });
}); 