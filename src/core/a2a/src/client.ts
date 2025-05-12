import { Task, Message, Artifact } from './types';

/**
 * Send a task to a remote agent endpoint using the A2A protocol.
 * Returns the response as a Task (or throws on error).
 */
export async function sendTask(endpoint: string, taskPayload: Partial<Task>): Promise<any> {
  const res = await fetch(`${endpoint}/a2a/tasks/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskPayload),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => 'Could not read error body from agent response');
    throw new Error(`Failed to send task to ${endpoint}/a2a/tasks/send: ${res.status} ${res.statusText}. Agent response body: ${errorBody}`);
  }
  return await res.json();
}

/**
 * Subscribe to a task (long-running or streaming tasks).
 * Returns a Task or throws on error.
 */
export async function sendSubscribe(endpoint: string, taskPayload: Partial<Task>): Promise<Task> {
  const res = await fetch(`${endpoint}/a2a/tasks/sendSubscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskPayload),
  });
  if (!res.ok) {
    throw new Error(`Failed to subscribe to task at ${endpoint}: ${res.status}`);
  }
  return await res.json() as Task;
}

/**
 * Get a task by ID from a remote agent.
 * Returns the Task or throws on error.
 */
export async function getTask(endpoint: string, taskId: string): Promise<Task> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}`);
  if (!res.ok) {
    throw new Error(`Failed to get task ${taskId} from ${endpoint}: ${res.status}`);
  }
  return await res.json() as Task;
}

/**
 * Send a message to a task (for input-required or chat-like flows).
 * Returns the updated Task or throws on error.
 */
export async function sendMessage(endpoint: string, taskId: string, message: Message): Promise<Task> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    throw new Error(`Failed to send message to task ${taskId} at ${endpoint}: ${res.status}`);
  }
  return await res.json() as Task;
}

/**
 * Cancel a running task by ID.
 * Returns the updated Task or throws on error.
 */
export async function cancelTask(endpoint: string, taskId: string): Promise<Task> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to cancel task ${taskId} at ${endpoint}: ${res.status}`);
  }
  return await res.json() as Task;
}

/**
 * Get artifacts produced by a task.
 * Returns an array of Artifact or throws on error.
 */
export async function getArtifacts(endpoint: string, taskId: string): Promise<Artifact[]> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}/artifacts`);
  if (!res.ok) {
    throw new Error(`Failed to get artifacts for task ${taskId} from ${endpoint}: ${res.status}`);
  }
  return await res.json() as Artifact[];
}

/**
 * List all tasks for the current user/session (if supported by the agent).
 * Returns an array of Task or throws on error.
 */
export async function listTasks(endpoint: string): Promise<Task[]> {
  const res = await fetch(`${endpoint}/a2a/tasks`);
  if (!res.ok) {
    throw new Error(`Failed to list tasks at ${endpoint}: ${res.status}`);
  }
  return await res.json() as Task[];
}

/**
 * Get a specific artifact from a task.
 * Returns the Artifact or throws on error.
 */
export async function getArtifact(endpoint: string, taskId: string, artifactId: string): Promise<Artifact> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}/artifacts/${encodeURIComponent(artifactId)}`);
  if (!res.ok) {
    throw new Error(`Failed to get artifact ${artifactId} from task ${taskId} at ${endpoint}: ${res.status}`);
  }
  return await res.json() as Artifact;
}

/**
 * List all artifacts for a task.
 * Returns an array of Artifact or throws on error.
 */
export async function listArtifacts(endpoint: string, taskId: string): Promise<Artifact[]> {
  const res = await fetch(`${endpoint}/a2a/tasks/${encodeURIComponent(taskId)}/artifacts`);
  if (!res.ok) {
    throw new Error(`Failed to list artifacts for task ${taskId} from ${endpoint}: ${res.status}`);
  }
  return await res.json() as Artifact[];
}

// TODO: Add more A2A client helpers (sendSubscribe, message exchange, etc.) 