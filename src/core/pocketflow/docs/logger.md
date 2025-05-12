# PocketFlow Logger Design

## Overview
The PocketFlow Logger is a centralized logging system designed to provide both user-friendly console output and detailed logs for debugging. It follows a singleton pattern to ensure consistent logging across the entire PocketFlow system. The logger is designed to work in two modes:

1. **Workspace-Managed Mode**: When integrated with a workspace agent, logs are stored in the workspace's designated location
2. **Local Mode**: When no workspace is available, logs are stored locally in a `pocketflow-logs` directory

The logger provides a clean, user-friendly console experience with:
- High-level, actionable messages only
- Progress spinners for long-running operations
- Detailed logs saved to file for debugging

## Key Features

### 1. Dual Output System
- **User-Friendly Console Output**: 
  - Clean, high-level messages only
  - Progress spinners for long-running operations
  - Color-coded status indicators
  - No verbose debugging output
- **Detailed Logs**: Comprehensive logging for debugging and monitoring
- **Flexible Storage**: Automatic adaptation to workspace or local storage

### 2. Log Levels
- `debug`: Development-only detailed information (file only)
- `info`: General operational information (file only)
- `warn`: Warning messages for potential issues (file only)
- `error`: Error messages with user-friendly translations (console + file)
- `progress`: Long-running operation status (console spinner + file)
- `success`: Operation completion (console + file)

### 3. Log Entry Structure
```typescript
interface LogEntry {
    timestamp: string;    // ISO timestamp
    level: LogLevel;      // debug | info | warn | error | progress | success
    node: string;         // Node class name
    message: string;      // Log message
    details?: any;        // Optional additional context
    isConsoleOutput?: boolean; // Whether to show in console
    spinner?: {
        text: string;     // Spinner message
        status: 'start' | 'stop' | 'succeed' | 'fail';
    };
}
```

### 4. Console Output Management
```typescript
class ConsoleManager {
    private currentSpinner: Spinner | null = null;
    private lastMessage: string | null = null;

    showProgress(message: string) {
        if (this.currentSpinner) {
            this.currentSpinner.stop();
        }
        this.currentSpinner = new Spinner(message);
        this.currentSpinner.start();
    }

    showSuccess(message: string) {
        if (this.currentSpinner) {
            this.currentSpinner.succeed(message);
            this.currentSpinner = null;
        } else {
            console.log(chalk.green('✓ ' + message));
        }
    }

    showError(message: string) {
        if (this.currentSpinner) {
            this.currentSpinner.fail(message);
            this.currentSpinner = null;
        } else {
            console.error(chalk.red('✗ ' + message));
        }
    }

    showInfo(message: string) {
        if (this.currentSpinner) {
            this.currentSpinner.text = message;
        } else {
            console.log(chalk.blue('ℹ ' + message));
        }
    }
}
```

### 5. User-Friendly Error Messages
The logger automatically transforms technical error messages into user-friendly ones using a mapping system:
```typescript
const friendlyMessages = {
    'No successor found for action': 'Task flow could not proceed to the next step',
    'Node.*called directly with successors defined': 'Task flow configuration error',
    'Input.*is not an array': 'Invalid input format',
    // ... more mappings
};
```

## Implementation Details

### Singleton Pattern
```typescript
class PocketFlowLogger extends EventEmitter {
    private static instance: PocketFlowLogger;
    private logPath: string | null = null;
    private isWorkspaceManaged: boolean = false;
    private consoleManager: ConsoleManager;
    
    static getInstance(): PocketFlowLogger {
        if (!PocketFlowLogger.instance) {
            PocketFlowLogger.instance = new PocketFlowLogger();
        }
        return PocketFlowLogger.instance;
    }

    private constructor() {
        super();
        this.initializeLocalLogging();
        this.consoleManager = new ConsoleManager();
    }

    private initializeLocalLogging() {
        const localLogDir = path.join(process.cwd(), 'pocketflow-logs');
        if (!fs.existsSync(localLogDir)) {
            fs.mkdirSync(localLogDir, { recursive: true });
        }
        this.logPath = path.join(localLogDir, 'pocketflow.log');
    }

    progress(node: string, message: string) {
        this.consoleManager.showProgress(message);
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'progress',
            node,
            message,
            isConsoleOutput: true,
            spinner: { text: message, status: 'start' }
        });
    }

    success(node: string, message: string) {
        this.consoleManager.showSuccess(message);
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'success',
            node,
            message,
            isConsoleOutput: true,
            spinner: { text: message, status: 'succeed' }
        });
    }

    error(node: string, message: string, details?: any) {
        const friendlyMessage = this.getFriendlyMessage(message);
        this.consoleManager.showError(friendlyMessage);
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            node,
            message: friendlyMessage,
            details,
            isConsoleOutput: true,
            spinner: { text: friendlyMessage, status: 'fail' }
        });
    }
}
```

