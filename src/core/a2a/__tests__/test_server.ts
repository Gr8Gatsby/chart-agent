import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandlers } from '../src/server';
import type { Task, Message, Artifact } from '../src/types';

// Create mock functions
const mockCreateTask = vi.fn();
const mockGetTask = vi.fn();
const mockAddMessageToTask = vi.fn();
const mockCancelTask = vi.fn();
const mockListTasks = vi.fn();
const mockGetArtifactsForTask = vi.fn();
const mockValidateTask = vi.fn();
const mockValidateMessage = vi.fn();

// Create handlers with injected mocks
const handlers = createHandlers({
  tasks: {
    createTask: mockCreateTask,
    getTask: mockGetTask,
    addMessageToTask: mockAddMessageToTask,
    cancelTask: mockCancelTask,
    listTasks: mockListTasks,
  },
  artifacts: {
    getArtifactsForTask: mockGetArtifactsForTask,
  },
  validateTask: mockValidateTask,
  validateMessage: mockValidateMessage,
});

describe('A2A Server', () => {
  const mockReq = {
    body: {} as any,
    params: {} as { id?: string },
  };
  const mockRes = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };

  const mockTask: Task = {
    id: 'task-123',
    status: 'submitted',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    input: {
      id: 'msg-1',
      role: 'user',
      parts: [{ type: 'text', text: 'hello' }],
    },
  };

  const mockMessage: Message = {
    id: 'msg-2',
    role: 'user',
    parts: [{ type: 'text', text: 'hi' }],
  };

  const mockArtifact: Artifact = {
    id: 'art-1',
    type: 'file',
    url: 'https://example.com/file.txt',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue(mockTask);
    mockGetTask.mockResolvedValue(mockTask);
    mockAddMessageToTask.mockResolvedValue(mockTask);
    mockCancelTask.mockResolvedValue({ ...mockTask, status: 'canceled' });
    mockListTasks.mockResolvedValue([mockTask]);
    mockGetArtifactsForTask.mockResolvedValue([mockArtifact]);
    mockValidateTask.mockReturnValue({ success: true });
    mockValidateMessage.mockReturnValue({ success: true });
  });

  describe('handleSendTask', () => {
    it('should create and return a new task', async () => {
      mockReq.body = { input: mockTask.input };
      await handlers.handleSendTask(mockReq, mockRes);
      expect(mockCreateTask).toHaveBeenCalledWith({ input: mockTask.input });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockTask);
    });

    it('should return 400 for invalid task', async () => {
      mockReq.body = { input: { role: 'invalid' } };
      mockValidateTask.mockReturnValueOnce({ success: false, error: { errors: ['Invalid role'] } });
      await handlers.handleSendTask(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Invalid task',
      }));
    });
  });

  describe('handleSendSubscribe', () => {
    it('should create and return a new task', async () => {
      mockReq.body = { input: mockTask.input };
      await handlers.handleSendSubscribe(mockReq, mockRes);
      expect(mockCreateTask).toHaveBeenCalledWith({ input: mockTask.input });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockTask);
    });
  });

  describe('handleGetTask', () => {
    it('should return task by ID', async () => {
      mockReq.params.id = 'task-123';
      await handlers.handleGetTask(mockReq, mockRes);
      expect(mockGetTask).toHaveBeenCalledWith('task-123');
      expect(mockRes.json).toHaveBeenCalledWith(mockTask);
    });

    it('should return 404 for non-existent task', async () => {
      mockReq.params.id = 'non-existent';
      mockGetTask.mockResolvedValueOnce(undefined);
      await handlers.handleGetTask(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('handleSendMessage', () => {
    it('should add message to task', async () => {
      mockReq.params.id = 'task-123';
      mockReq.body = mockMessage;
      await handlers.handleSendMessage(mockReq, mockRes);
      expect(mockAddMessageToTask).toHaveBeenCalledWith('task-123', mockMessage);
      expect(mockRes.json).toHaveBeenCalledWith(mockTask);
    });

    it('should return 404 for non-existent task', async () => {
      mockReq.params.id = 'non-existent';
      mockReq.body = mockMessage;
      mockAddMessageToTask.mockResolvedValueOnce(undefined);
      await handlers.handleSendMessage(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('handleCancelTask', () => {
    it('should cancel task', async () => {
      mockReq.params.id = 'task-123';
      await handlers.handleCancelTask(mockReq, mockRes);
      expect(mockCancelTask).toHaveBeenCalledWith('task-123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'canceled',
      }));
    });

    it('should return 404 for non-existent task', async () => {
      mockReq.params.id = 'non-existent';
      mockCancelTask.mockResolvedValueOnce(undefined);
      await handlers.handleCancelTask(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Task not found' });
    });
  });

  describe('handleGetArtifacts', () => {
    it('should return artifacts for task', async () => {
      mockReq.params.id = 'task-123';
      await handlers.handleGetArtifacts(mockReq, mockRes);
      expect(mockGetArtifactsForTask).toHaveBeenCalledWith('task-123');
      expect(mockRes.json).toHaveBeenCalledWith([mockArtifact]);
    });
  });

  describe('handleListTasks', () => {
    it('should return all tasks', async () => {
      await handlers.handleListTasks(mockReq, mockRes);
      expect(mockListTasks).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith([mockTask]);
    });
  });
}); 