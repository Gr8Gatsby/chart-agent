import { Task, Message } from './types';

export function createTask(payload: Partial<Task> & { input: Message }): Task;
export function getTask(id: string): Task | undefined;
export function listTasks(): Task[]; 