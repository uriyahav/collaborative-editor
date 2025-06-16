import { EventBus } from '@/services/events/EventBus';
import { IEvent, EventBusError } from '@/types/events';
import {
  loggingMiddleware,
  errorHandlingMiddleware,
  validationMiddleware,
  performanceMiddleware,
  defaultMiddleware,
  createRateLimitMiddleware,
  createTransformMiddleware,
  createFilterMiddleware,
  createBatchMiddleware
} from '@/services/events/middleware';

describe('Event Bus Middleware', () => {
  let mockEvent: IEvent;
  let mockNext: jest.Mock;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockEvent = {
      type: 'test',
      timestamp: new Date(),
      source: 'test'
    };
    mockNext = jest.fn().mockResolvedValue(undefined);
    consoleSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('loggingMiddleware', () => {
    it('should log event processing', async () => {
      await loggingMiddleware(mockEvent, mockNext);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing event: test'),
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed event: test (100.00ms)')
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      const error = new Error('Test error');
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockNext.mockRejectedValueOnce(error);
      await expect(loggingMiddleware(mockEvent, mockNext)).rejects.toThrow(error);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing event: test'),
        error
      );
      errorSpy.mockRestore();
    });
  });

  describe('errorHandlingMiddleware', () => {
    it('should pass through successful events', async () => {
      await errorHandlingMiddleware(mockEvent, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should wrap non-EventBusError errors', async () => {
      const error = new Error('Test error');
      mockNext.mockRejectedValueOnce(error);
      await expect(errorHandlingMiddleware(mockEvent, mockNext)).rejects.toThrow(EventBusError);
    });

    it('should not wrap EventBusError errors', async () => {
      const error = new EventBusError('Test error', 'TEST_ERROR', mockEvent);
      mockNext.mockRejectedValueOnce(error);
      await expect(errorHandlingMiddleware(mockEvent, mockNext)).rejects.toThrow(error);
    });
  });

  describe('validationMiddleware', () => {
    it('should pass valid events', async () => {
      await validationMiddleware(mockEvent, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid events', async () => {
      const invalidEvent = { type: 'test' } as any;
      await expect(validationMiddleware(invalidEvent, mockNext)).rejects.toThrow('Event timestamp must be a Date');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('performanceMiddleware', () => {
    it('should not log for fast events', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await performanceMiddleware(mockEvent, mockNext);
      expect(warnSpy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should log for slow events', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalPerformanceNow = performance.now;
      performance.now = jest.fn(() => 0).mockReturnValueOnce(0).mockReturnValueOnce( 200 );
      mockNext.mockImplementation(() => new Promise(resolve => (setTimeout(resolve, 100))));
      await performanceMiddleware(mockEvent, mockNext);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Slow event detected: test'));
      expect(mockNext).toHaveBeenCalled();
      warnSpy.mockRestore();
      performance.now = originalPerformanceNow;
    });
  });

  describe('createRateLimitMiddleware', () => {
    it('should allow events within rate limit', async () => {
      const middleware = createRateLimitMiddleware(2);
      await middleware(mockEvent, mockNext);
      await middleware(mockEvent, mockNext);
      expect(mockNext).toHaveBeenCalledTimes(2);
    });

    it('should reject events exceeding rate limit', async () => {
      const middleware = createRateLimitMiddleware(2);
      await middleware(mockEvent, mockNext);
      await middleware(mockEvent, mockNext);
      await expect(middleware(mockEvent, mockNext)).rejects.toThrow('Rate limit exceeded');
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('createTransformMiddleware', () => {
    it('should transform events', async () => {
      const transform = jest.fn().mockImplementation(event => ({
        ...event,
        metadata: { transformed: true }
      }));
      const middleware = createTransformMiddleware(transform);
      await middleware(mockEvent, mockNext);
      expect(transform).toHaveBeenCalledWith(mockEvent);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createFilterMiddleware', () => {
    it('should pass events matching predicate', async () => {
      const middleware = createFilterMiddleware(event => event.type === 'test');
      await middleware(mockEvent, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should filter events not matching predicate', async () => {
      const middleware = createFilterMiddleware(event => event.type === 'other');
      await middleware(mockEvent, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('createBatchMiddleware', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should batch events up to batch size', async () => {
      const processBatch = jest.fn();
      const middleware = createBatchMiddleware(2, 1000);
      const events = Array.from({ length: 3 }, (_, i) => ({
        ...mockEvent,
        timestamp: new Date(Date.now() + i)
      }));

      for (const event of events) {
        await middleware(event, mockNext);
      }

      // Fast-forward time to trigger batch processing
      jest.advanceTimersByTime(1000);

      expect(mockNext).toHaveBeenCalledTimes(3);
    });

    it('should process batch on timeout', async () => {
      const middleware = createBatchMiddleware(10, 1000);
      await middleware(mockEvent, mockNext);
      jest.advanceTimersByTime(1000);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('defaultMiddleware', () => {
    it('should include all default middleware', () => {
      expect(defaultMiddleware).toContainEqual(loggingMiddleware);
      expect(defaultMiddleware).toContainEqual(errorHandlingMiddleware);
      expect(defaultMiddleware).toContainEqual(validationMiddleware);
      expect(defaultMiddleware).toContainEqual(performanceMiddleware);
      expect(defaultMiddleware).toHaveLength(5); // Including rate limit middleware
    });
  });
}); 