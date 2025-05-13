import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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
// Log the current working directory
console.log(`[Server Setup] Current working directory (process.cwd()): ${process.cwd()}`);

// Define paths relative to the project root (process.cwd())
const chartsDir = path.join('public', 'generated_charts');

// Add this log to verify the absolute path Express *should* resolve from the relative path
console.log(`[Server Setup] Expecting to serve static files from absolute path: ${path.resolve(chartsDir)}`); 

// Ensure the directory for generated charts exists (using relative path)
if (!fs.existsSync(chartsDir)) {
  fs.mkdirSync(chartsDir, { recursive: true });
  console.log(`🚀 Charts directory ready at relative path: ${chartsDir} (absolute: ${path.resolve(chartsDir)})`);
} else {
  console.log(`[Server Setup] Charts directory already exists at relative path: ${chartsDir} (absolute: ${path.resolve(chartsDir)})`);
}
// --- End setup --- 

// Validate the imported agent card template at startup
// Provide a dummy endpoint for validation as it will be set dynamically later.
const tempValidationCard = { ...agentCardTemplate, endpoint: 'http://localhost/.well-known/agent.json' };
if (!validateAgentCard(tempValidationCard)) {
  console.error('❌ Invalid Agent Card: src/agent/agent.json.');
  console.error('   Please check its structure against A2A specification and @core/a2a/src/types.ts AgentCard definition.');
  process.exit(1); // Exit if card is invalid
}

console.log('✅ Agent card validated: src/agent/agent.json');
console.log('🧩 Agent starting with custom A2A handlers...');

const app = express();
app.use(express.json()); // Middleware to parse JSON bodies, important for A2A

// --- UNCOMMENT OLD STATIC FILE SERVING for /charts ---
// Serve static files (the generated charts) using the relative path
const staticMiddleware = express.static(chartsDir, {
  // Optional: Add event listeners for debugging
  setHeaders: (res, path, stat) => {
    console.log(`[Static Serve] Setting headers for: ${path}`);
  }
});

app.use('/charts', (req, res, next) => {
  console.log(`[Static Serve] Request for: ${req.originalUrl}`);
  
  // --- BEGIN Enhanced Debugging ---
  // Calculate the potential *relative* file path based on the request URL
  const requestedFileRelative = req.path.substring(1); // Remove leading '/'
  // Calculate the absolute path that *should* correspond to the file
  const potentialFilePathAbsolute = path.resolve(chartsDir, requestedFileRelative);
  console.log(`[Static Serve] Checking for file at absolute path: ${potentialFilePathAbsolute}`);

  // Check if the file actually exists using the absolute path for certainty in logging
  if (fs.existsSync(potentialFilePathAbsolute)) {
    console.log(`[Static Serve] ✅ File exists: ${potentialFilePathAbsolute}`);
  } else {
    console.log(`[Static Serve] ❌ File NOT found: ${potentialFilePathAbsolute}`);
    // Optionally, list directory contents for debugging using the absolute path
    const absoluteChartsDir = path.resolve(chartsDir);
    try {
      const dirContents = fs.readdirSync(absoluteChartsDir);
      console.log(`[Static Serve] Contents of ${absoluteChartsDir}:`, dirContents);
    } catch (dirErr) {
      console.error(`[Static Serve] Error reading directory ${absoluteChartsDir}:`, dirErr);
    }
  }
  // --- END Enhanced Debugging ---
  
  // Pass the request to the express.static middleware (which uses the relative chartsDir)
  staticMiddleware(req, res, (err) => {
    if (err) {
      console.error(`[Static Serve] Error serving ${req.originalUrl}:`, err);
    }
    // If staticMiddleware doesn't handle it (e.g., file not found by it, or an error occurs),
    // call the original next() from Express.
    // We added our own file existence check above for debugging, but express.static does its own check.
    console.log(`[Static Serve] Handing off to next() for ${req.originalUrl}`); 
    next(err); 
  });
});

console.log(`🖼️ Serving charts from public/generated_charts at /charts`);
// --- END UNCOMMENT ---

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
    console.log(`👂 Agent listening locally on port ${PORT}`);
    console.log(`🔗 A2A endpoint: http://localhost:${PORT}/a2a`);
    console.log(`📇 Agent card: http://localhost:${PORT}/a2a/.well-known/agent.json`);
    console.log(`📊 Chart viewer example: http://localhost:${PORT}/charts/<TASK_ID>`);
  });
} 