import * as path from "path";
import * as fs from "fs";
import * as shared from "@soase/shared";
import { ServerRequest, IRequestEntityPath, IRequestLocalization } from "@soase/shared";
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    InitializeResult,
    Connection,
    Hover,
    Diagnostic,
    DefinitionParams,
    CompletionParams,
    CompletionList,
    DocumentSymbolParams
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { ASTNode, DocumentSymbol, getLanguageService, JSONDocument, LanguageService, Location, Range } from "vscode-json-languageservice";
import { fileURLToPath } from "url";
import { SchemaPatcher } from "./json-schema";
import { JsonAST } from "./json-ast";
import { CompletionManager, DefinitionProvider, HoverProvider, DiagnosticManager } from "./providers";
import { EntityManifestManager, UniformManager, TextureManager, SchemaManager, LocalizationManager, IndexManager, CacheManager } from "./managers";
import { Validator } from "./validate";
import { PointerType } from "./pointers";

/**
 * Encapsulates the Sins language server logic.
 */
class SinsLanguageServer {
    /** A connection to the VS Code client. */
    private connection: Connection;

    /** A manager for open text documents. */
    private documents: TextDocuments<TextDocument>;

    /** A cached string to the workspace folder this server is operating on. */
    private workspaceFolder: string | null = null;

    /** The JSON language service instance. */
    private jsonLanguageService: LanguageService;

    /** The schema patcher to use. */
    private schemaPatcher: SchemaPatcher;

    private schemaManager: SchemaManager;

    /** The localization manager to use. */
    private localizationManager: LocalizationManager;

    private hoverProvider: HoverProvider;
    private definitionProvider: DefinitionProvider;
    private completionManager: CompletionManager;

    /** The texture manager to use. */
    private textureManager: TextureManager;

    private cacheManager: CacheManager;
    private uniformManager: UniformManager;
    private entityManifestManager: EntityManifestManager;
    private diagnosticManager: DiagnosticManager;

    /** The index manager to use. */
    private indexManager: IndexManager;

    private validator: Validator;

    private currentLanguageCode: string = "en";
    private currentEntity: PointerType = PointerType.none;
    private isInitialized: boolean;
    private diagnostics: Diagnostic[] = [];

