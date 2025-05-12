import { Task, Message, Artifact } from './types';
import * as tasks from './tasks';
import * as artifacts from './artifacts';
import { validateTask, validateMessage } from './schema';

interface TasksModule {
  createTask: (...args: any[]) => Promise<Task>;
  getTask: (...args: any[]) => Promise<Task | undefined>;
  addMessageToTask: (...args: any[]) => Promise<Task | undefined>;
  cancelTask: (...args: any[]) => Promise<Task | undefined>;
  listTasks: (...args: any[]) => Promise<Task[]>;
}

interface ArtifactsModule {
  getArtifactsForTask: (...args: any[]) => Promise<Artifact[]>;
}

interface CreateHandlersDeps {
  tasks: TasksModule;
  artifacts: ArtifactsModule;
  validateTask: (...args: any[]) => { success: boolean; error?: any };
  validateMessage: (...args: any[]) => { success: boolean; error?: any };
}

export function createHandlers({ tasks, artifacts, validateTask, validateMessage }: CreateHandlersDeps) {
  return {
    /**
     * Handler for POST /tasks/send
     * Accepts a new task and returns the created Task.
     */
    async handleSendTask(req: any, res: any) {
      const validation = validateTask({ ...req.body, id: 'temp', createdAt: '', updatedAt: '', status: 'submitted' });
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid task', details: validation.error.errors });
      }
      try {
        const createdTask = await tasks.createTask(req.body);
        res.status(201).json(createdTask);
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    },

    /**
     * Handler for POST /tasks/sendSubscribe
     * Accepts a new task and subscribes for updates.
     * (For now, same as sendTask; extend for streaming later.)
     */
    async handleSendSubscribe(req: any, res: any) {
      const validation = validateTask({ ...req.body, id: 'temp', createdAt: '', updatedAt: '', status: 'submitted' });
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid task', details: validation.error.errors });
      }
      try {
        const createdTask = await tasks.createTask(req.body);
        res.status(201).json(createdTask);
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    },

    /**
     * Handler for GET /tasks/:id
     * Returns the Task by ID.
     */
    async handleGetTask(req: any, res: any) {
      const task = await tasks.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    },

    /**
     * Handler for POST /tasks/:id/messages
     * Accepts a message for a task.
     */
    async handleSendMessage(req: any, res: any) {
      const validation = validateMessage(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid message', details: validation.error.errors });
      }
      const updated = await tasks.addMessageToTask(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      res.json(updated);
    },

    /**
     * Handler for POST /tasks/:id/cancel
     * Cancels a running task.
     */
    async handleCancelTask(req: any, res: any) {
      const updated = await tasks.cancelTask(req.params.id);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      res.json(updated);
    },

    /**
     * Handler for GET /tasks/:id/artifacts
     * Returns artifacts for a task.
     */
    async handleGetArtifacts(req: any, res: any) {
      const result = await artifacts.getArtifactsForTask(req.params.id);
      res.json(result);
    },

    /**
     * Handler for GET /tasks
     * Returns all tasks for the user/session.
     */
    async handleListTasks(req: any, res: any) {
      const result = await tasks.listTasks();
      res.json(result);
    },
  };
}

// Default handlers for production use
export const {
  handleSendTask,
  handleSendSubscribe,
  handleGetTask,
  handleSendMessage,
  handleCancelTask,
  handleGetArtifacts,
  handleListTasks,
} = createHandlers({ tasks, artifacts, validateTask, validateMessage }); 