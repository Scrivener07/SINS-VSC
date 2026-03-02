import * as path from "path";
import * as shared from "@soase/shared";
import { ClientNotification } from "@soase/shared";
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
import { getLanguageService, LanguageService } from "vscode-json-languageservice";
import { CompletionManager, DefinitionProvider, HoverProvider, DiagnosticManager, DocumentSymbolProvider } from "./providers";
import { RequestInbound, RequestOutbound } from "./protocol";
import { SchemaManager } from "./managers";
import { Validator } from "./validate";
import { PointerType } from "./pointers";
import { IEntityState, ILanguageState } from "./types";
import { WorkspaceService } from "./managers/workspace";
import { GameData, IDataSource } from "./data";

/**
 * Encapsulates the Sins of a Solar Empire 2 language server.
 * Provides server lifecycle management and orchestration of language features and data providers.
 */
class SinsLanguageServer {
    /** Indicates whether the server has been initialized.
     *
     * Since `onDidOpen`/`onDidChangeContent` events execute before the server
     * actually initializes (ie: files already opened), we'll need to keep track of it via a variable
     * to ensure full server initialization before validating any document.
     *
     * TODO: Possibly refactor this to only start listening to document events after initialization is complete,
     * instead of having to check this flag at all.
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
    private readonly data: GameData;

    /** The schema manager to use. */
    private readonly schemaManager: SchemaManager;

    /** The hover provider to use. */
    private readonly hoverProvider: HoverProvider;

    /** The definition provider to use. */
    private readonly definitionProvider: DefinitionProvider;

    /** The completion manager to use. */
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

    private readonly inbound: RequestInbound;
    private readonly outbound: RequestOutbound;

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
        this.data = new GameData();

        // Create the protocol handlers.
        this.inbound = new RequestInbound(this.data);
        this.outbound = new RequestOutbound(this.connection);

        // Create the language features.
        this.diagnostics = [];

        this.schemaManager = new SchemaManager();

        this.completionManager = new CompletionManager(
            //
            this.jsonLanguageService,
            this.documents,
            this.entity,
            this.data,
            this.language
        );

        this.hoverProvider = new HoverProvider(
            //
            this.jsonLanguageService,
            this.documents,
            this.language,
            this.workspaceService,
            this.data
        );

        this.definitionProvider = new DefinitionProvider(
            //
            this.jsonLanguageService,
            this.documents,
            this.data,
            this.language
        );

        this.diagnosticManager = new DiagnosticManager(this.diagnostics);
        this.validator = new Validator(
            //
            this.connection,
            this.jsonLanguageService,
            this.diagnostics,
            this.diagnosticManager,
            this.data,
            this.entity,
            this.language
        );

        this.documentSymbolProvider = new DocumentSymbolProvider(this.jsonLanguageService, this.documents);

        // Bind the initialization event listeners.
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this));

        this.inbound.register(this.connection);

        // Bind the language feature listeners.
        this.hoverProvider.register(this.connection);
        this.definitionProvider.register(this.connection);
        this.completionManager.register(this.connection);
        this.documentSymbolProvider.register(this.connection);

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
                    resolveProvider: false
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
        this.language.code = await this.outbound.getLanguage();

        {
            // Initialize game workspace data layer.
            if (this.workspaceService.gameFolder) {
                await this.data.addSource(this.workspaceService.gameFolder);
            } else {
                this.connection.console.warn("No game folder found in workspace. Skipping game layer initialization.");
                this.connection.window.showWarningMessage("SINS: No game folder configured. Some features will be unavailable.");
                return;
            }

            // Initialize mod workspace data layer.
            for (const [key, value] of this.workspaceService.modFolders) {
                await this.data.addSource(value);
            }

            // Load all data to populate caches before processing any documents.
            await this.data.reload();
        }

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
        this.connection.console.info(`[Server(${process.pid}) Document opened: ${this.entity.pointer}, ${event.document.uri}`);
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
        this.connection.console.info(`[Server(${process.pid}) Document changed: ${this.entity.pointer}, ${change.document.uri}`);
        this.language.code = await this.outbound.getLanguage();
        await this.validator.validateTextDocument(change.document);
    }

    /**
     * Called when a document is closed.
     * @param event The event containing the closed document.
     */
    private onDidClose(event: { document: TextDocument }): void {
        // Clear diagnostics for closed files if necessary with empty array.
        // TODO: This is over optimistic.
        this.connection.console.info(`[Server(${process.pid}) Document closed: ${this.entity.pointer}, ${event.document.uri}`);
        this.connection.sendDiagnostics({
            uri: event.document.uri,
            diagnostics: []
        });
    }

    private getCurrentEntityType(uri: string): PointerType {
        return PointerType[path.extname(uri).slice(1) as keyof typeof PointerType] ?? PointerType.none;
    }

    //#endregion

    //#region Notifications

    /**
     * Incrementally updates providers when client workspace folders change.
     */
    private async onWorkspaceFoldersChanged(info: shared.IWorkspaceInfo): Promise<void> {
        this.connection.console.info(`[Server(${process.pid}) Workspace folders changed: ${JSON.stringify(info, null, 4)}]`);

        const oldGameFolder: string | undefined = this.workspaceService.gameFolder?.directory;
        const oldModFolders: Set<string> = new Set(this.workspaceService.modFolders.keys());

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
        this.workspaceService.gameFolder = WorkspaceService.create(newGameFolder, "Base Game", 0);
        let index: number = 1;
        for (const modFolder of newModFolders) {
            this.workspaceService.modFolders.set(modFolder.toLowerCase(), WorkspaceService.create(modFolder, "Mod", index));
            index++;
        }

        // Remove sources for removed folders.
        for (const folder of removed) {
            this.connection.console.info(`Removing source: ${folder}`);
            this.data.removeSource(folder);
        }

        // Add sources for added folders.
        for (const folder of added) {
            this.connection.console.info(`Adding source: ${folder}`);
            if (this.workspaceService.gameFolder?.directory.toLowerCase() === folder.toLowerCase()) {
                await this.data.addSource(this.workspaceService.gameFolder);
            } else if (this.workspaceService.modFolders.has(folder.toLowerCase())) {
                const found: IDataSource | undefined = this.workspaceService.modFolders.get(folder.toLowerCase());
                if (found) {
                    await this.data.addSource(found);
                }
            }
        }

        // Reload caches and re-validate if anything changed.
        if (added.length > 0 || removed.length > 0) {
            await this.data.reload();

            for (const document of this.documents.all()) {
                await this.validator.validateTextDocument(document);
            }

            this.connection.console.info(`Sources updated: +${added.length} -${removed.length}`);
        } else {
            this.connection.console.info("No source changes needed.");
        }
    }

    //#endregion
}

// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
