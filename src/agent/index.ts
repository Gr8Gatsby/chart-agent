import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// If router.ts default exports, and @core/a2a re-exports it via 'export * from ./router'
// it might be available as a named export 'default'
import router from '../core/a2a/src/router';

// A2A Core imports
import { createHandlers } from '../core/a2a/src/server';
import { validateTask, validateMessage } from '../core/a2a/src/schema';
import * as coreArtifacts from '../core/a2a/src/artifacts'; // Using default artifact handling for now

// Your Agent's custom logic
import * as myAgentTaskLogic from './myAgentTaskLogic';
import agentCardTemplate from './agent.json'; // Import the agent card
import { validateAgentCard } from '../core/a2a/src/agentCard'; // Import validation function

// --- Setup file paths and directories --- 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Project root is two levels up from src/agent/index.ts
const projectRootDir = path.resolve(__dirname, '..', '..'); 
const chartsDir = path.join(projectRootDir, 'public', 'generated_charts');

// Ensure the directory for generated charts exists
if (!fs.existsSync(chartsDir)) {
  fs.mkdirSync(chartsDir, { recursive: true });
  console.log(`Created directory for generated charts: ${chartsDir}`);
}
// --- End setup --- 

// Validate the imported agent card template at startup
// Provide a dummy endpoint for validation as it will be set dynamically later.
const tempValidationCard = { ...agentCardTemplate, endpoint: 'http://localhost/.well-known/agent.json' };
if (!validateAgentCard(tempValidationCard)) {
  console.error('Error: src/agent/agent.json is not a valid Agent Card according to @core/a2a validation.');
  console.error('Please check its structure against the A2A specification and @core/a2a/src/types.ts AgentCard definition.');
  process.exit(1); // Exit if card is invalid
}

console.log('Agent card from src/agent/agent.json validated successfully.');
console.log('Agent starting with custom A2A handler wiring...');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies, important for A2A

// Serve static files (the generated charts)
// Files in `public/generated_charts` will be available under `/charts` URL path
app.use('/charts', express.static(chartsDir));
console.log(`Serving static charts from ${chartsDir} at /charts`);

// Create A2A handlers using your custom task logic
// We will wrap the createTask to inject the base URL needed for chartImage URL
const wrappedTaskLogic = {
  ...myAgentTaskLogic,
  createTask: async (payload: any, req?: express.Request) => {
    // Construct baseUrl from request if available, or fallback for non-HTTP contexts
    // Note: createHandlers in @core/a2a/server.ts doesn't pass `req` to task functions by default.
    // This is a simplification; a more robust solution might involve middleware or context passing.
    // For now, we'll rely on a configurable base URL or assume localhost for non-HTTP calls.
    let baseUrl = process.env.AGENT_BASE_URL || 'http://localhost:3001'; // Default for local
    if (req) {
        baseUrl = `${req.protocol}://${req.get('host')}`;
    }
    return myAgentTaskLogic.createTask(payload, baseUrl);
  }
};

const a2aApiHandlers = createHandlers({
  tasks: wrappedTaskLogic, // Use the wrapped logic
  artifacts: coreArtifacts,
  validateTask,
  validateMessage,
});

// Create a new Express router for A2A and wire up the routes
const a2aCustomRouter = Router();

a2aCustomRouter.post('/tasks/send', a2aApiHandlers.handleSendTask);
a2aCustomRouter.post('/tasks/sendSubscribe', a2aApiHandlers.handleSendSubscribe);
a2aCustomRouter.get('/tasks/:id', a2aApiHandlers.handleGetTask);
a2aCustomRouter.post('/tasks/:id/messages', a2aApiHandlers.handleSendMessage);
a2aCustomRouter.post('/tasks/:id/cancel', a2aApiHandlers.handleCancelTask);
a2aCustomRouter.get('/tasks/:id/artifacts', a2aApiHandlers.handleGetArtifacts);
a2aCustomRouter.get('/tasks', a2aApiHandlers.handleListTasks);

// Agent Card endpoint
a2aCustomRouter.get('/.well-known/agent.json', (req, res) => {
  // Construct the base URL dynamically
  const host = req.get('host');
  const protocol = req.protocol;
  const a2aBasePath = `${protocol}://${host}/a2a`; // Assuming /a2a is your mount point

  // Clone the template and fill in the dynamic endpoint
  const agentCard = { ...agentCardTemplate, endpoint: a2aBasePath };
  res.json(agentCard);
});

// Mount your custom A2A router
app.use('/a2a', a2aCustomRouter);

// Root endpoint for basic check
app.get('/', (req, res) => {
  res.status(200).send('Minimal Agent is running with custom A2A handlers. A2A routes at /a2a');
});

// Export the app for Vercel
export default app;

// For local development, listen on a port if RUN_LOCAL_SERVER is set
if (process.env.RUN_LOCAL_SERVER === 'true') {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  app.listen(PORT, () => {
    console.log(`Minimal Agent listening locally on port ${PORT}`);
    console.log(`A2A endpoint available at http://localhost:${PORT}/a2a`);
    console.log(`Agent card available at http://localhost:${PORT}/a2a/.well-known/agent.json`);
    console.log(`Generated charts will be served from /charts (e.g., http://localhost:${PORT}/charts/filename.png)`);
  });
} 