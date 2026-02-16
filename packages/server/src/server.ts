import * as path from "path";
import * as shared from "@soase/shared";
import { ServerRequest, IRequestEntityPath, IRequestLocalization, IRequestUniformPath, ClientNotification } from "@soase/shared";
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    Connection,
    Diagnostic
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getLanguageService, JSONDocument, LanguageService } from "vscode-json-languageservice";
import { CompletionManager, DefinitionProvider, HoverProvider, DiagnosticManager, DocumentSymbolProvider } from "./providers";
import { SchemaManager } from "./managers";
import { Validator } from "./validate";
import { PointerType } from "./pointers";
import { WorkspaceService } from "./managers/workspace";
import { GameDataService } from "./data/service-game";
import { IEntityState, ILanguageState } from "./types";

/**
 * Encapsulates the Sins of a Solar Empire 2 language server.
 * Provides server lifecycle managment and orchestration of language features and data providers.
 */
class SinsLanguageServer {
    /** Indicates whether the server has been initialized.
     *
     * Since `onDidOpen`/`onDidChangeContent` events execute before the server
     * actually initializes (ie: files already opened), we'll need to keep track of it via a variable
     * to ensure full server initialization before validating any document.
     */
    private isInitialized: boolean;

    /** A connection to the VS Code client. */
    private readonly connection: Connection;

    /** The JSON language service instance. */
    private readonly jsonLanguageService: LanguageService;

    /** A manager for open text documents. */
    private readonly documents: TextDocuments<TextDocument>;

    /** The workspace service to use. */
    private readonly workspaceService: WorkspaceService;

    /** The game data service to use. */
    private readonly gameDataService: GameDataService;

    /** The schema manager to use. */
    private readonly schemaManager: SchemaManager;

    /** The hover provider to use. */
    private readonly hoverProvider: HoverProvider;

    /** The definition provider to use. */
    private readonly definitionProvider: DefinitionProvider;

    /** The complettion provider to use. */
    private readonly completionManager: CompletionManager;

    /** The document symbol provider to use. */
    private readonly documentSymbolProvider: DocumentSymbolProvider;

    /** The diagnostic manager to use. */
    private readonly diagnosticManager: DiagnosticManager;

    /** The validator to use. */
    private readonly validator: Validator;

    /** The language server diagnostics collection. */
    private readonly diagnostics: Diagnostic[] = [];

    /** The current language code in use. */
    private readonly language: ILanguageState;

    /** The current entity type being processed. */
    private readonly entity: IEntityState;

