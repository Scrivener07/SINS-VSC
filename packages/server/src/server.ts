import * as path from "path";
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    Connection,
    Diagnostic,
    ClientCapabilities
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getLanguageService, LanguageService } from "vscode-json-languageservice";
import { CompletionManager, DefinitionProvider, HoverProvider, DiagnosticManager, DocumentSymbolProvider } from "./providers";
import { IEntityState, ILanguageState } from "./types";
import { RequestInbound, RequestOutbound } from "./protocol";
import { WorkspaceService, SchemaManager } from "./managers";
import { Validator } from "./validate";
import { PointerType } from "./pointers";
import { DataService } from "./data";
import { ClientWatcherTestDriver } from "./z-draft-watch-client/client-watcher";

/**
 * Encapsulates the Sins of a Solar Empire 2 language server.
 * Provides server lifecycle management and orchestration of language features and data providers.
 */
class SinsLanguageServer {
    /** A connection to the VS Code client. */
    private readonly connection: Connection;

    private clientCapabilities: ClientCapabilities | undefined;

    /** The JSON language service instance. */
    private readonly jsonLanguageService: LanguageService;

    /** A manager for open text documents. */
    private readonly documents: TextDocuments<TextDocument>;

    /** The workspace service to use. */
    private readonly workspaceService: WorkspaceService;

    /** The game data service to use. */
    private readonly data: DataService;

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

    /** @deprecated */
    private readonly clientWatcher: ClientWatcherTestDriver;

    constructor() {
        this.entity = {
            pointer: PointerType.none
        };

        this.language = {
            code: "en"
        };

        // Create the LSP connection.
        this.connection = createConnection(ProposedFeatures.all);

        // TODO: This is for testing only.
        this.clientWatcher = new ClientWatcherTestDriver(this.connection);

        // Initialize the JSON language service.
        this.jsonLanguageService = getLanguageService({});

        // Create a manager for open text documents.
        this.documents = new TextDocuments(TextDocument);

        // Create the data context service.
        this.data = new DataService();

        // Create the protocol handlers.
        this.inbound = new RequestInbound(this.data);
        this.outbound = new RequestOutbound(this.connection);

        // Create the language features.
        this.diagnostics = [];

        this.schemaManager = new SchemaManager();

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

        // Create the workspace service.
        this.workspaceService = new WorkspaceService(this.connection, this.documents, this.validator, this.data);

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

        // Make the text document manager listen on the connection for open, change, and close text document events.
        this.documents.listen(this.connection);

        // Start the server.
        this.connection.listen();
    }

    //#region Initialize

    /**
     * Called when the client starts the server.
     * This is where server capabilities are decalred.
     * @param parameters The initialization parameters from the client.
     * @returns The server's capabilities.
     */
    private onInitialize(parameters: InitializeParams): InitializeResult {
        this.connection.console.info(`[Server(${process.pid}) Initialization starting.`);
        this.clientCapabilities = parameters.capabilities;

        // Initialize the workspace service.
        this.workspaceService.initializing(parameters);

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
        this.connection.console.info("Server post-initialization started.");

        // Get current language from vscode settings
        this.language.code = await this.outbound.getLanguage();

        await this.workspaceService.initialized();

        // Test: single handler, no FileWatcherManager competing.
        this.clientWatcher.register();

        // Validate all open documents now that initialization is complete.
        for (const document of this.documents.all()) {
            await this.validator.validateTextDocument(document);
        }

        // Bind the document event listeners.
        this.documents.onDidOpen(this.onDidOpen.bind(this));
        this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
        this.documents.onDidClose(this.onDidClose.bind(this));

        this.connection.console.info("Server initialized.");
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
     * - Note: This fires after `onDidOpen` for the initial document load which does not nessarily mean the content changed.
     *   Only that it changed from untracked to tracked by the document manager.
     * @param change The event containing the changed document.
     */
    private async onDidChangeContent(change: { document: TextDocument }): Promise<void> {
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
        // TODO: The `this.entity.pointer` logic is also over optimistic since it assumes the closed document is always the one being tracked.
        //       This may not be the case if multiple documents are open.
        //       We may want to track pointers on a per-document basis instead of globally.
        const pointerType: PointerType = this.getCurrentEntityType(event.document.uri);
        this.connection.console.info(`[Server(${process.pid}) Document closed: ${pointerType}, ${event.document.uri}`);
        this.connection.sendDiagnostics({
            uri: event.document.uri,
            diagnostics: []
        });
    }

    private getCurrentEntityType(uri: string): PointerType {
        return PointerType[path.extname(uri).slice(1) as keyof typeof PointerType] ?? PointerType.none;
    }

    //#endregion
}

// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
