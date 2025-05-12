import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import * as middleware from '../src/middleware';

let originalError: any;

beforeAll(() => {
  originalError = console.error;
  console.error = () => {};
});

afterAll(() => {
  console.error = originalError;
});

describe('Express Middleware', () => {
  const mockReq = {
    method: 'POST',
    url: '/tasks/send',
    headers: {
      'content-type': 'application/json',
    },
  };

  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    on: vi.fn((event, cb) => { if (event === 'finish') cb(); }),
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestLogger', () => {
    it('should log request details', () => {
      const logger = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      middleware.requestLogger(mockReq as any, mockRes as any, mockNext);
      
      expect(logger).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle known errors', () => {
      const error = new Error('Test error');
      (error as any).status = 400;
      
      middleware.errorHandler(error, mockReq as any, mockRes as any, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Test error',
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');
      
      middleware.errorHandler(error, mockReq as any, mockRes as any, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation error');
      (error as any).details = [{ message: 'Invalid field' }];
      
      middleware.errorHandler(error, mockReq as any, mockRes as any, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: [{ message: 'Invalid field' }],
      });
    });
  });
}); 