    constructor() {
        this.isInitialized = false;

        this.entity = {
            pointer: PointerType.none
        };

        this.language = {
            code: "en"
        };

        // Create the LSP connection.
        this.connection = createConnection(ProposedFeatures.all);

        // Initialize the JSON language service.
        this.jsonLanguageService = getLanguageService({});

        // Create a manager for open text documents.
        this.documents = new TextDocuments(TextDocument);

        // Create the workspace service.
        this.workspaceService = new WorkspaceService();

        // Create the data context service.
        this.gameDataService = new GameDataService(this.language);

        // Create the language features.
        this.diagnostics = [];

        this.schemaManager = new SchemaManager();

        this.completionManager = new CompletionManager(
            this.jsonLanguageService,
            this.documents,
            this.entity,
            this.gameDataService.data,
            this.gameDataService.uniforms
        );

        this.hoverProvider = new HoverProvider(
            this.jsonLanguageService,
            this.documents,
            this.language,
            this.workspaceService,
            this.gameDataService.indexer,
            this.gameDataService.localization,
            this.gameDataService.textures
        );

        this.definitionProvider = new DefinitionProvider(
            this.jsonLanguageService,
            this.documents,
            this.gameDataService.indexer,
            this.gameDataService.localization,
            this.language
        );

        this.diagnosticManager = new DiagnosticManager(this.diagnostics);
        this.validator = new Validator(
            this.connection,
            this.jsonLanguageService,
            this.diagnostics,
            this.diagnosticManager,
            this.gameDataService.data,
            this.gameDataService.manifests,
            this.gameDataService.uniforms,
            this.entity
        );

        this.documentSymbolProvider = new DocumentSymbolProvider(this.jsonLanguageService, this.documents);

        // Bind the initialization event listeners.
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this));

        // Bind the language feature listeners.
        this.hoverProvider.register(this.connection);
        this.definitionProvider.register(this.connection);
        this.completionManager.register(this.connection);
        this.documentSymbolProvider.register(this.connection);

        // Bind the named client requests.
        this.connection.onRequest(ServerRequest.GET_PLAYER_IDS, () => this.request_getPlayerIdentifiers());
        this.connection.onRequest(ServerRequest.GET_UNIFORM_PATH, (params: IRequestUniformPath) => this.request_getUniformPath(params.identifier));
        this.connection.onRequest(ServerRequest.GET_ENTITY_PATH, (params: IRequestEntityPath) => this.request_getEntityPath(params.identifier));
        this.connection.onRequest(ServerRequest.GET_TEXTURE_PATH, (params: string) => this.request_getTexturePath(params));
        this.connection.onRequest(ServerRequest.GET_LOCALIZATION, (params: IRequestLocalization) =>
            this.request_getLocalization(params.language, params.key)
        );

        // Bind the named server notifications.
        this.connection.onNotification(ClientNotification.WORKSPACE_FOLDERS_CHANGED, (params: shared.IWorkspaceInfo) =>
            this.onWorkspaceFoldersChanged(params)
        );

        // Bind the document event listeners.
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));

        // Make the text document manager listen on the connection for open, change, and close text document events.
        this.documents.listen(this.connection);

        // Start the server.
        this.connection.listen();
    }

    //#region Initialize

    /**
     * Called when the client starts the server.
     * This is where server capabilities are decalred.
     * @param params The initialization parameters from the client.
     * @returns The server's capabilities.
     */
    private onInitialize(params: InitializeParams): InitializeResult {
        // Initialize the workspace service.
        this.workspaceService.initialize(params);

        this.connection.console.info(`[Server(${process.pid}) Initialization starting.`);

        this.jsonLanguageService.configure({ schemas: this.schemaManager.configure() });

        const initializeResult: InitializeResult = {
            capabilities: {
                // Tell the client how to sync text documents (Full vs Incremental).
                textDocumentSync: TextDocumentSyncKind.Incremental,

                // Tell the client that this server supports code completion.
                completionProvider: {
                    triggerCharacters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:_".split(""),
                    resolveProvider: false // you haven't implemented a resolver yet
                },

                // Tell the client that this server supports hover.
                hoverProvider: true,

                // Tell the client that this server supports go-to-definition.
                definitionProvider: true,

                // Tell the client that this server supports document symbols.
                documentSymbolProvider: true
            }
        };

        return initializeResult;
    }

    /**
     * Called after the handshake is complete.
     */
    private async onInitialized(): Promise<void> {
        this.connection.console.info("Server initialized.");

        // Get current language from vscode settings
        this.language.code = await this.sendRequest(shared.PROPERTIES.language);

        // Initialize game workspace data layer.
        if (this.workspaceService.gameFolder) {
            await this.gameDataService.create_game(this.workspaceService.gameFolder);
        } else {
            this.connection.console.warn("No game folder found in workspace. Skipping game layer initialization.");
            this.connection.window.showWarningMessage("SINS: No game folder configured. Some features will be unavailable.");
            return;
        }

        // Initialize mod workspace data layer.
        for (const modFolder of this.workspaceService.modFolders) {
            await this.gameDataService.create_mod(modFolder);
        }

        // Load all data to populate caches before processing any documents.
        await this.gameDataService.reload();

        // Validate all open documents now that initialization is complete.
        for (const document of this.documents.all()) {
            await this.validator.validateTextDocument(document);
        }

        // Mark the server as initialized.
        this.isInitialized = true;
    }

    //#endregion

    //#region Documents

    /**
     * Called when a document is opened.
     * @param event The event containing the opened document.
     */
    private onDidOpen(event: { document: TextDocument }): void {
        this.entity.pointer = this.getCurrentEntityType(event.document.uri);
        this.connection.console.info(`[Server(${process.pid}) Document opened: ${event.document.uri}`);
    }

    private getCurrentEntityType(uri: string): PointerType {
        return PointerType[path.extname(uri).slice(1) as keyof typeof PointerType] ?? PointerType.none;
    }

    /**
     * Called when a document content changes.
     * This is usually where validation logic triggers.
     * @param change The event containing the changed document.
     */
    private async onDidChangeContent(change: { document: TextDocument }): Promise<void> {
        if (!this.isInitialized) {
            return;
        }

        this.entity.pointer = this.getCurrentEntityType(change.document.uri);
        this.language.code = await this.sendRequest(shared.PROPERTIES.language);
        await this.validator.validateTextDocument(change.document);
    }

    /**
     * Called when a document is closed.
     * @param event The event containing the closed document.
     */
    private onDidClose(event: { document: TextDocument }): void {
        // Clear diagnostics for closed files if necessary with empty array.
        // TODO: This is over optimistic.
        this.connection.sendDiagnostics({
            uri: event.document.uri,
            diagnostics: []
        });
    }

    //#endregion

    //#region Notifications

    /**
     * Incrementally updates providers when client workspace folders change.
     */
    private async onWorkspaceFoldersChanged(info: shared.IWorkspaceInfo): Promise<void> {
        this.connection.console.info("Workspace folders changed. Updating providers...");

        const oldGameFolder: string | null = this.workspaceService.gameFolder;
        const oldModFolders: Set<string> = new Set(this.workspaceService.modFolders);

        const newGameFolder: string | null = info.gameFolder;
        const newModFolders: Set<string> = new Set(info.modFolders);

        // Detect added and removed folders.
        const added: string[] = [];
        const removed: string[] = [];

        // Check game folder.
        if (oldGameFolder && newGameFolder !== oldGameFolder) {
            removed.push(oldGameFolder);
        }
        if (newGameFolder && newGameFolder !== oldGameFolder) {
            added.push(newGameFolder);
        }

        // Check mod folders.
        for (const folder of oldModFolders) {
            if (!newModFolders.has(folder)) {
                removed.push(folder);
            }
        }
        for (const folder of newModFolders) {
            if (!oldModFolders.has(folder)) {
                added.push(folder);
            }
        }

        // Update workspace service state.
        this.workspaceService.gameFolder = newGameFolder;
        this.workspaceService.modFolders = Array.from(newModFolders);

        // Remove providers for removed folders.
        for (const folder of removed) {
            this.connection.console.info(`Removing providers for: ${folder}`);
            this.gameDataService.removeFolder(folder);
        }

        // Add providers for added folders.
        for (const folder of added) {
            if (folder === newGameFolder) {
                this.connection.console.info(`Adding providers for: ${folder} (game)`);
                await this.gameDataService.create_game(folder);
            } else {
                this.connection.console.info(`Adding providers for: ${folder} (mod)`);
                await this.gameDataService.create_mod(folder);
            }
        }

        // Only reload if something changed.
        if (added.length > 0 || removed.length > 0) {
            await this.gameDataService.reload();

            // Re-validate all open documents.
            for (const document of this.documents.all()) {
                await this.validator.validateTextDocument(document);
            }

            this.connection.console.info(`Providers updated: +${added.length} -${removed.length}`);
        } else {
            this.connection.console.info("No provider changes needed.");
        }
    }

    //#endregion

    //#region Requests

    /**
     * Sends a data request to client.
     */
    private async sendRequest(req: string): Promise<string> {
        // Using `sendRequest` creates client specific coupling on the agnostic server.
        return this.connection.sendRequest(req).then((a: any) => a);
    }

    private request_getTexturePath(identifier: string): string | undefined {
        console.info(`<SinsLanguageServer::request_getTexturePath> Getting file path for texture indentifier: ${identifier}`);
        const path: string | undefined = this.gameDataService.textures.root.get(identifier)?.value.value;
        if (path) {
            return path;
        } else {
            console.warn(`<SinsLanguageServer::request_getTexturePath> No paths found for identifier: ${identifier}`);
            return undefined;
        }
    }

    private request_getUniformPath(identifier: string): string | undefined {
        console.info(`<SinsLanguageServer::request_getUniformPath> Getting file path for uniform indentifier: ${identifier}`);
        const paths: string[] | undefined = this.gameDataService.indexer.index.get(identifier)?.value.value;
        if (paths) {
            // Return the first path found.
            if (paths.length > 1) {
                console.warn(
                    `<SinsLanguageServer::request_getUniformPath> Multiple paths found for identifier: ${identifier}, returning the first one.`
                );
            }
            return paths[0];
        } else {
            console.warn(`<SinsLanguageServer::request_getUniformPath> No paths found for identifier: ${identifier}`);
            return undefined;
        }
    }

    /**
     * Gets the list of available player identifiers.
     *
     * NOTE: `Set<T>` is not serializable and must be converted to an array in order to move over the LSP.
     * TODO: Possibly make this more generic by accepting an entity type parameter.
     * @returns The list of player identifiers.
     */
    private request_getPlayerIdentifiers(): string[] {
        console.info("<SinsLanguageServer::request_getPlayerIdentifiers> Getting player IDs from cache.");
        const players: Set<string> | undefined = this.gameDataService.data.root.get("player")?.value.value;
        if (players) {
            return Array.from(players);
        } else {
            return [];
        }
    }

    /**
     * Gets the file path for a specific entity identifier.
     * @param identifier The entity identifier.
     * @returns The file path, or undefined if not found.
     */
    private request_getEntityPath(identifier: string): string | undefined {
        console.info(`<SinsLanguageServer::request_getEntityPath> Getting file path for entity indentifier: ${identifier}`);
        const paths: string[] | undefined = this.gameDataService.indexer.index.get(identifier)?.value.value;
        if (paths) {
            // Return the first path found.
            if (paths.length > 1) {
                console.warn(
                    `<SinsLanguageServer::request_getEntityPath> Multiple paths found for identifier: ${identifier}, returning the first one.`
                );
            }
            return paths[0];
        } else {
            console.warn(`<SinsLanguageServer::request_getEntityPath> No paths found for identifier: ${identifier}`);
            return undefined;
        }
    }

    /**
     * Gets the localized string for a specific key and language.
     * @param key The localization key.
     * @param language The language code.
     * @returns The localized string, or undefined if not found.
     */
    private request_getLocalization(language: string, key: string): string | undefined {
        console.info(`<SinsLanguageServer::request_getLocalization> Getting localization for key: ${key} in language: ${language}`);
        const text: string | undefined = this.gameDataService.localization.get(language)?.get(key)?.value.value;
        if (text) {
            return text;
        } else {
            console.warn(`<SinsLanguageServer::request_getLocalization> No localization data found for key: ${key} in language: ${language}`);
            return undefined;
        }
    }

    //#endregion
}

// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
