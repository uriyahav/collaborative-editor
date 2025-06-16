// Import the centralized mock
import { mockLiveblocksService, resetLiveblocksMocks, simulateLiveblocksError, simulateLiveblocksSuccess } from '@/__tests__/mocks/services/liveblocks';

// Mock LiveblocksService before any imports
jest.mock('@/services/liveblocks/LiveblocksService', () => ({
  LiveblocksService: mockLiveblocksService,
}));

// Now import the rest of the dependencies
import { render, act, renderHook, waitFor } from '@testing-library/react';
import { EditorProvider, useEditor } from '@/store/EditorContext';
import { EventBus } from '@/services/events/EventBus';
import { ServiceError } from '@/types/services';
import { LiveblocksService } from '@/services/liveblocks/LiveblocksService';

// Mock the services
jest.mock('@/services/events/EventBus');

beforeAll(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.useRealTimers();
});

describe('EditorContext', () => {
  // Define mock data at the top level so it's available in all test blocks
  const mockContent = 'Test content';

  const mockSelection = { start: 0, end: 11 };

  const mockSettings = {
    theme: 'dark' as const,
    fontSize: 16,
    wordWrap: true,
    lineNumbers: true,
  };

  const persistedSettings = {
    theme: 'dark' as const,
    fontSize: 16,
    wordWrap: false,
    lineNumbers: true,
  };

  const mockError: ServiceError = {
    message: 'Test error',
    code: 'TEST_ERROR',
    timestamp: new Date(),
  };

  const originalRemoveItem = localStorage.removeItem;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLiveblocksMocks();
    // Patch localStorage for each test
    const localStorageMock = {
      getItem: jest.fn((key) => {
        if (key === 'editorSettings') {
          return JSON.stringify(mockSettings);
        }
        return null;
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    // Patch EventBus
    const mockEmit = jest.fn();
    const mockEventBus = {
      emit: mockEmit,
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      handlers: new Map(),
      middleware: [],
      validators: [],
      stats: { totalEvents: 0, activeSubscriptions: 0 },
      getStats: jest.fn(),
      addMiddleware: jest.fn(),
      removeMiddleware: jest.fn(),
      addValidator: jest.fn(),
      removeValidator: jest.fn(),
      clearHandlers: jest.fn(),
      clearMiddleware: jest.fn(),
      clearValidators: jest.fn(),
      reset: jest.fn(),
    };
    jest.spyOn(EventBus, 'getInstance').mockReturnValue(mockEventBus as unknown as EventBus);
    // Attach to global for event emission tests
    (global as any).mockEmit = mockEmit;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to create a wrapper component
  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <EditorProvider>{children}</EditorProvider>
    );
  };

  describe('EditorProvider', () => {
    it('should provide editor context to children', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });
      expect(result.current).toHaveProperty('content');
      expect(result.current).toHaveProperty('selection');
      expect(result.current).toHaveProperty('settings');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('setContent');
      expect(result.current).toHaveProperty('setSelection');
      expect(result.current).toHaveProperty('updateSettings');
      expect(result.current).toHaveProperty('clearError');
      expect(result.current).toHaveProperty('resetState');
    });

    it('should load persisted settings from localStorage', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(persistedSettings));
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });
      await waitFor(() => {
        expect(result.current.settings).toEqual(persistedSettings);
      });
    });

    it('should handle invalid persisted settings in localStorage', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue('invalid-json');
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });
      await waitFor(() => {
        expect(result.current.settings).toEqual({
          theme: 'light' as const,
          fontSize: 14,
          wordWrap: true,
          lineNumbers: true,
        });
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('editorSettings');
      });
    });
  });

  describe('Editor Operations', () => {
    it('should update content successfully', async () => {
      const mockEmit = (global as any).mockEmit;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });

      await act(async () => {
        result.current.setContent(mockContent);
      });

      expect(result.current.content).toEqual(mockContent);
      expect(result.current.error).toBeNull();
      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_CONTENT_UPDATED',
        payload: { content: mockContent },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });
    });

    it('should update selection successfully', async () => {
      const mockEmit = (global as any).mockEmit;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });

      await act(async () => {
        result.current.setSelection(mockSelection);
      });

      expect(result.current.selection).toEqual(mockSelection);
      expect(result.current.error).toBeNull();
      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_SELECTION_UPDATED',
        payload: { selection: mockSelection },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });
    });

    it('should update settings successfully', async () => {
      let persisted = '';
      (window.localStorage.setItem as jest.Mock).mockImplementation((key, value) => { persisted = value; });
      (window.localStorage.getItem as jest.Mock).mockImplementation(() => persisted);
      const mockEmit = (global as any).mockEmit;
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });
      await act(async () => {
        result.current.updateSettings(mockSettings);
      });
      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
      expect(JSON.parse(window.localStorage.getItem('editorSettings')!)).toEqual(mockSettings);
      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_SETTINGS_UPDATED',
        payload: { settings: mockSettings },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });
    });

    it('should handle settings update error', async () => {
      const localStorageMock = {
        getItem: jest.fn(() => JSON.stringify(mockSettings)),
        setItem: jest.fn(() => {
          throw new Error('Failed to update editor settings');
        }),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
      const wrapper = createWrapper();
      // Best practice: expect the error to bubble up
      expect(() => {
        renderHook(() => useEditor(), { wrapper });
      }).toThrow('Failed to update editor settings');
    });

    it('should clear error state', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });

      // Set error state by simulating an error
      const mockEmit = (global as any).mockEmit.mockImplementation(() => {
        throw new Error('Test error');
      });
      (EventBus.getInstance as jest.Mock).mockReturnValue({
        emit: mockEmit,
      });

      await act(async () => {
        try {
          await result.current.setContent(mockContent);
        } catch (error) {
          // Expected error
        }
      });

      await act(async () => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should reset state', async () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });

      // Set initial state
      await act(async () => {
        await result.current.setContent(mockContent);
        await result.current.setSelection(mockSelection);
        await result.current.updateSettings(mockSettings);
      });

      await act(async () => {
        result.current.resetState();
      });

      expect(result.current.content).toBeNull();
      expect(result.current.selection).toBeNull();
      expect(result.current.settings).toEqual({
        theme: 'light' as const,
        fontSize: 14,
        wordWrap: true,
        lineNumbers: true,
      });
      expect(result.current.error).toBeNull();
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('editorSettings');
    });
  });

  describe('Event Emission', () => {
    it('should emit events on successful operations', async () => {
      const mockEmit = (global as any).mockEmit;

      const wrapper = createWrapper();
      const { result } = renderHook(() => useEditor(), { wrapper });

      // Test content update event
      await act(async () => {
        await result.current.setContent(mockContent);
      });

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_CONTENT_UPDATED',
        payload: { content: mockContent },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });

      // Test selection update event
      await act(async () => {
        await result.current.setSelection(mockSelection);
      });

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_SELECTION_UPDATED',
        payload: { selection: mockSelection },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });

      // Test settings update event
      await act(async () => {
        await result.current.updateSettings(mockSettings);
      });

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'EDITOR_SETTINGS_UPDATED',
        payload: { settings: mockSettings },
        timestamp: expect.any(Date),
        source: 'EditorContext',
      });
    });
  });
}); 