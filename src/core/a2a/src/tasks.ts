import { Task, Message, TaskStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

// In-memory task store
const tasks = new Map<string, Task>();

/**
 * Create a new task from a payload (partial Task or input Message).
 */
export async function createTask(payload: Partial<Task> & { input: Message }): Promise<Task> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const task: Task = {
    ...payload,
    id,
    status: 'submitted',
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(id, task);
  return task;
}

/**
 * Get a task by ID.
 */
export async function getTask(id: string): Promise<Task | undefined> {
  return tasks.get(id);
}

/**
 * Update a task (partial update).
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
  const task = tasks.get(id);
  if (!task) return undefined;
  const updated: Task = { ...task, ...updates, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

/**
 * Cancel a running task.
 */
export async function cancelTask(id: string): Promise<Task | undefined> {
  return updateTask(id, { status: 'canceled' });
}

/**
 * Add a message to a task (for input-required or chat flows).
 */
export async function addMessageToTask(id: string, message: Message): Promise<Task | undefined> {
  const task = tasks.get(id);
  if (!task) return undefined;
  // For simplicity, store latest message as output (extend as needed)
  const updated: Task = { ...task, output: message, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

/**
 * List all tasks.
 */
export async function listTasks(): Promise<Task[]> {
  return Array.from(tasks.values());
} 