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
console.log('🗺️ Paths configured:');
console.log(`   📁 Project Root: ${projectRootDir_logic}`);
console.log(`   🖼️ Charts Output: ${chartsDir_logic}`);
console.log(`   ✒️ Fonts Directory: ${fontsDir_logic}`);
// --- End setup ---

// --- Register Custom Fonts ---
const customFontFamily = 'RobotoCustom'; // The family name you'll use in Chart.js
const fontFilesToRegister = [
  { path: path.join(fontsDir_logic, 'Roboto-Regular.ttf'), weight: 'normal' },
  { path: path.join(fontsDir_logic, 'Roboto-Bold.ttf'), weight: 'bold' },
  { path: path.join(fontsDir_logic, 'Roboto-Light.ttf'), weight: 'light' }
];

let fontsRegistered = 0;
console.log('🎨 Registering custom fonts...');
fontFilesToRegister.forEach(fontInfo => {
  console.log(`   ⚙️ Checking for font at: ${fontInfo.path}`); // Log the exact path being checked
  if (fs.existsSync(fontInfo.path)) {
    registerFont(fontInfo.path, { family: customFontFamily, weight: fontInfo.weight });
    console.log(`   ✅ Registered: ${path.basename(fontInfo.path)} (${fontInfo.weight})`);
    fontsRegistered++;
  } else {
    console.warn(`   ⚠️ Font not found: ${path.basename(fontInfo.path)} at ${fontInfo.path}`);
  }
});

if (fontsRegistered > 0) {
  Chart.defaults.font.family = customFontFamily;
  Chart.defaults.font.size = 12;
  console.log(`🖌️ Chart.js default font: ${customFontFamily}`);
} else {
  console.warn('🚫 No custom fonts registered. Charts may use fallback fonts.');
}
// --- End Register Custom Fonts ---

console.log('💡 Custom task logic ready (Chart.js & fonts)!');

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
  const taskName = payload.name || `Chart Task ${Date.now()}`;
  // Safely access chartType after checking part type
  let chartTypeDisplay = 'Unknown';
  if (payload.input?.parts?.[0]?.type === 'data') {
    const firstPart = payload.input.parts[0] as DataPart; // Cast to DataPart
    chartTypeDisplay = firstPart.data?.chartType || 'Data (type unspecified)';
  }
  console.log(`🚀 New task: "${taskName}" (Input Type: ${chartTypeDisplay})`);
  console.log(`   🌍 Base URL for links: ${baseUrl}`);
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
    console.log(`   ⚙️ Generating '${chartType}' chart...`);

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
        console.warn(`   ⚠️ Output dir missing. Creating: ${outputDir}`);
        try {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`   ✅ Output dir created: ${outputDir}`);
        } catch (mkdirError: any) {
            console.error(`   ❌ CRITICAL: Failed to create dir ${outputDir}: ${mkdirError.message}`);
            // Rethrow to ensure the task fails if we can't create the directory.
            // The main try/catch block in createTask will handle this.
            throw mkdirError; 
        }
    }
    // --- End ensure output directory ---

    fs.writeFileSync(chartFilePath, buffer);
    console.log(`   🖼️ Chart saved: ${path.basename(chartFilePath)}`);
    
    const chartImageUrl = `${baseUrl}/charts/${chartFilename}`; 
    console.log(`   🔗 Chart URL: ${chartImageUrl}`);

    const outputData: ChartOutputContent = { chartImage: chartImageUrl };
    const resultPart: DataPart = { type: 'data', mimeType: 'application/json', data: outputData };
    taskResult = { id: uuidv4(), role: 'agent', parts: [resultPart] };
    taskStatus = 'completed';

  } catch (error: any) {
    console.error(`🔥 Task error ("${taskName}"): ${error.message}`);
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
  
  const statusEmoji = taskStatus === 'completed' ? '✅' : taskStatus === 'failed' ? '❌' : '⏳';
  console.log(`🏁 Task ${statusEmoji} ${task.status}: "${task.name}" (ID: ${task.id})`);
  return task;
}

/**
 * YOUR CUSTOM LOGIC: Get a task by ID.
 */
export async function getTask(id: string): Promise<Task | undefined> {
  console.log(`🔍 Get task: ${id}`);
  // TODO: Implement your actual logic to retrieve a task (e.g., from a database)
  // For now, if createTask is the only way to create tasks, they are not stored persistently here.
  return undefined; // Placeholder unless you implement storage
}

/**
 * YOUR CUSTOM LOGIC: Add a message to a task.
 */
export async function addMessageToTask(id: string, message: Message): Promise<Task | undefined> {
  console.log(`💬 Add message to task: ${id}`);
  // TODO: Implement if your chart agent supports interactive updates or conversational refinement.
  // This would involve retrieving the task, updating it based on the message, 
  // potentially re-generating the chart, and saving the updated task.
  return undefined; // Placeholder
}

/**
 * YOUR CUSTOM LOGIC: Cancel a running task.
 */
export async function cancelTask(id: string): Promise<Task | undefined> {
  console.log(`🛑 Cancel task: ${id}`);
  // TODO: Implement cancellation if your chart generation is a long-running process
  // that can be interrupted (e.g., update task status to 'canceled' in a database).
  return undefined; // Placeholder
}

/**
 * YOUR CUSTOM LOGIC: List all tasks.
 */
export async function listTasks(): Promise<Task[]> {
  console.log('📋 List tasks');
  // TODO: Implement your actual logic to list tasks (e.g., from a database)
  return []; // Placeholder
} 