// src/agent/myAgentTaskLogic.ts
import { Task, Message, TaskStatus, Part, DataPart } from '../core/a2a/src/types';
import { v4 as uuidv4 } from 'uuid'; // For generating message IDs
import QuickChart from 'quickchart-js'; // Standard default import

// --- Simple in-memory store for chart data URLs (can store QuickChart URLs now) ---
const chartDataStore = new Map<string, string>();

// Function to retrieve stored data URL
export function getChartDataUrl(id: string): string | undefined {
  return chartDataStore.get(id);
}

const customFontFamily = 'sans-serif';

console.log('💡 Custom task logic ready (using QuickChart.io for SVG generation)!');

interface ChartInputDataPoint {
  month?: string;
  sales?: number;
  category?: string;
  value?: number;
  label?: string;
  [key: string]: any;
}

interface ChartInputContent {
  chartType: string;
  data: ChartInputDataPoint[];
  options?: {
    title?: string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    width?: number;
    height?: number;
    fontFamily?: string;
    [key: string]: any;
  };
}

interface ChartOutputContent {
  message?: string;
  chartRenderUrl?: string; // This will now be a QuickChart URL
  errorMessage?: string;
}

/**
 * YOUR CUSTOM LOGIC: Create a new task (generate a chart).
 */
export async function createTask(payload: Partial<Task> & { input: Message }, baseUrl: string): Promise<Task> {
  const taskName = payload.name || `Chart Task ${Date.now()}`;
  let chartTypeDisplay = 'Unknown';
  if (payload.input?.parts?.[0]?.type === 'data') {
    const firstPart = payload.input.parts[0] as DataPart;
    chartTypeDisplay = firstPart.data?.chartType || 'Data (type unspecified)';
  }
  console.log(`🚀 New task: "${taskName}" (Input Type: ${chartTypeDisplay})`);
  // console.log(`   🌍 Base URL for links: ${baseUrl}`); // BaseUrl might be less relevant if QuickChart provides full URLs

  const taskId = `agent-task-${Date.now()}`;
  const now = new Date().toISOString();

  let taskStatus: TaskStatus = 'working';
  let taskResult: Message | undefined = undefined;
  let inputContent: ChartInputContent | undefined = undefined;

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
    console.log(`   ⚙️ Generating '${chartType}' chart using QuickChart.io...`);

    const chartWidth = options.width || 800;
    const chartHeight = options.height || 600;
    const effectiveFontFamily = options.fontFamily || customFontFamily;

    const chartJsConfig: any = {
        type: chartType.toLowerCase(),
        data: {},
        options: {
            responsive: false, // QuickChart handles dimensions
            animation: false, // Animations not relevant for static image
            plugins: {
                title: { display: !!options.title, text: options.title, font: { family: effectiveFontFamily, size: 18, weight: 'bold' } },
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
            ...options // Spread other options from input
        }
    };

    if (chartJsConfig.type === 'bar' || chartJsConfig.type === 'line') {
        chartJsConfig.data.labels = data.map(d => d.label || d.month || d.category || 'Unknown');
        chartJsConfig.data.datasets = [{
            label: options.title || 'Dataset',
            data: data.map(d => d.value || d.sales || 0),
            backgroundColor: chartJsConfig.type === 'bar' ? 'rgba(75, 192, 192, 0.2)' : undefined,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: chartJsConfig.type === 'line' ? false : undefined,
            tension: chartJsConfig.type === 'line' ? 0.1 : undefined,
        }];
    } else {
        throw new Error(`Unsupported chartType: ${chartType}. Implemented types for direct config: 'bar', 'line'.`);
    }

    const chart = new QuickChart();
    chart.setConfig(chartJsConfig);
    chart.setWidth(chartWidth);
    chart.setHeight(chartHeight);
    chart.setFormat('svg'); // Specify SVG format
    // chart.setBackgroundColor('transparent'); // Optional

    // Get the public URL from QuickChart
    const quickChartUrl = await chart.getShortUrl(); // Using short URL for brevity; getUrl() for full one.
    // const quickChartUrl = chart.getUrl(); // Alternative for longer, direct URL

    if (!quickChartUrl) {
        throw new Error('Failed to generate chart URL from QuickChart.io.');
    }
    console.log(`   📊 QuickChart.io URL (SVG): ${quickChartUrl}`);

    // Store the QuickChart URL in the in-memory map
    chartDataStore.set(taskId, quickChartUrl);
    console.log(`   💾 Stored QuickChart URL in memory for task ID: ${taskId}`);

    // Return a success message and the QuickChart URL
    // const renderUrl = `${baseUrl}/charts/${chartFilename}`; // No longer relevant
    const outputData: ChartOutputContent = {
      message: 'Chart generated successfully via QuickChart.io.',
      chartRenderUrl: quickChartUrl
    };
    const resultPart: DataPart = { type: 'data', mimeType: 'application/json', data: outputData };
    taskResult = { id: uuidv4(), role: 'agent', parts: [resultPart] };
    taskStatus = 'completed';

  } catch (error: any) {
    console.error(`🔥 Task error ("${taskName}"): ${error.message}`);
    console.error(error.stack);
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
    description: payload.description || `Generates a ${inputContent?.chartType || 'chart'} viewable at ${chartDataStore.get(taskId) || 'a QuickChart URL'}`, // Updated description
    result: taskResult,
    // Any other fields from payload that should be preserved
    ...(payload.endpoint && { endpoint: payload.endpoint }),
    ...(payload.progress && { progress: payload.progress }),
    ...(payload.parentId && { parentId: payload.parentId }),
    ...(payload.children && { children: payload.children }),
    ...(payload.metadata && { metadata: payload.metadata }),
  };
  return task;
}

