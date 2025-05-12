// src/agent/myAgentTaskLogic.ts
import { Task, Message, TaskStatus, Part, DataPart } from '../core/a2a/src/types';
import { v4 as uuidv4 } from 'uuid'; // For generating message IDs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, registerFont } from 'canvas'; // Import from node-canvas
import { Chart, registerables } from 'chart.js'; // Import Chart.js
Chart.register(...registerables); // Register all Chart.js components

// --- Setup file paths for saving charts ---
const __filename_logic = fileURLToPath(import.meta.url);
const __dirname_logic = path.dirname(__filename_logic);
const projectRootDir_logic = path.resolve(__dirname_logic, '..'); 
const chartsDir_logic = path.join(projectRootDir_logic, 'public', 'generated_charts');
const fontsDir_logic = path.join(projectRootDir_logic, 'src', 'assets', 'fonts'); // Path to your fonts directory
console.log(`[MyAgentLogic Debug] import.meta.url: ${import.meta.url}`);
console.log(`[MyAgentLogic Debug] __filename_logic: ${__filename_logic}`);
console.log(`[MyAgentLogic Debug] __dirname_logic: ${__dirname_logic}`);
console.log(`[MyAgentLogic Debug] projectRootDir_logic: ${projectRootDir_logic}`);
console.log(`[MyAgentLogic Debug] chartsDir_logic: ${chartsDir_logic}`);
console.log(`[MyAgentLogic Debug] fontsDir_logic (expected for fonts): ${fontsDir_logic}`);
// --- End setup ---

// --- Register Custom Fonts ---
const customFontFamily = 'RobotoCustom'; // The family name you'll use in Chart.js
const fontFilesToRegister = [
  { path: path.join(fontsDir_logic, 'Roboto-Regular.ttf'), weight: 'normal' },
  { path: path.join(fontsDir_logic, 'Roboto-Bold.ttf'), weight: 'bold' },
  { path: path.join(fontsDir_logic, 'Roboto-Light.ttf'), weight: 'light' }
];

let fontsRegistered = 0;
console.log('[MyAgentLogic] Attempting to register fonts:');
fontFilesToRegister.forEach(fontInfo => {
  console.log(`[MyAgentLogic] Checking for font at: ${fontInfo.path}`); // Log the exact path being checked
  if (fs.existsSync(fontInfo.path)) {
    registerFont(fontInfo.path, { family: customFontFamily, weight: fontInfo.weight });
    console.log(`[MyAgentLogic] SUCCESS: Registered font: ${fontInfo.path} as ${customFontFamily} (weight: ${fontInfo.weight})`);
    fontsRegistered++;
  } else {
    console.warn(`[MyAgentLogic] WARN: Font file NOT FOUND at ${fontInfo.path}.`);
  }
});

if (fontsRegistered > 0) {
  Chart.defaults.font.family = customFontFamily;
  Chart.defaults.font.size = 12;
  console.log(`[MyAgentLogic] Set Chart.js default font family to: ${customFontFamily}`);
} else {
  console.warn('[MyAgentLogic] WARN: No custom fonts were registered. Chart text might not render correctly.');
  console.warn('[MyAgentLogic] WARN: Please ensure font files exist in src/assets/fonts/ and filenames (case-sensitive) are exact.');
}
// --- End Register Custom Fonts ---

console.log('Custom Agent Task Logic Loaded - Now with Chart.js and Multiple Font Weights!');

interface ChartInputDataPoint {
  month?: string; // Example, make this more generic or typed based on chartType
  sales?: number; // Example
  category?: string;
  value?: number;
  label?: string;
  // Add other potential data structures
  [key: string]: any;
}

interface ChartInputContent {
  chartType: string;
  data: ChartInputDataPoint[]; 
  options?: {
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    width?: number; // Optional: width for the canvas
    height?: number; // Optional: height for the canvas
    fontFamily?: string; // Allow specifying font family per chart
    [key: string]: any; // Allow other chart.js options
  };
}

