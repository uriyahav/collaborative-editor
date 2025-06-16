import { ServiceResult } from '@/types/services';

export const mockLiveblocksService = {
  getInstance: jest.fn().mockReturnValue({
    createRoom: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-room',
        metadata: {},
        usersAccesses: {},
        defaultAccesses: [],
      },
    }),
    getRoom: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-room',
        metadata: {},
        usersAccesses: {},
        defaultAccesses: [],
      },
    }),
    getRooms: jest.fn().mockResolvedValue({
      success: true,
      data: [{
        id: 'test-room',
        metadata: {},
        usersAccesses: {},
        defaultAccesses: [],
      }],
    }),
    updateRoom: jest.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-room',
        metadata: {},
        usersAccesses: {},
        defaultAccesses: [],
      },
    }),
    deleteRoom: jest.fn().mockResolvedValue({
      success: true,
      data: undefined,
    }),
    generateRoomId: jest.fn().mockReturnValue('test-room'),
    triggerInboxNotification: jest.fn().mockResolvedValue({
      success: true,
      data: undefined,
    }),
    getConfig: jest.fn().mockResolvedValue({
      success: true,
      data: {
        publicKey: 'test-key',
        throttle: 16,
        maxConnections: 100,
      },
    }),
    handleError: jest.fn().mockImplementation((error: Error): ServiceResult<never> => ({
      success: false,
      error: {
        message: error.message,
        code: 'LIVEBLOCKS_ERROR',
        timestamp: new Date(),
      },
    })),
    updatePresence: jest.fn().mockResolvedValue({
      success: true,
      data: undefined,
    }),
    getPresence: jest.fn().mockResolvedValue({
      success: true,
      data: {
        cursor: null,
        user: {
          id: 'test-user',
          name: 'Test User',
          color: '#000000',
        },
      },
    }),
  }),
};

export const resetLiveblocksMocks = () => {
  Object.values(mockLiveblocksService.getInstance()).forEach(mock => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

export const simulateLiveblocksError = (method: string, error: Error) => {
  const instance = mockLiveblocksService.getInstance();
  if (instance[method]) {
    instance[method].mockRejectedValueOnce(error);
  }
};

export const simulateLiveblocksSuccess = <T>(method: string, data: T) => {
  const instance = mockLiveblocksService.getInstance();
  if (instance[method]) {
    instance[method].mockResolvedValueOnce({
      success: true,
      data,
    });
  }
}; 