import * as path from "path";
import * as vscode from "vscode";
import { ExtensionContext, WorkspaceFoldersChangeEvent } from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import * as shared from "@soase/shared";
import { ClientNotification } from "@soase/shared";
import { Configuration } from "./configuration";
import { GameDirectory, ModificationDirectory } from "./environment";

export class ClientManager implements vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    private languageClient: LanguageClient | undefined;
    public get client(): LanguageClient | undefined {
        return this.languageClient;
    }

    /** A file path to the server TypesScript module. */
    private serverModule: string | undefined;

    private static readonly CHANNEL_NAME: string = "Sins of a Solar Empire";

    /**
     * The Sins of a Solar Empire JSON language ID.
     * Ensure this matches the language ID in the extension `package.json`.
     */
    private static readonly LANGUAGE_SINS: string = "soase";

    private static readonly CLIENT_ID: string = "soase-lsp";
    private static readonly CLIENT_NAME: string = "Sins LSP";

    //#region Extension
    // These are the extension lifecycle methods.

    /**
     * Activates the language client manager.
     */
    public async activate(context: ExtensionContext) {
        this.serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

        // Listen for workspace folder changes.
        this.disposables.push(vscode.workspace.onDidChangeWorkspaceFolders((event) => this.onDidChangeWorkspaceFolders(event)));

        // Create and start the new language client. Then add request handlers for the language server.
        const client: LanguageClient = await this.create();
        await client.start().then(() => {
            client.onRequest(shared.PROPERTIES.language, () => Configuration.getLanguage());
            console.info("Language client created and started on extension activation.");
        });
        this.languageClient = client;
    }

    /**
     * Deactivates the language client manager.
     */
    public async deactivate(): Promise<void> {
        if (this.languageClient) {
            await this.languageClient.stop();
        }
    }

    // @vscode.Disposable
    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }

    //#endregion

    //#region Server

    private async create(): Promise<LanguageClient> {
        const info: shared.IWorkspaceInfo = await ClientManager.getWorkspaceInfo();
        console.info("Workspace Info", JSON.stringify(info, null, 2));

        if (!this.serverModule) {
            throw new Error("Server module path is not defined.");
        }

        // Instantiate the new language server client.
        return new LanguageClient(
            ClientManager.CLIENT_ID,
            ClientManager.CLIENT_NAME,
            // Define the language server options.
            {
                run: {
                    module: this.serverModule,
                    transport: TransportKind.ipc
                },
                debug: {
                    module: this.serverModule,
                    transport: TransportKind.ipc,
                    options: {
                        execArgv: [
                            "--nolazy", // Ensures all code is parsed before execution to allow setting breakpoints.
                            "--inspect=6010"
                            // "--inspect-brk=6010" // Use to break on the first line of the server code.
                        ]
                    }
                }
            },
            // Define the language client options.
            {
                diagnosticCollectionName: ClientManager.CLIENT_ID,
                outputChannel: vscode.window.createOutputChannel(ClientManager.CHANNEL_NAME),
                documentSelector: [
                    // Selects files within the root of any workspace folder.
                    { scheme: "file", language: ClientManager.LANGUAGE_SINS }
                    // { scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${gameFolder.fsPath}/**/*` },
                    // { scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${folder.uri.fsPath}/**/*` }
                ],
                initializationOptions: {
                    info: info
                }
            }
        );
    }

    //#endregion

    //#region Workspace

    /**
     * Handles workspace folder changes.
     * @param event The workspace folder change event.
     */
    private async onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent): Promise<void> {
        if (!this.languageClient) {
            console.warn("Client not initialized yet; ignoring workspace folder change.");
            return;
        }

        // Re-fetch the current game and mod folders.
        const info: shared.IWorkspaceInfo = await ClientManager.getWorkspaceInfo();
        console.info("Workspace Info Updated ", JSON.stringify(info, null, 2));

        // Send the updated folder list to the server.
        await this.languageClient.sendNotification(ClientNotification.WORKSPACE_FOLDERS_CHANGED, info);
    }

    private static async getWorkspaceInfo(): Promise<shared.IWorkspaceInfo> {
        const gameFolder: vscode.Uri = await GameDirectory.get();
        const modFolders: vscode.Uri[] = await ModificationDirectory.fromWorkspace();
        const info: shared.IWorkspaceInfo = {
            gameFolder: gameFolder.fsPath,
            modFolders: modFolders.map((uri) => uri.fsPath)
        };
        return info;
    }

    //#endregion
}