interface ChartOutputContent {
  chartImage?: string; 
  chartDataUrl?: string; 
  errorMessage?: string;
}

/**
 * YOUR CUSTOM LOGIC: Create a new task (generate a chart).
 */
export async function createTask(payload: Partial<Task> & { input: Message }, baseUrl: string): Promise<Task> {
  console.log('[MyAgentLogic] createTask called with payload:', JSON.stringify(payload, null, 2));
  console.log(`[MyAgentLogic] Using baseUrl: ${baseUrl}`);
  const taskId = `agent-task-${Date.now()}`;
  const now = new Date().toISOString();

  let taskStatus: TaskStatus = 'working'; 
  let taskResult: Message | undefined = undefined;
  let inputContent: ChartInputContent | undefined = undefined;
  const chartFilename = `${taskId}.png`; // Output as PNG
  const chartFilePath = path.join(chartsDir_logic, chartFilename);

  try {
    if (!payload.input || !payload.input.parts || payload.input.parts.length === 0) {
      throw new Error('Input message or parts are missing.');
    }
    const firstPart = payload.input.parts[0];
    if (firstPart.type !== 'data' || !firstPart.data) {
      throw new Error('Invalid input part type or missing data. Expected DataPart.');
    }
    inputContent = firstPart.data as ChartInputContent;
    if (!inputContent || !inputContent.chartType || !inputContent.data) {
      throw new Error('Missing required fields (chartType, data) in input data part.');
    }
    const { chartType, data, options = {} } = inputContent;
    console.log(`[MyAgentLogic] Processing chart generation for type: ${chartType}`);

    const canvasWidth = options.width || 800; // Default width
    const canvasHeight = options.height || 600; // Default height
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const chartFontFamily = options.fontFamily || customFontFamily;

    if (chartType.toLowerCase() === 'bar') {
      // Prepare data for Chart.js bar chart
      const labels = data.map(d => d.label || d.month || d.category || 'Unknown');
      const values = data.map(d => d.value || d.sales || 0);

      new Chart(ctx as any, { // Use 'as any' for ctx due to potential type mismatches with node-canvas
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: options.title || 'Dataset',
            data: values,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: false, // Important for node-canvas
          animation: false,  // Important for node-canvas
          scales: {
            y: {
              beginAtZero: true,
              title: { display: !!options.yAxisLabel, text: options.yAxisLabel, font: { family: chartFontFamily } },
              ticks: { font: { family: chartFontFamily } }
            },
            x: {
              title: { display: !!options.xAxisLabel, text: options.xAxisLabel, font: { family: chartFontFamily } },
              ticks: { font: { family: chartFontFamily } }
            }
          },
          plugins: {
            title: { display: !!options.title, text: options.title, font: { family: chartFontFamily, size: 18, weight: 'bold' } },
            legend: { labels: { font: { family: chartFontFamily } } },
            tooltip: { bodyFont: { family: chartFontFamily }, titleFont: { family: chartFontFamily } }
          }
        }
      });
    } else if (chartType.toLowerCase() === 'line') {
      const labels = data.map(d => d.label || d.month || d.category || 'Unknown'); // Assuming similar data structure for labels
      const values = data.map(d => d.value || d.sales || 0); // Assuming similar data structure for values

      new Chart(ctx as any, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: options.title || 'Dataset',
            data: values,
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: false,
          animation: false,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: !!options.yAxisLabel, text: options.yAxisLabel, font: { family: chartFontFamily } },
              ticks: { font: { family: chartFontFamily } }
            },
            x: {
              title: { display: !!options.xAxisLabel, text: options.xAxisLabel, font: { family: chartFontFamily } },
              ticks: { font: { family: chartFontFamily } }
            }
          },
          plugins: {
            title: { display: !!options.title, text: options.title, font: { family: chartFontFamily, size: 18, weight: 'bold' } },
            legend: { labels: { font: { family: chartFontFamily } } },
            tooltip: { bodyFont: { family: chartFontFamily }, titleFont: { family: chartFontFamily } }
          }
        }
      });
    } else {
      throw new Error(`Unsupported chartType: ${chartType}. Implemented types: 'bar', 'line'.`);
    }

    // Save canvas to PNG file
    const buffer = canvas.toBuffer('image/png');

    // --- Ensure output directory exists ---
    const outputDir = path.dirname(chartFilePath); // This will be chartsDir_logic

    if (!fs.existsSync(outputDir)) {
        console.warn(`[MyAgentLogic] Output directory ${outputDir} was expected to exist but was not found. Attempting to create it.`);
        try {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`[MyAgentLogic] Successfully created output directory: ${outputDir}`);
        } catch (mkdirError: any) {
            console.error(`[MyAgentLogic] CRITICAL: Failed to create output directory ${outputDir}. Error: ${mkdirError.message}`);
            // Rethrow to ensure the task fails if we can't create the directory.
            // The main try/catch block in createTask will handle this.
            throw mkdirError; 
        }
    }
    // --- End ensure output directory ---

    fs.writeFileSync(chartFilePath, buffer);
    console.log(`[MyAgentLogic] Chart image saved to: ${chartFilePath}`);
    
    const chartImageUrl = `${baseUrl}/charts/${chartFilename}`; 
    console.log(`[MyAgentLogic] Chart accessible at: ${chartImageUrl}`);

    const outputData: ChartOutputContent = { chartImage: chartImageUrl };
    const resultPart: DataPart = { type: 'data', mimeType: 'application/json', data: outputData };
    taskResult = { id: uuidv4(), role: 'agent', parts: [resultPart] };
    taskStatus = 'completed';

  } catch (error: any) {
    console.error('[MyAgentLogic] Error during task processing:', error.message);
    console.error(error.stack); // Log stack for more details
    taskStatus = 'failed';
    const errorOutput: ChartOutputContent = { errorMessage: error.message };
    const errorPart: DataPart = { type: 'data', mimeType: 'application/json', data: errorOutput };
    taskResult = { id: uuidv4(), role: 'agent', parts: [errorPart] };
  }

  const task: Task = {
    id: taskId,
    status: taskStatus,
    createdAt: now,
    updatedAt: new Date().toISOString(),
    input: payload.input,
    name: payload.name || `Chart Task ${taskId}`,
    description: payload.description || `Generates a ${inputContent?.chartType || 'chart'}`,
    result: taskResult,
  };
  
  console.log('[MyAgentLogic] Task finalized:', JSON.stringify(task, null, 2));
  return task;
}

