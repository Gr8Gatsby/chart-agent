import { describe, it, expect, vi, afterEach } from 'vitest';
import * as client from '../src/client';
import type { Task, Message } from '../src/types';

// Mock the global fetch function
vi.stubGlobal('fetch', vi.fn());

const endpoint = 'https://agent.example.com';
const taskId = 'task-123';
const taskPayload: Partial<Task> = { 
  input: { 
    id: 'msg-1', 
    role: 'user' as const, 
    parts: [{ type: 'text', text: 'hello' }] 
  } 
};
const message: Message = { 
  id: 'msg-2', 
  role: 'user' as const, 
  parts: [{ type: 'text', text: 'hi' }] 
};
const taskResponse: Task = { 
  id: taskId, 
  status: 'submitted', 
  createdAt: '', 
  updatedAt: '', 
  input: taskPayload.input! 
};
const artifactResponse = [{ id: 'art-1', type: 'file' }];

describe('A2A Client', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('sendTask: should POST and return Task', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(taskResponse) });
    const result = await client.sendTask(endpoint, taskPayload);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/send`, expect.anything());
    expect(result).toEqual(taskResponse);
  });

  it('sendTask: should throw on error', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500, statusText: 'Server Error', text: () => Promise.resolve('Error details') });
    await expect(client.sendTask(endpoint, taskPayload)).rejects.toThrow(`Failed to send task to ${endpoint}/a2a/tasks/send: 500 Server Error. Agent response body: Error details`);
  });

  it('sendSubscribe: should POST and return Task', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(taskResponse) });
    const result = await client.sendSubscribe(endpoint, taskPayload);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/sendSubscribe`, expect.anything());
    expect(result).toEqual(taskResponse);
  });

  it('getTask: should GET and return Task', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(taskResponse) });
    const result = await client.getTask(endpoint, taskId);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/${taskId}`);
    expect(result).toEqual(taskResponse);
  });

  it('sendMessage: should POST and return Task', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(taskResponse) });
    const result = await client.sendMessage(endpoint, taskId, message);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/${taskId}/messages`, expect.anything());
    expect(result).toEqual(taskResponse);
  });

  it('cancelTask: should POST and return Task', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(taskResponse) });
    const result = await client.cancelTask(endpoint, taskId);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/${taskId}/cancel`, expect.anything());
    expect(result).toEqual(taskResponse);
  });

  it('getArtifacts: should GET and return artifacts', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(artifactResponse) });
    const result = await client.getArtifacts(endpoint, taskId);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks/${taskId}/artifacts`);
    expect(result).toEqual(artifactResponse);
  });

  it('listTasks: should GET and return tasks', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve([taskResponse]) });
    const result = await client.listTasks(endpoint);
    expect(fetch).toHaveBeenCalledWith(`${endpoint}/a2a/tasks`);
    expect(result).toEqual([taskResponse]);
  });
}); 