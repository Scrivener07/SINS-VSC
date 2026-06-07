import * as path from "path";
import * as vscode from "vscode";
import { ExtensionContext } from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import * as shared from "@soase/shared";
import { ClientNotification } from "@soase/shared";
import { Configuration } from "./configuration";
import { ProjectContext, ProjectKind } from "./project";

export class ClientManager implements vscode.Disposable {
    private context: ProjectContext;

    private disposables: vscode.Disposable[];

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

    public constructor(context: ProjectContext) {
        this.context = context;
        this.disposables = [];
    }

    //#region Extension
    // These are the extension lifecycle methods.

    /**
     * Activates the language client manager.
     */
    public async activate(context: ExtensionContext) {
        this.serverModule = context.asAbsolutePath(path.join("dist", "server.js"));

        // Listen for workspace folder changes.
        this.disposables.push(this.context.onDidChange(this.onProjectsChanged.bind(this)));

        // Create and start the new language client. Then add request handlers for the language server.
        const client: LanguageClient = await this.create();

        await client.start();
        client.onRequest(shared.PROPERTIES.language, () => Configuration.getLanguage());
        console.info("Language client created and started on extension activation.");

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
        const info: shared.IWorkspaceInfo = ClientManager.toWorkspaceInfo(this.context);
        const watchers: vscode.FileSystemWatcher[] = ClientManager.getWatchers(info);

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
                    {
                        // A pattern that selects only Sins-2 files within the root of any workspace folder.
                        scheme: "file",
                        language: ClientManager.LANGUAGE_SINS
                    }
                    // { scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${gameFolder.fsPath}/**/*` },
                    // { scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${folder.uri.fsPath}/**/*` }
                ],
                synchronize: {
                    fileEvents: watchers
                },
                initializationOptions: {
                    info: info
                }
            }
        );
    }

    private static getWatchers(info: shared.IWorkspaceInfo): vscode.FileSystemWatcher[] {
        // WIP
        // Instantiate file watchers for all workspace folders to trigger server-side synchronization.
        // It is unclear if I should use this approach, or if I should implement file watching on the server side.
        // NOTE: These root directory watchers cannot be added\removed dynamically after the client is created.
        //       The server will ignore file events for unknown folders and the client must be restarted to add new root watchers.
        // https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher
        const watchers: vscode.FileSystemWatcher[] = [];

        console.info(`Creating file watchers for workspace folders:`);
        console.info(`    ${info.gameFolder}`);
        watchers.push(vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(info.gameFolder, "**/*")));
        for (const modFolder of info.modFolders) {
            console.info(`    ${modFolder}`);
            watchers.push(vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(modFolder, "**/*")));
        }

        return watchers;
    }

    //#endregion

    //#region Workspace

    /**
     * Handles workspace folder changes.
     *
     * @remarks NOTE: This does not actually work as intended.
     * The server must be restarted to change the workspace folders that the client is watching.
     * This is a limitation of the vscode language client API.
     */
    private async onProjectsChanged(): Promise<void> {
        if (!this.languageClient) {
            console.warn("Client not initialized yet; ignoring workspace folder change.");
            return;
        }

        // Grab the current workspace info and log it for debugging.
        const info: shared.IWorkspaceInfo = ClientManager.toWorkspaceInfo(this.context);
        console.info("Workspace Info Updated ", JSON.stringify(info, null, 4));

        // Send the updated folder list to the server.
        await this.languageClient.sendNotification(ClientNotification.WORKSPACE_FOLDERS_CHANGED, info);
    }

    /**
     * Converts the current workspace state into a serializable object to send to the server.
     * @param context The project context representing the current workspace state.
     * @returns A DTO to be sent to the server.
     */
    private static toWorkspaceInfo(context: ProjectContext): shared.IWorkspaceInfo {
        let gameFolder: string = "";
        let modFolders: string[] = [];
        let dependencies: Record<string, string[]> = {};

        for (const project of context.values()) {
            if (project.kind === ProjectKind.Game) {
                gameFolder = project.directory.fsPath;
            } else {
                modFolders.push(project.directory.fsPath);
                dependencies[project.directory.fsPath] = project.dependencies.map(function (dependency) {
                    return dependency.directory.fsPath;
                });
            }
        }

        return {
            gameFolder: gameFolder,
            modFolders: modFolders,
            dependencies: dependencies
        };
    }

    //#endregion
}
