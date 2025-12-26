import { VSCode } from "./vscode";
import { IWebViewMessage, ILogMessage, ViewResponse } from "@soase/shared";

export class Log {
    private static vscode: VSCode;

    /**
     * Initialize the logger with the VSCode API instance.
     * Must be called once before using the logger.
     */
    public static initialize(vscode: VSCode): void {
        this.vscode = vscode;
    }

    public static info(message: string, data?: any): void {
        this.log("info", message, data);
    }

    public static warn(message: string, data?: any): void {
        this.log("warn", message, data);
    }

    public static error(message: string, data?: any): void {
        this.log("error", message, data);
    }

    private static log(level: "info" | "warn" | "error", text: string, data?: any): void {
        // Log to console for webview dev tools.
        // Selects the appropriate console method by name key.
        console[level](text, data);

        // Create log message structure.
        const logMessage: ILogMessage = {
            level: level,
            text: text,
            data: data
        };

        // Pack message log information.
        const message: IWebViewMessage = {
            type: ViewResponse.LOG,
            data: logMessage
        };

        // Send log message to extension host.
        this.vscode.postMessage(message);
    }
}