/**
 * YOUR CUSTOM LOGIC: Get a task by ID.
 */
export async function getTask(id: string): Promise<Task | undefined> {
  console.log('[MyAgentLogic] getTask called for ID:', id);
  // TODO: Implement your actual logic to retrieve a task (e.g., from a database)
  // For now, if createTask is the only way to create tasks, they are not stored persistently here.
  return undefined; // Placeholder unless you implement storage
}

/**
 * YOUR CUSTOM LOGIC: Add a message to a task.
 */
export async function addMessageToTask(id: string, message: Message): Promise<Task | undefined> {
  console.log('[MyAgentLogic] addMessageToTask for ID:', id, 'Message:', message);
  // TODO: Implement if your chart agent supports interactive updates or conversational refinement.
  // This would involve retrieving the task, updating it based on the message, 
  // potentially re-generating the chart, and saving the updated task.
  return undefined; // Placeholder
}

/**
 * YOUR CUSTOM LOGIC: Cancel a running task.
 */
export async function cancelTask(id: string): Promise<Task | undefined> {
  console.log('[MyAgentLogic] cancelTask for ID:', id);
  // TODO: Implement cancellation if your chart generation is a long-running process
  // that can be interrupted (e.g., update task status to 'canceled' in a database).
  return undefined; // Placeholder
}

/**
 * YOUR CUSTOM LOGIC: List all tasks.
 */
export async function listTasks(): Promise<Task[]> {
  console.log('[MyAgentLogic] listTasks called');
  // TODO: Implement your actual logic to list tasks (e.g., from a database)
  return []; // Placeholder
} 