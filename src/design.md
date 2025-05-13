# Chart Agent Design Document

## 1. Overview

The Chart Agent is a specialized agent responsible for generating visual charts based on user-provided data and specifications. It leverages the QuickChart.io service to create and host chart images, making them accessible via a URL.

## 2. Purpose

The primary purpose of this agent is to:

*   Accept structured data and charting parameters as input.
*   Utilize the QuickChart.io service (via the `quickchart-js` library) to generate chart images (SVG format by default).
*   Provide a URL to the remotely hosted chart image.

## 3. Core Components & Functionality

### 3.1. Agent Configuration (`agent.json`)

*   **ID**: `chart-agent-001`
*   **Name**: Chart Agent
*   **Description**: "This agent creates charts based on provided data and specifications."
*   **Capabilities**: `chart-generation`, `data-visualization`
*   **Input Schema**:
    *   `chartType` (string, required): Type of chart (e.g., "bar", "line").
    *   `data` (array, required): Array of data objects for the chart.
    *   `options` (object, optional): Additional chart options (e.g., title, axis labels, width, height, font family).
*   **Output Schema (as per `agent.json`)**:
    *   `chartImage` (string, uri, required): URL of the generated chart image (this will be a QuickChart.io URL).
    *   `chartDataUrl` (string, uri, optional): URL to the underlying chart data/specification (could be a QuickChart.io short URL if it embeds the data definition, or a separate link if data is stored elsewhere).

### 3.2. Task Logic (`myAgentTaskLogic.ts`)

*   **Technology**: Node.js, using the `quickchart-js` library to interface with QuickChart.io for chart generation and hosting.
*   **Supported Chart Types (via direct configuration)**: 
    *   `bar` charts
    *   `line` charts
    *   Other types supported by Chart.js could potentially be passed through to QuickChart.io, but the agent currently has explicit data mapping logic for bar and line types.
*   **Chart Generation Process**:
    1.  Receives a task with input data.
    2.  Constructs a Chart.js configuration object.
    3.  Uses `quickchart-js` to send this configuration to QuickChart.io.
    4.  QuickChart.io generates the chart (SVG by default) and returns a URL (typically a short URL).
*   **File Output**: None directly by the agent. Charts are hosted by QuickChart.io.
*   **Output (Actual from implementation)**:
    *   `message` (string): Confirmation message (e.g., "Chart generated successfully via QuickChart.io.").
    *   `chartRenderUrl` (string): A URL provided by QuickChart.io (e.g., `https://quickchart.io/chart/render/...` or `https://quickchart.io/chart?c=...`) pointing to the generated SVG file.
    *   `errorMessage` (string, on failure): Describes the error.
*   **Font Handling**:
    *   Uses a default web-safe font (`sans-serif`) but allows specifying `fontFamily` in input `options`. These are passed to QuickChart.io.
*   **Task Management**: Integrated into a broader agent/task framework (A2A types).

## 4. Data Flow

1.  **Input**: Client sends a request with `chartType`, `data`, and `options`.
2.  **Processing (`myAgentTaskLogic.ts`)**:
    *   `createTask` is invoked.
    *   Input is validated.
    *   Chart.js config is assembled.
    *   `quickchart-js` sends config to QuickChart.io.
    *   QuickChart.io returns a URL to the generated chart.
3.  **Output**: Response includes a status message and the `chartRenderUrl` (QuickChart.io URL).

## 5. Key Considerations & Potential Enhancements

*   **Dependency on External Service**: Relies on QuickChart.io for chart rendering and hosting. Availability and terms of service of QuickChart.io are critical.
*   **QuickChart URL Type**: The agent currently uses `getShortUrl()`. Short URLs from QuickChart.io might have an expiration policy for free tiers. `getUrl()` could be used for longer, data-embedded URLs if persistence (without QuickChart account features) is prioritized over URL length.
*   **Extensibility**: Adding support for more Chart.js chart types is straightforward by extending the configuration logic.
*   **Security**: The agent itself doesn't handle file paths for output, reducing some risks. Input validation is still important.
*   **State/Storage**: An in-memory `chartDataStore` now stores the QuickChart.io URL. This is suitable for transient references. Persistent storage of task metadata would be handled by the broader A2A framework.

## 6. Directory Structure (Relevant after changes)

```
src/
├── agent/
│   ├── agent.json           # Agent definition and schema
│   └── myAgentTaskLogic.ts  # Core logic using quickchart-js
├── core/
│   ├── a2a/                 # Agent-to-Agent communication (inferred)
│   └── ...                  # Other core components
└── assets/
    └── fonts/               # (Still present, but less critical for direct chart rendering)
```
(The `public/generated_charts` directory is no longer used by this agent for output.)

This document reflects the design using QuickChart.io for chart generation and hosting. 