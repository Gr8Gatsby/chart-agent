import express from 'express';
import {
  handleSendTask,
  handleSendSubscribe,
  handleGetTask,
  handleSendMessage,
  handleCancelTask,
  handleGetArtifacts,
  handleListTasks,
} from './server';

const router = express.Router();

// A2A protocol endpoints
router.post('/tasks/send', handleSendTask);
router.post('/tasks/sendSubscribe', handleSendSubscribe);
router.get('/tasks/:id', handleGetTask);
router.post('/tasks/:id/messages', handleSendMessage);
router.post('/tasks/:id/cancel', handleCancelTask);
router.get('/tasks/:id/artifacts', handleGetArtifacts);
router.get('/tasks', handleListTasks);

// Add A2A protocol routes here
router.get('/.well-known/agent.json', (req, res) => {
  res.json({
    id: 'orchestrator-001',
    name: 'A2A Orchestrator',
    description: 'Routes and delegates tasks to registered worker agents',
    endpoint: `${req.protocol}://${req.get('host')}/a2a`,
    capabilities: ['task-routing', 'agent-registry'],
    skills: ['multi-agent', 'task-decomposition']
  });
});

export default router; 