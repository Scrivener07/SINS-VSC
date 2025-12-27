import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { ILogMessage, IResearchSubject, IWebViewMessage, ViewRequest, ViewResponse } from "@soase/shared";
import { ClientManager } from "../client";
import { ResearchDataService } from "./data";

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

    private dataService: ResearchDataService | undefined;

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

        // TODO: This should throw if unavailable, or be handled more gracefully in some other way.
        const client: LanguageClient | undefined = this.getLanguageClient();
        if (!client) {
            console.error("<ResearchPanel::constructor> No language client available.");
            return;
        } else {
            this.dataService = new ResearchDataService(client);
        }

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
     * Generates the initial HTML content for the research tree webview.
     * @param webview The webview instance.
     * @returns The HTML content as a string.
     */
    private static getHtml(webview: vscode.Webview): string {
        const scriptPath = vscode.Uri.joinPath(ResearchPanel.viewResourceRoot, "index.js");
        const scriptUri: vscode.Uri = webview.asWebviewUri(scriptPath);

        const nonce: string = ResearchPanel.getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>${ResearchPanel.VIEW_TITLE}</title>
            </head>
            <body>
                <div class="header">

                    <div>
                        <label for="player-selector" class="control-label">Player:</label>
                        <select id="player-selector" class="player-selector">
                            <option value="">Loading players...</option>
                        </select>
                    </div>

                    <div id="domain-tabs" class="domain-tabs">
                        <button id="tab-civilian" class="domain-tab active" data-domain="civilian">
                            Civilian
                        </button>
                        <button id="tab-military" class="domain-tab" data-domain="military">
                            Military
                        </button>
                    </div>

                    <div class="zoom-controls">
                        <button id="zoom-out" class="zoom-button" title="Zoom Out (Ctrl+-)">-</button>
                        <span id="zoom-level" class="zoom-level">100%</span>
                        <button id="zoom-in" class="zoom-button" title="Zoom In (Ctrl++)">+</button>
                        <button id="zoom-reset" class="zoom-button" title="Reset Zoom (Ctrl+0)">⊙</button>
                    </div>

                    <div>
                        <label for="node-connection-selector" class="control-label">Connections:</label>
                        <input id="node-connection-selector" type="checkbox" class="node-connection-selector"></input>
                    </div>

                </div>

                <div id="research-tree-container"></div>

                <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
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
            case ViewResponse.LOG:
                const log: ILogMessage = message.data;
                console[log.level](log.text, log.data);
                break;
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
     * Requests a list of `*.player` files from the language server, then sends it to the webview.
     * @return A promise that resolves when the data is requested.
     */
    private async update_PlayerList(): Promise<void> {
        const players: string[] | undefined = await this.dataService?.getPlayerList();
        if (players) {
            this.panel.webview.postMessage({ type: ViewRequest.PLAYER_LIST, data: players });
        } else {
            console.warn("<ResearchPanel::update_PlayerList> No player data received.");
        }
    }

    /**
     * Requests research data for a specific player from the language server.
     * @param playerIdentifier The ID of the player to request research data for.
     * @return A promise that resolves when the data is requested.
     */
    private async update_PlayerData(playerIdentifier: string): Promise<void> {
        const researchData: IResearchSubject[] | undefined = await this.dataService?.getResearchForPlayer(playerIdentifier);
        if (researchData) {
            this.panel.webview.postMessage({ type: ViewResponse.UPDATE_RESEARCH, data: researchData });
        } else {
            console.warn("<ResearchPanel::update_PlayerData> No research data received.");
        }
    }

    /**
     * Opens a file in the editor based on the given entity identifier.
     * @param identifier The identifier of the file to open.
     * @returns A promise that resolves when the file is opened.
     */
    private async openFile(identifier: string | undefined): Promise<void> {
        if (!identifier) {
            console.warn("<ResearchPanel::openFile> No identifier provided.");
            return;
        }

        const filePath: string | null | undefined = await this.dataService?.getEntityPath(identifier);
        if (filePath) {
            console.info(`<ResearchPanel::openFile> Opening file for ID: ${identifier}`);
            const document: vscode.TextDocument = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            await vscode.window.showTextDocument(document);
        } else {
            console.warn(`<ResearchPanel::openFile> No file path found for ID: ${identifier}`);
        }
    }
}