### Workspace Integration
The logger supports two modes of operation:

1. **Workspace-Managed Mode**
   - Activated when a workspace agent provides a log path
   - Logs are stored in the workspace's designated location
   - Path is managed by the workspace agent
   - Example: `{workspacePath}/logs/pocketflow.log`

2. **Local Mode**
   - Default mode when no workspace is available
   - Creates and uses `pocketflow-logs` directory in current working directory
   - Automatically handles directory creation and file management
   - Example: `./pocketflow-logs/pocketflow.log`

### Path Management
```typescript
class PocketFlowLogger {
    // ... other methods ...

    setWorkspaceLogPath(path: string) {
        this.logPath = path;
        this.isWorkspaceManaged = true;
    }

    private getLogPath(): string {
        if (!this.logPath) {
            throw new Error('Log path not initialized');
        }
        return this.logPath;
    }

    private async writeLog(entry: LogEntry) {
        const logPath = this.getLogPath();
        const logDir = path.dirname(logPath);
        
        // Ensure directory exists
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        // Write log entry
        const logLine = JSON.stringify(entry) + '\n';
        await fs.promises.appendFile(logPath, logLine);
    }
}
```

### Event System
- Extends EventEmitter for real-time log monitoring
- Emits 'log' events for each log entry
- Allows external systems to subscribe to log events

## Usage Examples

### Basic Logging
```typescript
const logger = PocketFlowLogger.getInstance();

// Progress with spinner
logger.progress('MyNode', 'Processing data...');

// Success message
logger.success('MyNode', 'Data processed successfully');

// Error with friendly message
logger.error('MyNode', 'Failed to process data', { error: err });

// Debug (file only)
logger.debug('MyNode', 'Detailed processing info', { data });
```

### Console Output Examples
```
⠋ Processing data...                    // Spinner while processing
✓ Data processed successfully            // Success message
✗ Failed to process data                 // Error message
ℹ Starting new task                      // Info message
```

### Workspace Integration
```typescript
// Workspace agent sets the log path
logger.setWorkspaceLogPath('/path/to/workspace/logs/pocketflow.log');

// If no workspace path is set, logs automatically go to:
// ./pocketflow-logs/pocketflow.log
```

## Best Practices

1. **Console Output**
   - Use progress spinners for operations > 1 second
   - Keep console messages high-level and actionable
   - Use appropriate message types (progress, success, error)
   - Avoid debug/info messages in console

2. **Node Identification**
   - Always use the node's class name as the node identifier
   - Helps with log filtering and debugging

3. **Error Context**
   - Include relevant context in error logs
   - Use the details parameter for additional information
   - Keep console error messages user-friendly

4. **Message Clarity**
   - Write clear, descriptive messages
   - Use consistent message formatting
   - Focus on user impact in console messages

5. **Path Management**
   - Let workspace agents manage log paths when available
   - Fall back to local logging when no workspace is present
   - Never hardcode log paths in nodes or flows

## Integration with PocketFlow

The logger is integrated into the PocketFlow system at multiple levels:

1. **Base Flow**
   - Shows progress during flow execution
   - Displays success/error messages for flow completion
   - Logs detailed flow transitions to file

2. **Node Implementation**
   - Uses spinners for long-running node operations
   - Provides clear success/error messages
   - Logs detailed node lifecycle to file

3. **Batch Processing**
   - Shows progress for batch operations
   - Updates spinner with current item status
   - Logs detailed batch progress to file

4. **Workspace Integration**
   - Workspace agents can set log paths
   - Automatic fallback to local logging
   - Seamless transition between modes

## Future Enhancements

1. **Console Experience**
   - Add progress bars for batch operations
   - Support multiple concurrent spinners
   - Add estimated time remaining
   - Support custom console themes

2. **Log Rotation**
   - Implement log file rotation
   - Add log retention policies
   - Separate rotation for workspace and local logs

3. **Log Filtering**
   - Add log level filtering
   - Implement node-specific filtering
   - Support workspace-specific filters

4. **Metrics Collection**
   - Add performance metrics
   - Track execution times
   - Monitor resource usage

5. **External Integration**
   - Add support for external log aggregation
   - Implement log forwarding
   - Add structured logging formats 