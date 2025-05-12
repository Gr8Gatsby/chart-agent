import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora, { Ora } from 'ora';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'progress' | 'success';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    node: string;
    message: string;
    details?: any;
    isConsoleOutput?: boolean;
    spinner?: {
        text: string;
        status: 'start' | 'stop' | 'succeed' | 'fail';
    };
}

class ConsoleManager {
    private currentSpinner: Ora | null = null;
    private lastMessage: string | null = null;

    showProgress(message: string) {
        if (this.currentSpinner) {
            this.currentSpinner.stop();
        }
        this.currentSpinner = ora(message).start();
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

export class PocketFlowLogger extends EventEmitter {
    private static instance: PocketFlowLogger;
    private logPath: string | null = null;
    private isWorkspaceManaged: boolean = false;
    private consoleManager: ConsoleManager;

    private readonly friendlyMessages: Record<string, string> = {
        'No successor found for action': 'Task flow could not proceed to the next step',
        'Node.*called directly with successors defined': 'Task flow configuration error',
        'Input.*is not an array': 'Invalid input format',
        'Failed to execute node': 'Task step failed to complete',
        'Invalid node configuration': 'Task configuration is invalid',
        'Timeout exceeded': 'Task step took too long to complete',
        'Resource not found': 'Required resource is not available',
        'Permission denied': 'Insufficient permissions to perform task',
        'Network error': 'Failed to connect to required service',
        'Invalid response format': 'Received unexpected response format',
    };

    private constructor() {
        super();
        this.consoleManager = new ConsoleManager();
        this.initializeLocalLogging();
    }

    static getInstance(): PocketFlowLogger {
        if (!PocketFlowLogger.instance) {
            PocketFlowLogger.instance = new PocketFlowLogger();
        }
        return PocketFlowLogger.instance;
    }

    private initializeLocalLogging() {
        const localLogDir = path.join(process.cwd(), 'pocketflow-logs');
        if (!fs.existsSync(localLogDir)) {
            fs.mkdirSync(localLogDir, { recursive: true });
        }
        this.logPath = path.join(localLogDir, 'pocketflow.log');
    }

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

    private getFriendlyMessage(message: string): string {
        for (const [pattern, friendly] of Object.entries(this.friendlyMessages)) {
            if (new RegExp(pattern).test(message)) {
                return friendly;
            }
        }
        return message;
    }

    private async writeLog(entry: LogEntry) {
        const logPath = this.getLogPath();
        const logDir = path.dirname(logPath);
        
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        const logLine = JSON.stringify(entry) + '\n';
        await fs.promises.appendFile(logPath, logLine);
        this.emit('log', entry);

        // Print to console if requested
        if (entry.isConsoleOutput) {
            let formatted = '';
            switch (entry.level) {
                case 'success':
                    formatted = chalk.green(`✓ [${entry.node}] ${entry.message}`);
                    break;
                case 'error':
                    formatted = chalk.red(`✗ [${entry.node}] ${entry.message}`);
                    break;
                case 'warn':
                    formatted = chalk.yellow(`! [${entry.node}] ${entry.message}`);
                    break;
                case 'progress':
                    formatted = chalk.blue(`… [${entry.node}] ${entry.message}`);
                    break;
                case 'info':
                    formatted = chalk.cyan(`[${entry.node}] ${entry.message}`);
                    break;
                case 'debug':
                    formatted = chalk.gray(`[${entry.node}] ${entry.message}`);
                    break;
                default:
                    formatted = `[${entry.node}] ${entry.message}`;
            }
            // Print to appropriate console method
            if (entry.level === 'error') {
                console.error(formatted);
            } else if (entry.level === 'warn') {
                console.warn(formatted);
            } else {
                console.log(formatted);
            }
        }
    }

    debug(node: string, message: string, details?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'debug',
            node,
            message,
            details,
            isConsoleOutput: true
        });
    }

    info(node: string, message: string, details?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            node,
            message,
            details,
            isConsoleOutput: true
        });
    }

    warn(node: string, message: string, details?: any) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            level: 'warn',
            node,
            message,
            details,
            isConsoleOutput: true
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
} 