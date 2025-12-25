/**
 * The VSCode API interface for the webview.
 */
export interface VSCodeApi {
    /**
     * Posts a message to the extension host.
     * @param message The message to post.
     */
    postMessage(message: any): void;

    /**
     * Gets the current state of the webview.
     * @returns The current state.
     */
    getState(): any;

    /**
     * Sets the state of the webview.
     * @param state The state to set.
     */
    setState(state: any): void;
}

/**
 * Acquires the VS Code API instance.
 * This function is provided by VS Code in the webview global scope.
 * It is a function object injected into the `window` instance.
 * @returns The VS Code API instance.
 */
export function acquireVsCodeApi(): VSCodeApi {
    return (window as any).acquireVsCodeApi();
}