    constructor() {
        // Create the LSP connection.
        this.connection = createConnection(ProposedFeatures.all);

        // Create a manager for open text documents.
        this.documents = new TextDocuments(TextDocument);

        this.isInitialized = false;
        this.diagnostics = [];
        this.schemaManager = new SchemaManager();
        this.schemaPatcher = new SchemaPatcher();
        this.textureManager = new TextureManager();
        this.completionManager = new CompletionManager();
        this.cacheManager = new CacheManager();
        this.uniformManager = new UniformManager();
        this.entityManifestManager = new EntityManifestManager();
        this.indexManager = new IndexManager(this.cacheManager, this.entityManifestManager, this.uniformManager);

        this.localizationManager = new LocalizationManager();
        this.hoverProvider = new HoverProvider(this.indexManager, this.localizationManager);
        this.definitionProvider = new DefinitionProvider(this.cacheManager, this.indexManager, this.currentLanguageCode);
        this.diagnosticManager = new DiagnosticManager(this.diagnostics);

        // Initialize the JSON language service.
        this.jsonLanguageService = getLanguageService({});

        this.validator = new Validator(
            this.jsonLanguageService,
            this.diagnostics,
            this.cacheManager,
            this.entityManifestManager,
            this.uniformManager,
            this.diagnosticManager
        );

        // Bind the connection event listeners.
        this.connection.onInitialize(this.onInitialize.bind(this));
        this.connection.onInitialized(this.onInitialized.bind(this));

        // Bind the language feature listeners.
        this.connection.onHover(this.onHover.bind(this));
        this.connection.onDefinition(this.onDefinition.bind(this));
        this.connection.onCompletion(this.onCompletion.bind(this));
        this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));

        // Named client requests.
        this.connection.onRequest(ServerRequest.GET_PLAYER_IDS, () => this.request_getPlayerIdentifiers());
        this.connection.onRequest(ServerRequest.GET_ENTITY_PATH, (params: IRequestEntityPath) => this.request_getEntityPath(params.identifier));
        this.connection.onRequest(ServerRequest.GET_LOCALIZATION, (params: IRequestLocalization) =>
            this.request_getLocalization(params.language, params.key)
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

    //--------------------------------------------------

    /**
     * Gets the list of available player identifiers.
     *
     * NOTE: `Set<T>` is not serializable and must be converted to an array in order to move over the LSP.
     * TODO: Possibly make this more generic by accepting an entity type parameter.
     * @returns The list of player identifiers.
     */
    private request_getPlayerIdentifiers(): string[] {
        console.info("<SinsLanguageServer::wip_getPlayerIdentifiers> Getting player IDs from cache.");
        const players: Set<string> = this.cacheManager.get("player");
        return Array.from(players);
    }

    /**
     * Gets the file path for a specific entity identifier.
     * @param identifier The entity identifier.
     * @returns The file path, or undefined if not found.
     */
    private request_getEntityPath(identifier: string): string | undefined {
        console.info(`<SinsLanguageServer::request_getEntityPath> Getting file path for entity indentifier: ${identifier}`);
        const paths: string[] | undefined = this.indexManager.getPaths(identifier);
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
        const localizations: Map<string, string> = this.localizationManager.get(language);
        if (localizations) {
            return localizations.get(key);
        } else {
            console.warn(`<SinsLanguageServer::request_getLocalization> No localization data found for key: ${key} in language: ${language}`);
            return undefined;
        }
    }

    //--------------------------------------------------

    /**
     * Called when the client starts the server.
     * This is where server capabilities are decalred.
     * @param params The initialization parameters from the client.
     * @returns The server's capabilities.
     */
    private onInitialize(params: InitializeParams): InitializeResult {
        // TODO: rootUri @deprecated — in favour of workspaceFolders
        this.workspaceFolder = params.rootUri;
        this.connection.console.info(`[Server(${process.pid}) ${this.workspaceFolder}] Initialization starting.`);

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
     * Sends a data request to client.
     */
    private async sendRequest(req: string): Promise<string> {
        // Using `sendRequest` creates client specific coupling on the agnostic server.
        return this.connection.sendRequest(req).then((a: any) => a);
    }

    /**
     * Called after the handshake is complete.
     */
    private async onInitialized(): Promise<void> {
        this.connection.console.info("Server initialized.");

        // Get current language from vscode settings
        this.currentLanguageCode = await this.sendRequest(shared.PROPERTIES.language);

        // Initialize workspace data managers.
        if (this.workspaceFolder) {
            const fsPath: string = fileURLToPath(this.workspaceFolder);
            await Promise.all([
                this.indexManager.rebuildIndex(fsPath, this.currentLanguageCode),
                this.localizationManager.loadFromWorkspace(fsPath).then(() => this.connection.console.info("Localization data loaded")),
                this.textureManager.loadFromWorkspace(fsPath).then(() => this.connection.console.info("Texture data loaded"))
            ]);
            for (const doc of this.documents.all()) {
                await this.validateTextDocument(doc);
            }
            /*
				since onDidOpen/onDidChangeContent events execute before the server
				actually initializes (ie: files already opened), we'll need to keep track of it via a variable
				to ensure full server initialization before validating any document.
			*/
            this.isInitialized = true;
        }
    }

    /**
     * Called when a document is opened.
     * @param event The event containing the opened document.
     */
    private onDidOpen(event: { document: TextDocument }): void {
        this.currentEntity = this.getCurrentEntityType(event.document.uri);
        this.connection.console.info(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
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

        this.currentEntity = this.getCurrentEntityType(change.document.uri);
        this.currentLanguageCode = await this.sendRequest(shared.PROPERTIES.language);
        await this.validateTextDocument(change.document);
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

    /**
     * Core logic for validating a document.
     * @param textDocument The text document to validate.
     */
    private async validateTextDocument(textDocument: TextDocument): Promise<void> {
        const text: string = textDocument.getText();

        // TODO: Just logging the length for now.
        this.connection.console.info(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

        // Parse the document as JSON.
        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(textDocument);

        // Validate the document against the configured schemas.
        const diagnostics: Diagnostic[] = [
            ...(await this.jsonLanguageService.doValidation(textDocument, jsonDocument)),
            ...(await this.validator.doValidation(textDocument, jsonDocument, this.currentEntity))
        ];

        // Send the diagnostics to the client.
        this.connection.sendDiagnostics({
            uri: textDocument.uri,
            diagnostics
        });
    }

    /**
     * Called when the user hovers over text.
     * @param params The parameters for the hover request.
     * @returns A promise that resolves to a Hover object or null.
     */
    private async onHover(params: { textDocument: any; position: any }): Promise<any> {
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);
        console.info("Hover context:", PointerType[context]);

        if (node && node.type === "string" && node.value) {
            if (JsonAST.isNodeValue(node)) {
                if (context === PointerType.brush && this.workspaceFolder) {
                    const textureHover: Hover | null = await this.textureManager.getHover(node.value);
                    if (textureHover) {
                        return textureHover;
                    }
                }

                if (context === PointerType.localized_text) {
                    const localizeHover: Hover | null = this.hoverProvider.getLocalizedText(node.value, this.currentLanguageCode);
                    if (localizeHover) {
                        return localizeHover;
                    }
                }

                if (context === PointerType.weapon) {
                    const weaponHover: Hover | null = await this.hoverProvider.getWeapon(node.value, this.currentLanguageCode);
                    if (weaponHover) {
                        return weaponHover;
                    }
                }

                if (context === PointerType.weapon_tag) {
                    const weaponTagHover: Hover | null = await this.hoverProvider.getWeaponTag(node.value, this.currentLanguageCode);
                    if (weaponTagHover) {
                        return weaponTagHover;
                    }
                }
            }
        }

        // Fallback to standard JSON schema hover.
        return this.jsonLanguageService.doHover(document, params.position, jsonDocument);
    }

    /**
     * Called when the user requests the definition of a symbol.
     * @param params The parameters for the definition request.
     * @returns A promise that resolves to an array of `Location` types or null.
     */
    private async onDefinition(params: DefinitionParams): Promise<Location[] | null> {
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);

        if (node && node.type === "string" && JsonAST.isNodeValue(node)) {
            return await this.definitionProvider.goToDefinition(context, node.value);
        }

        return null;
    }

    private async onCompletion(params: CompletionParams): Promise<CompletionList | null> {
        const document = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);

        if (node) {
            let range: Range = {
                start: document.positionAt(node.offset + 1),
                end: document.positionAt(node.offset + node.length - 1)
            };
            const prefix = document.getText(range);

            return (
                this.completionManager.doComplete(
                    context,
                    this.currentEntity,
                    prefix,
                    range,
                    document,
                    offset,
                    this.cacheManager,
                    this.uniformManager
                ) ?? (await this.jsonLanguageService.doComplete(document, params.position, jsonDocument))
            );
        }
        return null;
    }

    /**
     * Called when the client requests document symbols for the outline view or breadcrumbs.
     * @param params The parameters for the document symbol request.
     * @returns An array of `DocumentSymbol` objects.
     * @see [Document Symbols Request Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_documentSymbol)
     */
    private onDocumentSymbol(params: DocumentSymbolParams): DocumentSymbol[] {
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return [];
        }

        // Use the JSON language service to get symbols.
        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const jsonSymbols: DocumentSymbol[] = this.jsonLanguageService.findDocumentSymbols2(document, jsonDocument);
        return jsonSymbols;
    }

    public async getContext(
        jsonLanguageService: LanguageService,
        document: TextDocument,
        jsonDocument: JSONDocument,
        node: ASTNode | undefined
    ): Promise<PointerType> {
        if (!node || (node.parent?.type === "property" && node === node.parent.keyNode)) {
            return PointerType.none;
        }

        let currentNode: ASTNode | undefined = node;

        while (currentNode && currentNode.type !== "property") {
            currentNode = currentNode.parent;
        }

        if (!currentNode) {
            return PointerType.none;
        }

        const schemas = await jsonLanguageService.getMatchingSchemas(document, jsonDocument);

        for (const schema of schemas) {
            if (!JsonAST.isWithinSchemaNode(node.offset, schema.node)) {
                continue;
            }

            const { properties, patternProperties } = schema.schema;

            const key = currentNode.keyNode.value;
            const schemaProp: any = properties?.[key];

            if (schemaProp?.pointer) {
                return schemaProp.pointer as PointerType;
            }

            if (!patternProperties) {
                continue;
            }

            for (const pattern in patternProperties) {
                const match: any = patternProperties[pattern];
                if (match?.pointer) {
                    return match.pointer as PointerType;
                }
            }
        }
        return PointerType.none;
    }
}

// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
