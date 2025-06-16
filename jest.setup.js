// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock console.debug to keep test output clean
console.debug = jest.fn();

// Mock performance.now() for consistent timing in tests
const originalPerformanceNow = performance.now;
let mockTime = 0;
performance.now = jest.fn(() => {
  mockTime += 100; // Increment by 100ms each call
  return mockTime;
});

// Reset mocks before each test
beforeEach(() => {
  mockTime = 0;
  jest.clearAllMocks();
});

// Restore original performance.now after all tests
afterAll(() => {
  performance.now = originalPerformanceNow;
}); 