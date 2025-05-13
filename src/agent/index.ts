import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import serverless from 'serverless-http';

import {
  createTask,
  getTask,
  listTasks,
  addMessageToTask,
  cancelTask,
} from './myAgentTaskLogic';
import {
  addArtifact,
  getArtifactById,
  getArtifactsForTask
} from '../core/a2a/src/artifacts';
import {
  validateMessage,
  validateTask
} from '../core/a2a/src/schema';
import { createHandlers } from '../core/a2a/src/server';
import agentCard from './agent.json';
import { validateAgentCard } from '../core/a2a/src/agentCard';

console.log(`[Server Setup] Current working directory (process.cwd()): ${process.cwd()}`);

const chartsDir = path.join('public', 'generated_charts');
if (!fs.existsSync(chartsDir)) {
  fs.mkdirSync(chartsDir, { recursive: true });
  console.log(`📁 Created charts directory at ${chartsDir}`);
}

const app = express();
app.use(express.json());
app.use('/charts', express.static(chartsDir));

const wrappedTaskLogic = {
  createTask: async (payload: any, req: any) => {
    let baseUrl = process.env.AGENT_BASE_URL || 'http://localhost:3001';
    if (req) baseUrl = `${req.protocol}://${req.get('host')}`;
    return createTask(payload, baseUrl);
  },
  getTask,
  listTasks,
  addMessageToTask,
  cancelTask,
};

const handlers = createHandlers({
  tasks: wrappedTaskLogic,
  artifacts: { getArtifactsForTask },
  validateTask,
  validateMessage
});

const router = Router();
router.post('/tasks/send', handlers.handleSendTask);
router.post('/tasks/sendSubscribe', handlers.handleSendSubscribe);
router.get('/tasks/:id', handlers.handleGetTask);
router.post('/tasks/:id/messages', handlers.handleSendMessage);
router.post('/tasks/:id/cancel', handlers.handleCancelTask);
router.get('/tasks/:id/artifacts', handlers.handleGetArtifacts);
router.get('/tasks', handlers.handleListTasks);
router.get('/.well-known/agent.json', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const a2aBasePath = `${protocol}://${host}/a2a`;
  const fullCard = { ...agentCard, endpoint: a2aBasePath };
  res.json(fullCard);
});

app.use('/a2a', router);
app.get('/', (req, res) => {
  res.status(200).send('Minimal Agent is running with custom A2A handlers.');
});

// For local use
if (process.env.RUN_LOCAL_SERVER === 'true') {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  app.listen(PORT, () => {
    console.log(`🦻 Listening on port ${PORT}`);
  });
}

export const config = {
  runtime: 'nodejs20',
};

const handler = serverless(app);
export default async function (req: any, res: any) {
  return handler(req, res);
}