import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { IWebViewMessage, ServerRequest, ViewRequest, ViewResponse } from "@soase/shared";
import { ClientManager } from "../client";

/**
 * Encapsulates the Research panel webview.
 */
export class ResearchPanel {
    private static readonly VIEW_TYPE: string = "soase.ResearchPanel";
    private static readonly VIEW_TITLE: string = "Research Visualizer";

    private static viewResourceRoot: vscode.Uri;

    private static currentPanel: ResearchPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];

    /**
     * A static factory method to show the singleton Research panel.
     * This will reuse an existing panel or create new one if none exists.
     * @param context The extension context.
     */
    public static show(context: vscode.ExtensionContext): void {
        if (ResearchPanel.currentPanel) {
            ResearchPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        ResearchPanel.viewResourceRoot = vscode.Uri.joinPath(context.extensionUri, "dist", "view-research");

        const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
            ResearchPanel.VIEW_TYPE,
            ResearchPanel.VIEW_TITLE,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [ResearchPanel.viewResourceRoot]
            }
        );

        ResearchPanel.currentPanel = new ResearchPanel(panel, context);
    }

    /**
     * A private constructor to enforce singleton pattern.
     * @param panel The webview panel.
     * @param context The extension context.
     */
    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this.panel = panel;
        this.context = context;

        this.panel.webview.html = ResearchPanel.getHtml(this.panel.webview);
        this.panel.webview.onDidReceiveMessage((message) => this.onDidReceiveMessage(message), null, this.disposables);

        this.panel.onDidDispose(
            () => {
                ResearchPanel.currentPanel = undefined;
                this.dispose();
            },
            null,
            this.disposables
        );
    }

    /**
     * Generates the initial HTML content for the research tree webview.
     * @param webview The webview instance.
     * @returns The HTML content as a string.
     */
    private static getHtml(webview: vscode.Webview): string {
        const scriptPath = vscode.Uri.joinPath(ResearchPanel.viewResourceRoot, "index.js");
        const scriptUri: vscode.Uri = webview.asWebviewUri(scriptPath);

        const nonce: string = ResearchPanel.getNonce();

        const html: string = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
              <title>${ResearchPanel.VIEW_TITLE}</title>
            </head>
            <body>
                <div style="padding: 20px; background-color: var(--vscode-editor-background);">
                    <label for="player-selector" style="margin-right: 10px;">Player:</label>
                    <select
                        id="player-selector"
                        style="
                            padding: 4px 8px;
                            background-color: var(--vscode-input-background);
                            color: var(--vscode-input-foreground);
                            border: 1px solid var(--vscode-input-border);
                            border-radius: 2px;
                            min-width: 200px;
                        "
                    >
                        <option value="">Loading players...</option>
                    </select>
                </div>

                <div id="research-tree-container"></div>

                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
        return html;
    }

    /**
     * Generates a nonce for Content Security Policy (CSP).
     * @returns A random nonce string.
     */
    private static getNonce(): string {
        let text: string = "";
        const possible: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let index = 0; index < 32; index++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    /**
     * Disposes of the panel and its resources.
     */
    public dispose(): void {
        this.disposables.forEach((disposable) => disposable.dispose());
        this.disposables = [];
    }

    /**
     * Handles messages received from the webview.
     * @param message The message received.
     * @returns A promise that resolves when the message is handled.
     */
    private async onDidReceiveMessage(message: IWebViewMessage): Promise<void> {
        switch (message.type) {
            case ViewResponse.READY:
                await this.update_PlayerList();
                break;
            case ViewResponse.PLAYER_SELECT:
                if (message.identifier) {
                    await this.update_PlayerData(message.identifier);
                }
                break;
            case ViewResponse.FILE_OPEN:
                await this.openFile(message.identifier);
                break;
            default:
                console.warn(`<ResearchPanel::onDidReceiveMessage> Unhandled message type: ${message.type}`);
        }
    }

    /**
     * Gets the language client instance.
     * @returns The LanguageClient or undefined if not available.
     */
    private getLanguageClient(): LanguageClient | undefined {
        const clients: Map<string, LanguageClient> = ClientManager.getLanguageClients();
        if (clients && clients.size > 0) {
            const client: [string, LanguageClient] = Array.from(clients)[0];
            return client[1];
        } else {
            return undefined;
        }
    }

    /**
     * Requests a list of `*.player` files from the language server, then sends it to the webview.
     * @return A promise that resolves when the data is requested.
     */
    private async update_PlayerList(): Promise<void> {
        const client: LanguageClient | undefined = this.getLanguageClient();
        if (!client) {
            console.warn("<ResearchPanel::update_PlayerList> No language client available.");
            return;
        }

        const players: string[] = await client.sendRequest(ServerRequest.PLAYERS, {});
        this.panel.webview.postMessage({ type: ViewRequest.PLAYER_LIST, data: players });
    }

    /**
     * Requests research data for a specific player from the language server.
     * @param playerIdentifier The ID of the player to request research data for.
     * @return A promise that resolves when the data is requested.
     */
    private async update_PlayerData(playerIdentifier: string): Promise<void> {
        const client: LanguageClient | undefined = this.getLanguageClient();
        if (!client) {
            console.warn("<ResearchPanel::update_PlayerData> No language client available.");
            return;
        }

        const researchData: unknown = await client.sendRequest(ServerRequest.PLAYER_RESEARCH, { playerId: playerIdentifier });
        this.panel.webview.postMessage({ type: ViewResponse.UPDATE_RESEARCH, data: researchData });
    }

    /**
     * Opens a file in the editor based on the given identifier.
     * @param identifier The identifier of the file to open.
     * @returns A promise that resolves when the file is opened.
     */
    private async openFile(identifier: string | undefined): Promise<void> {
        if (!identifier) {
            console.warn("<ResearchPanel::openFile> No identifier provided.");
            return;
        }

        const client: LanguageClient | undefined = this.getLanguageClient();
        if (!client) {
            console.warn("<ResearchPanel::openFile> No language client available.");
            return;
        }

        // Use IndexManager paths from language server to find the file.
        console.log(`<ResearchPanel::openFile> Opening file for ID: ${identifier}`);
        const filePath: string = await client.sendRequest(ServerRequest.PLAYER_FILEPATH, { fileId: identifier });
        if (filePath) {
            const document: vscode.TextDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(document);
        }
    }
}
