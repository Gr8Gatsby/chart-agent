# Chart Generation Agent for Vercel

This project is a minimal agent designed for deployment on Vercel. It utilizes Chart.js and node-canvas to dynamically generate chart images based on A2A (Agent-to-Agent) task requests. It supports custom fonts for consistent chart rendering.

## Key Features

*   **A2A Compliant:** Implements A2A endpoints for task creation, status checking, and artifact retrieval using a custom integration with `@core/a2a` components.
*   **Dynamic Chart Generation:** Generates various chart types (e.g., bar, line) using Chart.js and renders them to PNG images via node-canvas.
*   **Custom Font Support:** Allows registration and use of custom TTF fonts for chart rendering, ensuring consistent text appearance across environments.
*   **Vercel Optimized:** Configured for easy deployment as a serverless function on Vercel.
*   **Static File Serving:** Serves generated charts statically.
*   **Typed Codebase:** Written in TypeScript for better maintainability and development experience.

## Technologies Used

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Language:** TypeScript
*   **Build Tool:** `tsup` (for bundling TypeScript into ESM for Node.js)
*   **Charting Library:** Chart.js
*   **Canvas Implementation:** node-canvas (for server-side chart rendering)
*   **A2A Core Logic:** Components from `@core/a2a` (assumed to be a local library at `src/core/a2a`)
*   **Dependencies:** `uuid` (for ID generation), `zod` (for schema validation, used by `@core/a2a`)
*   **Testing:** `vitest` (setup, but specific tests not detailed in context)
*   **Deployment:** Vercel

## Project Structure

```
/
├── api/                  # (Output) Compiled serverless function for Vercel (ignored by Git)
├── public/
│   └── generated_charts/ # Directory where generated chart images are saved
├── src/
│   ├── agent/            # Main agent logic
│   │   ├── index.ts      # Express server setup, A2A endpoint wiring, static serving
│   │   ├── myAgentTaskLogic.ts # Custom logic for chart generation, task handling
│   │   └── agent.json    # Agent card template
│   ├── assets/
│   │   └── fonts/        # Custom .ttf font files (e.g., Roboto-Regular.ttf)
│   └── core/             # Core libraries (e.g., a2a, llm, pocketflow - assumed local)
├── .gitignore
├── package.json
├── tsconfig.json         # TypeScript configuration
└── vercel.json           # Vercel deployment configuration
```

## Setup and Local Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Run in Development Mode:**
    This command uses `tsup` to build the agent and then starts a local server using `nodemon` (or similar, via `onSuccess` script), enabling live reloading.
    ```bash
    npm run dev
    ```
    The agent will typically be available at `http://localhost:3001`.
    *   A2A Endpoint: `http://localhost:3001/a2a`
    *   Agent Card: `http://localhost:3001/a2a/.well-known/agent.json`
    *   Generated Charts: `http://localhost:3001/charts/<chart-filename>.png`

## Build

To build the agent for production (compiles TypeScript to JavaScript in the `api` directory):
```bash
npm run build
```
This uses `tsup` as defined in `package.json`.

## Deployment to Vercel

This project is configured for Vercel deployment.

1.  Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel.
2.  Vercel will use the `vercel-build` script from `package.json` (which is `npm run build`).
3.  The `vercel.json` file configures Vercel to:
    *   Use `@vercel/node` for the serverless function.
    *   Route all incoming requests (`/(.*)`) to the `api/index.mjs` serverless function.
4.  Ensure the **Framework Preset** in your Vercel Project Settings (Dashboard > Your Project > Settings > General) is set to **"Other"**. The `vercel.json` file will then take precedence for build and routing configurations.

## A2A API Endpoints

The agent exposes standard A2A endpoints under the `/a2a` path, including:

*   `POST /a2a/tasks/send`: To create a new task (e.g., generate a chart).
*   `GET /a2a/tasks/:id`: To get the status and result of a task.
*   (Other A2A endpoints as implemented by `@core/a2a/src/server.ts` and wired in `src/agent/index.ts`)

Refer to the A2A specification and `src/agent/index.ts` for detailed endpoint behavior.

## Chart Generation

To request a chart, send a POST request to the `/a2a/tasks/send` endpoint. The `input` message part should be `application/json` and contain:

```json
{
  "chartType": "bar", // or "line", etc.
  "data": [
    // Array of data points suitable for Chart.js
    // e.g., { "label": "January", "value": 100 }
  ],
  "options": {
    // Optional: Chart.js options
    "title": "My Awesome Chart",
    "xAxisLabel": "Months",
    "yAxisLabel": "Values",
    "width": 800, // optional canvas width
    "height": 600 // optional canvas height
  }
}
```

The task result will include a URL to the generated chart image (e.g., `http://<your-deployment-url>/charts/agent-task-....png`).

## Custom Fonts

*   Place your `.ttf` font files in the `src/assets/fonts/` directory.
*   `src/agent/myAgentTaskLogic.ts` registers these fonts with `node-canvas` on startup.
*   The registered fonts can then be used in Chart.js options (e.g., by setting `Chart.defaults.font.family` or specifying font family in individual chart options).
*   The agent currently registers fonts under the family name `"RobotoCustom"`.

---

This README provides a good starting point. You can expand it with more specific details as your project evolves. 