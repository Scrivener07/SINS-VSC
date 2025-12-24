import * as path from "path";
import {
    workspace as Workspace,
    window as Window,
    ExtensionContext,
    TextDocument,
    OutputChannel,
    WorkspaceFolder,
    Uri,
    WorkspaceFoldersChangeEvent
} from "vscode";
import { LanguageClient, LanguageClientOptions, TransportKind, ServerOptions } from "vscode-languageclient/node";
import { Configuration } from "./configuration";
import * as shared from "@soase/shared";

export class ClientManager {
    private static clients = new Map<string, LanguageClient>();
    private static defaultClient: LanguageClient | undefined;

    /** A file path to the server TypesScript module. */
    private static serverModule: string;

    private static sortedWorkspaceFolders: string[] | undefined;

    private static outputChannel: OutputChannel;
    private static readonly CHANNEL_NAME: string = "Sins of a Solar Empire LSP";

    /** The Sins of a Solar Empire JSON language ID.
     * Ensure this matches the language ID in the extension `package.json`.
     */
    private static readonly LANGUAGE_SINS: string = "soase";

    private static readonly CLIENT_ID: string = "soase-lsp";
    private static readonly CLIENT_NAME: string = "Sins LSP";

    /**
     * Activates the language Client Manager.
     */
    public static activate(context: ExtensionContext) {
        this.serverModule = context.asAbsolutePath(path.join("dist", "server.js"));
        this.outputChannel = Window.createOutputChannel(ClientManager.CHANNEL_NAME);

        // Listen for workspace folder changes.
        Workspace.onDidChangeWorkspaceFolders((event) => this.onDidChangeWorkspaceFolders(event));

        // Listen for workspace file opens.
        Workspace.onDidOpenTextDocument((doc) => this.didOpenTextDocument(doc));
        Workspace.textDocuments.forEach((doc) => this.didOpenTextDocument(doc));
    }

    /**
     * Deactivates all language clients.
     */
    public static deactivate(): Thenable<void> {
        const promises: Thenable<void>[] = [];
        if (this.defaultClient) {
            promises.push(this.defaultClient.stop());
        }
        for (const client of this.clients.values()) {
            promises.push(client.stop());
        }
        return Promise.all(promises).then(() => undefined);
    }

    /**
     * Handles workspace folder changes.
     * @param event The workspace folder change event.
     */
    private static onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent) {
        this.sortedWorkspaceFolders = undefined; // Reset cache
        for (const folder of event.removed) {
            const client: LanguageClient | undefined = this.clients.get(folder.uri.toString());
            if (client) {
                this.clients.delete(folder.uri.toString());
                client.stop();
            }
        }
    }

    /**
     * Handles workspace file opens.
     * @param document The document that was opened.
     */
    private static didOpenTextDocument(document: TextDocument): void {
        // Make sure only the specific language ID is handled.
        if (document.languageId !== ClientManager.LANGUAGE_SINS || (document.uri.scheme !== "file" && document.uri.scheme !== "untitled")) {
            return;
        }

        const uri: Uri = document.uri;

        // Untitled files go to the default client.
        if (uri.scheme === "untitled" && !this.defaultClient) {
            const serverOptions: ServerOptions = {
                run: {
                    module: this.serverModule,
                    transport: TransportKind.ipc
                },
                debug: {
                    module: this.serverModule,
                    transport: TransportKind.ipc,
                    // Do NOT use the fixed debug port here to avoid conflicts with the main server.
                    options: {
                        execArgv: ["--nolazy"] // Ensures all code is parsed before execution to allow setting breakpoints.
                    }
                }
            };
            const clientOptions: LanguageClientOptions = {
                documentSelector: [{ scheme: "untitled", language: ClientManager.LANGUAGE_SINS }],
                diagnosticCollectionName: ClientManager.CLIENT_ID,
                outputChannel: this.outputChannel
            };

            this.defaultClient = new LanguageClient(ClientManager.CLIENT_ID, ClientManager.CLIENT_NAME, serverOptions, clientOptions);
            this.defaultClient.start();
            return;
        }

        // Files outside a folder cant be handled. This might depend on the language.
        // Single file languages like JSON might handle files outside the workspace folders.
        let folder: WorkspaceFolder | undefined = Workspace.getWorkspaceFolder(uri);
        if (!folder) {
            return;
        }

        // If we have nested workspace folders we only start a server on the outer most workspace folder.
        folder = this.getOuterMostWorkspaceFolder(folder);

        if (!this.clients.has(folder.uri.toString())) {
            const serverOptions: ServerOptions = {
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
                            // "--inspect=6010"
                            "--inspect-brk=6010"
                        ]
                    }
                }
            };

            const clientOptions: LanguageClientOptions = {
                documentSelector: [{ scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${folder.uri.fsPath}/**/*` }],
                diagnosticCollectionName: ClientManager.CLIENT_ID,
                workspaceFolder: folder,
                outputChannel: this.outputChannel
            };

            const client: LanguageClient = new LanguageClient(ClientManager.CLIENT_ID, ClientManager.CLIENT_NAME, serverOptions, clientOptions);
            client.start().then(() => {
                client?.onRequest(shared.PROPERTIES.language, () => Configuration.getLanguage());
            });

            this.clients.set(folder.uri.toString(), client);
        }
    }

    private static getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
        const sorted: string[] = this.sortWorkspaceFolders();
        for (const element of sorted) {
            let uri: string = folder.uri.toString();
            if (uri.charAt(uri.length - 1) !== "/") {
                uri = uri + "/";
            }
            if (uri.startsWith(element)) {
                return Workspace.getWorkspaceFolder(Uri.parse(element))!;
            }
        }
        return folder;
    }

    private static sortWorkspaceFolders(): string[] {
        if (this.sortedWorkspaceFolders === void 0) {
            this.sortedWorkspaceFolders = Workspace.workspaceFolders
                ? Workspace.workspaceFolders
                      .map((folder) => {
                          let result: string = folder.uri.toString();
                          if (result.charAt(result.length - 1) !== "/") {
                              result = result + "/";
                          }
                          return result;
                      })
                      .sort((a, b) => {
                          return a.length - b.length;
                      })
                : [];
        }
        return this.sortedWorkspaceFolders;
    }
}
