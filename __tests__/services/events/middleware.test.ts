import {
  loggingMiddleware,
  errorHandlingMiddleware,
  validationMiddleware,
  performanceMiddleware,
  createRateLimitMiddleware,
  createTransformMiddleware,
  createFilterMiddleware,
  createBatchMiddleware,
  defaultMiddleware
} from '@/services/events/middleware';
import { EventBusError, IEvent } from '@/types/events';

describe('Event Bus Middleware', () => {
  const mockEvent: IEvent = { 
    type: 'test', 
    timestamp: new Date(), 
    source: 'test' 
  };
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loggingMiddleware', () => {
    it('should log event processing', async () => {
      await loggingMiddleware(mockEvent, mockNext);
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Processing event: test'),
        expect.any(Object)
      );
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Completed event: test'),
        expect.any(String)
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log errors', async () => {
      const error = new Error('Test error');
      mockNext.mockRejectedValueOnce(error);
      await expect(loggingMiddleware(mockEvent, mockNext)).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing event: test'),
        error
      );
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
      await expect(validationMiddleware(invalidEvent, mockNext)).rejects.toThrow('Event validation failed');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('performanceMiddleware', () => {
    it('should not log for fast events', async () => {
      await performanceMiddleware(mockEvent, mockNext);
      expect(console.warn).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log for slow events', async () => {
      // Mock a slow event by incrementing the mock time
      for (let i = 0; i < 11; i++) {
        performance.now();
      }
      await performanceMiddleware(mockEvent, mockNext);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow event detected: test')
      );
      expect(mockNext).toHaveBeenCalled();
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
      expect(defaultMiddleware).toHaveLength(5);
      expect(defaultMiddleware).toContain(loggingMiddleware);
      expect(defaultMiddleware).toContain(errorHandlingMiddleware);
      expect(defaultMiddleware).toContain(validationMiddleware);
      expect(defaultMiddleware).toContain(performanceMiddleware);
      expect(defaultMiddleware).toContain(expect.any(Function)); // rate limit middleware
    });
  });
}); 