/**
 * YOUR CUSTOM LOGIC: Get a specific task by ID.
 */
export async function getTask(id: string): Promise<Task | undefined> {
  // This is a placeholder. You'll need to implement actual task retrieval logic,
  // potentially from a database or an in-memory store if tasks are managed within this agent.
  // For now, it returns undefined as if the task is not found.
  console.log(`🔎 Getting task by ID: ${id}`);
  // Example: If you were storing tasks in a Map called 'allTasks'
  // return allTasks.get(id);
  return undefined;
}

/**
 * YOUR CUSTOM LOGIC: Add a message to a task (e.g., user feedback or new instructions).
 */
export async function addMessageToTask(id: string, message: Message): Promise<Task | undefined> {
  console.log(`💬 Adding message to task ID: ${id}`, message);
  // Placeholder: Implement logic to find the task and add the message.
  // This might involve updating the task's message history or re-evaluating the task.
  const task = await getTask(id); // Example: retrieve the task
  if (task) {
    // task.messages.push(message); // Example: if tasks have a messages array
    task.updatedAt = new Date().toISOString();
    // Potentially update task status or result based on the new message
    // await saveTask(task); // Example: persist changes
    return task;
  }
  return undefined;
}

/**
 * YOUR CUSTOM LOGIC: Cancel a running task.
 */
export async function cancelTask(id: string): Promise<Task | undefined> {
  console.log(`🛑 Cancelling task ID: ${id}`);
  const task = await getTask(id); // Example: retrieve the task
  // Ensure task status is one that can be cancelled, e.g., 'in_progress' or 'submitted'
  if (task && (task.status === 'in_progress' || task.status === 'submitted')) {
    task.status = 'canceled'; // Corrected to match TaskStatus type
    task.updatedAt = new Date().toISOString();
    // await saveTask(task); // Example: persist changes
    return task;
  }
  return undefined;
}

/**
 * YOUR CUSTOM LOGIC: List all tasks (potentially with filtering/pagination).
 */
export async function listTasks(): Promise<Task[]> {
  console.log('📋 Listing all tasks');
  // Placeholder: Implement logic to retrieve all tasks.
  // Example: return Array.from(allTasks.values());
  return [];
} 