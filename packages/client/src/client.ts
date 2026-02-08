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
import { GameInstallation } from "./environment";

export class ClientManager {
    private static client: LanguageClient | undefined;

    /**
     * TODO: This has a timing problem.
     * If no soase documents have been opened yet, there will not be a language client instance available.
     */
    public static getLanguageClients(): LanguageClient | undefined {
        return ClientManager.client;
    }

    /** A file path to the server TypesScript module. */
    private static serverModule: string;

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
        if (ClientManager.client) {
            promises.push(ClientManager.client.stop());
        }
        return Promise.all(promises).then(() => undefined);
    }

    /**
     * Handles workspace folder changes.
     * @param event The workspace folder change event.
     */
    private static onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent) {
        FolderStuff.sortedWorkspaceFolders = undefined; // Reset cache
        if (ClientManager.client) {
            ClientManager.client.stop();
        }
    }

    /**
     * Handles workspace file opens.
     * @param document The document that was opened.
     */
    private static async didOpenTextDocument(document: TextDocument): Promise<void> {
        if (document.languageId !== ClientManager.LANGUAGE_SINS) {
            // Make sure only the specific language ID is handled.
            return;
        } else if (document.uri.scheme !== "file" && document.uri.scheme !== "untitled") {
            // Abort on unsaved files that are not using the default language client since they might not have a valid URI.
            return;
        }

        if (await ClientManager.create_client(document.uri)) {
            console.info(`Language client created for document: ${document.uri.toString()}`);
            return;
        } else {
            console.info(`No language client could be created for document: ${document.uri.toString()}`);
        }
    }

    private static async create_client(documentUri: Uri): Promise<boolean> {
        if (ClientManager.client) {
            // A language client already exists. No need to create a new one.
            return true;
        }

        // Files outside a folder cant be handled. This might depend on the language.
        // Single file languages like JSON might handle files outside the workspace folders.
        const folder: WorkspaceFolder | undefined = Workspace.getWorkspaceFolder(documentUri);
        if (!folder) {
            return false;
        }

        // If we have nested workspace folders we only start a server on the outer most workspace folder.
        const rootFolder: WorkspaceFolder = FolderStuff.getOuterMostWorkspaceFolder(folder);

        // Define the language server options.
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

        const vanilla: string = (await GameInstallation.get()).toString();

        // Define the language client options.
        const clientOptions: LanguageClientOptions = {
            diagnosticCollectionName: ClientManager.CLIENT_ID,
            outputChannel: this.outputChannel,
            documentSelector: [
                // Selects files within the root workspace folder.
                { scheme: "file", language: ClientManager.LANGUAGE_SINS, pattern: `${rootFolder.uri.fsPath}/**/*` }
            ],
            initializationOptions: {
                vanilla: vanilla
            }
        };

        // Instantiate the new language server client.
        const client: LanguageClient = new LanguageClient(ClientManager.CLIENT_ID, ClientManager.CLIENT_NAME, serverOptions, clientOptions);

        // Start the new language server client. Then add request handlers for the language server.
        client.start().then(() => {
            client?.onRequest(shared.PROPERTIES.language, () => Configuration.getLanguage());
        });

        ClientManager.client = client;
        return true;
    }
}

// TODO: This is stupidly designed.
class FolderStuff {
    /** @deprecated */
    public static sortedWorkspaceFolders: string[] | undefined;

    /**
     * Gets the outer most workspace folder for the given folder.
     * @param folder The workspace folder to evaluate.
     * @returns The outer most workspace folder.
     */
    public static getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
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

    /**
     * Sorts the workspace folders by their path length.
     * @returns An array of sorted workspace folder URIs.
     */
    private static sortWorkspaceFolders(): string[] {
        if (FolderStuff.sortedWorkspaceFolders === void 0) {
            FolderStuff.sortedWorkspaceFolders = Workspace.workspaceFolders
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
        return FolderStuff.sortedWorkspaceFolders;
    }
}
