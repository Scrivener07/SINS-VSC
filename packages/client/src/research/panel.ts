import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { ILogMessage, IResearchSubject, IResearchUniform, IWebViewMessage, ViewRequest, ViewResponse } from "@soase/shared";
import { ClientManager } from "../client";
import { ResearchDataService } from "./data";
import { GameInstallation } from "../environment";

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
    public static async show(context: vscode.ExtensionContext): Promise<void> {
        if (ResearchPanel.currentPanel) {
            ResearchPanel.currentPanel.panel.reveal(vscode.ViewColumn.One);
            return;
        }

        ResearchPanel.viewResourceRoot = vscode.Uri.joinPath(context.extensionUri, "dist", "view-research");

        // TODO: Collect mod directories from workspace.
        const gameInstallation: vscode.Uri = await GameInstallation.get();

        const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
            ResearchPanel.VIEW_TYPE,
            ResearchPanel.VIEW_TITLE,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    // Root paths from which the webview can load local resources.
                    ResearchPanel.viewResourceRoot,
                    gameInstallation
                ]
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
        const client: LanguageClient | undefined = ClientManager.getLanguageClients();
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource};">
                <title>${ResearchPanel.VIEW_TITLE}</title>
            </head>
            <body>
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
                if (log.data) {
                    console[log.level](log.text, log.data);
                } else {
                    console[log.level](log.text);
                }
                break;
            case ViewResponse.READY:
                await this.update_PlayerList();
                await this.update_ResearchUniforms();
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

    private async update_ResearchUniforms(): Promise<void> {
        const uniforms: IResearchUniform | undefined | null = await this.dataService?.getResearchUniform();
        if (uniforms) {
            this.panel.webview.postMessage({ type: ViewRequest.UNIFORMS, data: uniforms });
        } else {
            console.warn("<ResearchPanel::update_ResearchUniforms> No research uniform data received.");
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
            // Convert each file path into a webview URI.
            for (const subject of researchData) {
                if (subject.hud_icon) {
                    const uri: vscode.Uri = vscode.Uri.file(subject.hud_icon);
                    subject.hud_icon = this.panel.webview.asWebviewUri(uri).toString();
                }
                if (subject.tooltip_picture) {
                    const uri: vscode.Uri = vscode.Uri.file(subject.tooltip_picture);
                    subject.tooltip_picture = this.panel.webview.asWebviewUri(uri).toString();
                }
            }

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
