var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/agent/index.ts
import express, { Router } from "express";
import fs from "fs";
import path from "path";
import serverless from "serverless-http";

// src/agent/myAgentTaskLogic.ts
import { v4 as uuidv4 } from "uuid";
import QuickChart from "quickchart-js";
var chartDataStore = /* @__PURE__ */ new Map();
var customFontFamily = "sans-serif";
console.log("\u{1F4A1} Custom task logic ready (using QuickChart.io for SVG generation)!");
async function createTask(payload, baseUrl) {
  const taskName = payload.name || `Chart Task ${Date.now()}`;
  let chartTypeDisplay = "Unknown";
  if (payload.input?.parts?.[0]?.type === "data") {
    const firstPart = payload.input.parts[0];
    chartTypeDisplay = firstPart.data?.chartType || "Data (type unspecified)";
  }
  console.log(`\u{1F680} New task: "${taskName}" (Input Type: ${chartTypeDisplay})`);
  const taskId = `agent-task-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let taskStatus = "working";
  let taskResult = void 0;
  let inputContent = void 0;
  try {
    if (!payload.input || !payload.input.parts || payload.input.parts.length === 0) {
      throw new Error("Input message or parts are missing.");
    }
    const firstPart = payload.input.parts[0];
    if (firstPart.type !== "data" || !firstPart.data) {
      throw new Error("Invalid input part type or missing data. Expected DataPart.");
    }
    inputContent = firstPart.data;
    if (!inputContent || !inputContent.chartType || !inputContent.data) {
      throw new Error("Missing required fields (chartType, data) in input data part.");
    }
    const { chartType, data, options = {} } = inputContent;
    console.log(`   \u2699\uFE0F Generating '${chartType}' chart using QuickChart.io...`);
    const chartWidth = options.width || 800;
    const chartHeight = options.height || 600;
    const effectiveFontFamily = options.fontFamily || customFontFamily;
    const chartJsConfig = {
      type: chartType.toLowerCase(),
      data: {},
      options: {
        responsive: false,
        // QuickChart handles dimensions
        animation: false,
        // Animations not relevant for static image
        plugins: {
          title: { display: !!options.title, text: options.title, font: { family: effectiveFontFamily, size: 18, weight: "bold" } },
          legend: { labels: { font: { family: effectiveFontFamily } } },
          tooltip: { bodyFont: { family: effectiveFontFamily }, titleFont: { family: effectiveFontFamily } }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: !!options.yAxisLabel, text: options.yAxisLabel, font: { family: effectiveFontFamily } },
            ticks: { font: { family: effectiveFontFamily } }
          },
          x: {
            title: { display: !!options.xAxisLabel, text: options.xAxisLabel, font: { family: effectiveFontFamily } },
            ticks: { font: { family: effectiveFontFamily } }
          }
        },
        ...options
        // Spread other options from input
      }
    };
    if (chartJsConfig.type === "bar" || chartJsConfig.type === "line") {
      chartJsConfig.data.labels = data.map((d) => d.label || d.month || d.category || "Unknown");
      chartJsConfig.data.datasets = [{
        label: options.title || "Dataset",
        data: data.map((d) => d.value || d.sales || 0),
        backgroundColor: chartJsConfig.type === "bar" ? "rgba(75, 192, 192, 0.2)" : void 0,
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        fill: chartJsConfig.type === "line" ? false : void 0,
        tension: chartJsConfig.type === "line" ? 0.1 : void 0
      }];
    } else {
      throw new Error(`Unsupported chartType: ${chartType}. Implemented types for direct config: 'bar', 'line'.`);
    }
    const chart = new QuickChart();
    chart.setConfig(chartJsConfig);
    chart.setWidth(chartWidth);
    chart.setHeight(chartHeight);
    chart.setFormat("svg");
    const quickChartUrl = await chart.getShortUrl();
    if (!quickChartUrl) {
      throw new Error("Failed to generate chart URL from QuickChart.io.");
    }
    console.log(`   \u{1F4CA} QuickChart.io URL (SVG): ${quickChartUrl}`);
    chartDataStore.set(taskId, quickChartUrl);
    console.log(`   \u{1F4BE} Stored QuickChart URL in memory for task ID: ${taskId}`);
    const outputData = {
      message: "Chart generated successfully via QuickChart.io.",
      chartRenderUrl: quickChartUrl
    };
    const resultPart = { type: "data", mimeType: "application/json", data: outputData };
    taskResult = { id: uuidv4(), role: "agent", parts: [resultPart] };
    taskStatus = "completed";
  } catch (error) {
    console.error(`\u{1F525} Task error ("${taskName}"): ${error.message}`);
    console.error(error.stack);
    taskStatus = "failed";
    const errorOutput = { errorMessage: error.message };
    const errorPart = { type: "data", mimeType: "application/json", data: errorOutput };
    taskResult = { id: uuidv4(), role: "agent", parts: [errorPart] };
  }
  const task = {
    id: taskId,
    status: taskStatus,
    createdAt: now,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    input: payload.input,
    name: payload.name || `Chart Task ${taskId}`,
    description: payload.description || `Generates a ${inputContent?.chartType || "chart"} viewable at ${chartDataStore.get(taskId) || "a QuickChart URL"}`,
    // Updated description
    result: taskResult,
    // Any other fields from payload that should be preserved
    ...payload.endpoint && { endpoint: payload.endpoint },
    ...payload.progress && { progress: payload.progress },
    ...payload.parentId && { parentId: payload.parentId },
    ...payload.children && { children: payload.children },
    ...payload.metadata && { metadata: payload.metadata }
  };
  return task;
}
async function getTask(id) {
  console.log(`\u{1F50E} Getting task by ID: ${id}`);
  return void 0;
}
async function addMessageToTask(id, message) {
  console.log(`\u{1F4AC} Adding message to task ID: ${id}`, message);
  const task = await getTask(id);
  if (task) {
    task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return task;
  }
  return void 0;
}
async function cancelTask(id) {
  console.log(`\u{1F6D1} Cancelling task ID: ${id}`);
  const task = await getTask(id);
  if (task && (task.status === "in_progress" || task.status === "submitted")) {
    task.status = "canceled";
    task.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return task;
  }
  return void 0;
}
async function listTasks() {
  console.log("\u{1F4CB} Listing all tasks");
  return [];
}

// src/core/a2a/src/artifacts.ts
var artifacts_exports = {};
__export(artifacts_exports, {
  addArtifact: () => addArtifact,
  getArtifactById: () => getArtifactById,
  getArtifactsForTask: () => getArtifactsForTask
});
import { v4 as uuidv42 } from "uuid";
var artifactsStore = /* @__PURE__ */ new Map();
async function addArtifact(taskId, artifact) {
  if (!artifact.type) throw new Error("Artifact must have a type");
  const id = uuidv42();
  const fullArtifact = { ...artifact, id };
  const arr = artifactsStore.get(taskId) || [];
  arr.push(fullArtifact);
  artifactsStore.set(taskId, arr);
  return fullArtifact;
}
async function getArtifactsForTask(taskId) {
  return artifactsStore.get(taskId) || [];
}
async function getArtifactById(taskId, artifactId) {
  const arr = artifactsStore.get(taskId) || [];
  return arr.find((a) => a.id === artifactId);
}

// src/core/a2a/src/schema.ts
import { z } from "zod";
var TextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string()
});
var FilePartSchema = z.object({
  type: z.literal("file"),
  filename: z.string(),
  contentType: z.string(),
  data: z.string()
  // base64
});
var DataPartSchema = z.object({
  type: z.literal("data"),
  mimeType: z.string(),
  data: z.unknown()
});
var PartSchema = z.discriminatedUnion("type", [TextPartSchema, FilePartSchema, DataPartSchema]);
var MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "agent"]),
  parts: z.array(PartSchema)
});
var ArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  url: z.string().optional(),
  data: z.unknown().optional()
});
var TaskSchema = z.object({
  id: z.string(),
  status: z.enum(["submitted", "working", "input-required", "completed", "failed", "canceled"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  input: MessageSchema,
  output: MessageSchema.optional(),
  artifacts: z.array(ArtifactSchema).optional()
});
var AgentCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  endpoint: z.string(),
  capabilities: z.array(z.string()),
  skills: z.array(z.string()).optional(),
  contact: z.string().optional(),
  authentication: z.object({
    type: z.string()
  }).catchall(z.unknown()).optional()
}).catchall(z.unknown());
function validateTask(task) {
  return TaskSchema.safeParse(task);
}
function validateMessage(msg) {
  return MessageSchema.safeParse(msg);
}

// src/core/a2a/src/tasks.ts
var tasks_exports = {};
__export(tasks_exports, {
  addMessageToTask: () => addMessageToTask2,
  cancelTask: () => cancelTask2,
  createTask: () => createTask2,
  getTask: () => getTask2,
  listTasks: () => listTasks2,
  updateTask: () => updateTask
});
import { v4 as uuidv43 } from "uuid";
var tasks = /* @__PURE__ */ new Map();
async function createTask2(payload) {
  const id = uuidv43();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const task = {
    ...payload,
    id,
    status: "submitted",
    createdAt: now,
    updatedAt: now
  };
  tasks.set(id, task);
  return task;
}
async function getTask2(id) {
  return tasks.get(id);
}
async function updateTask(id, updates) {
  const task = tasks.get(id);
  if (!task) return void 0;
  const updated = { ...task, ...updates, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  tasks.set(id, updated);
  return updated;
}
async function cancelTask2(id) {
  return updateTask(id, { status: "canceled" });
}
async function addMessageToTask2(id, message) {
  const task = tasks.get(id);
  if (!task) return void 0;
  const updated = { ...task, output: message, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  tasks.set(id, updated);
  return updated;
}
async function listTasks2() {
  return Array.from(tasks.values());
}

// src/core/a2a/src/server.ts
function createHandlers({ tasks: tasks2, artifacts, validateTask: validateTask2, validateMessage: validateMessage2 }) {
  return {
    /**
     * Handler for POST /tasks/send
     * Accepts a new task and returns the created Task.
     */
    async handleSendTask(req, res) {
      const validation = validateTask2({ ...req.body, id: "temp", createdAt: "", updatedAt: "", status: "submitted" });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid task", details: validation.error.errors });
      }
      try {
        const createdTask = await tasks2.createTask(req.body);
        res.status(201).json(createdTask);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },
    /**
     * Handler for POST /tasks/sendSubscribe
     * Accepts a new task and subscribes for updates.
     * (For now, same as sendTask; extend for streaming later.)
     */
    async handleSendSubscribe(req, res) {
      const validation = validateTask2({ ...req.body, id: "temp", createdAt: "", updatedAt: "", status: "submitted" });
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid task", details: validation.error.errors });
      }
      try {
        const createdTask = await tasks2.createTask(req.body);
        res.status(201).json(createdTask);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    },
    /**
     * Handler for GET /tasks/:id
     * Returns the Task by ID.
     */
    async handleGetTask(req, res) {
      const task = await tasks2.getTask(req.params.id);
      if (!task) return res.status(404).json({ error: "Task not found" });
      res.json(task);
    },
    /**
     * Handler for POST /tasks/:id/messages
     * Accepts a message for a task.
     */
    async handleSendMessage(req, res) {
      const validation = validateMessage2(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Invalid message", details: validation.error.errors });
      }
      const updated = await tasks2.addMessageToTask(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(updated);
    },
    /**
     * Handler for POST /tasks/:id/cancel
     * Cancels a running task.
     */
    async handleCancelTask(req, res) {
      const updated = await tasks2.cancelTask(req.params.id);
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(updated);
    },
    /**
     * Handler for GET /tasks/:id/artifacts
     * Returns artifacts for a task.
     */
    async handleGetArtifacts(req, res) {
      const result = await artifacts.getArtifactsForTask(req.params.id);
      res.json(result);
    },
    /**
     * Handler for GET /tasks
     * Returns all tasks for the user/session.
     */
    async handleListTasks(req, res) {
      const result = await tasks2.listTasks();
      res.json(result);
    }
  };
}
var {
  handleSendTask,
  handleSendSubscribe,
  handleGetTask,
  handleSendMessage,
  handleCancelTask,
  handleGetArtifacts,
  handleListTasks
} = createHandlers({ tasks: tasks_exports, artifacts: artifacts_exports, validateTask, validateMessage });

// src/agent/agent.json
var agent_default = {
  id: "chart-agent-001",
  name: "Chart Agent",
  description: "This agent creates charts based on provided data and specifications.",
  endpoint: null,
  capabilities: [
    "chart-generation",
    "data-visualization"
  ],
  inputSchema: {
    type: "object",
    properties: {
      chartType: {
        type: "string",
        description: "Type of chart to generate (e.g., 'bar', 'line'). Other Chart.js types can be generated by providing a complete configuration in 'options'."
      },
      data: { type: "array", items: { type: "object" }, description: "Data for the chart" },
      options: { type: "object", description: "Additional chart options" }
    },
    required: ["chartType", "data"]
  },
  outputSchema: {
    type: "object",
    properties: {
      chartImage: {
        type: "string",
        format: "uri",
        description: "URL of the generated chart image, hosted by QuickChart.io. This URL also serves to define the chart's specification."
      },
      message: {
        type: "string",
        description: "A descriptive message about the task outcome (e.g., success or error details if applicable outside of task failure)."
      }
    },
    required: ["chartImage"]
  },
  version: "0.1.0"
};

// src/agent/index.ts
console.log(`[Server Setup] Current working directory (process.cwd()): ${process.cwd()}`);
var chartsDir = path.join("public", "generated_charts");
if (!fs.existsSync(chartsDir)) {
  fs.mkdirSync(chartsDir, { recursive: true });
  console.log(`\u{1F4C1} Created charts directory at ${chartsDir}`);
}
var app = express();
app.use(express.json());
app.use("/charts", express.static(chartsDir));
var wrappedTaskLogic = {
  createTask: async (payload, req) => {
    let baseUrl = process.env.AGENT_BASE_URL || "http://localhost:3001";
    if (req) baseUrl = `${req.protocol}://${req.get("host")}`;
    return createTask(payload, baseUrl);
  },
  getTask,
  listTasks,
  addMessageToTask,
  cancelTask
};
var handlers = createHandlers({
  tasks: wrappedTaskLogic,
  artifacts: { getArtifactsForTask },
  validateTask,
  validateMessage
});
var router = Router();
router.post("/tasks/send", handlers.handleSendTask);
router.post("/tasks/sendSubscribe", handlers.handleSendSubscribe);
router.get("/tasks/:id", handlers.handleGetTask);
router.post("/tasks/:id/messages", handlers.handleSendMessage);
router.post("/tasks/:id/cancel", handlers.handleCancelTask);
router.get("/tasks/:id/artifacts", handlers.handleGetArtifacts);
router.get("/tasks", handlers.handleListTasks);
router.get("/.well-known/agent.json", (req, res) => {
  const host = req.get("host");
  const protocol = req.protocol;
  const a2aBasePath = `${protocol}://${host}/a2a`;
  const fullCard = { ...agent_default, endpoint: a2aBasePath };
  res.json(fullCard);
});
app.use("/a2a", router);
app.get("/", (req, res) => {
  res.status(200).send("Minimal Agent is running with custom A2A handlers.");
});
if (process.env.RUN_LOCAL_SERVER === "true") {
  const PORT = parseInt(process.env.PORT || "3001", 10);
  app.listen(PORT, () => {
    console.log(`\u{1F9BB} Listening on port ${PORT}`);
  });
}
var config = {
  runtime: "nodejs20"
};
var handler = serverless(app);
async function index_default(req, res) {
  return handler(req, res);
}
export {
  config,
  index_default as default
};
