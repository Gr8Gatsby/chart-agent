import { describe, it, expect, vi, beforeEach } from 'vitest';
import router from '../src/router';
import * as server from '../src/server';

// Mock the server handlers
vi.mock('../server', () => ({
  handleSendTask: vi.fn(),
  handleSendSubscribe: vi.fn(),
  handleGetTask: vi.fn(),
  handleSendMessage: vi.fn(),
  handleCancelTask: vi.fn(),
  handleGetArtifacts: vi.fn(),
  handleListTasks: vi.fn(),
}));

describe('A2A Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have all task routes configured', () => {
    // Get all routes from the router
    const routes = router.stack.map(layer => ({
      path: layer.route?.path,
      method: Object.keys((layer.route as any)?.methods || {})[0],
    }));

    // Verify task routes
    expect(routes).toContainEqual({
      path: '/tasks/send',
      method: 'post',
    });
    expect(routes).toContainEqual({
      path: '/tasks/sendSubscribe',
      method: 'post',
    });
    expect(routes).toContainEqual({
      path: '/tasks/:id',
      method: 'get',
    });
    expect(routes).toContainEqual({
      path: '/tasks/:id/messages',
      method: 'post',
    });
    expect(routes).toContainEqual({
      path: '/tasks/:id/cancel',
      method: 'post',
    });
    expect(routes).toContainEqual({
      path: '/tasks/:id/artifacts',
      method: 'get',
    });
    expect(routes).toContainEqual({
      path: '/tasks',
      method: 'get',
    });
  });
}); 