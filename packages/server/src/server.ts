import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	TextDocumentSyncKind,
	InitializeResult,
	Connection
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getLanguageService, LanguageService } from "vscode-json-languageservice";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";


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


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		// Initialize the JSON language service.
		this.jsonLanguageService = getLanguageService({
			schemaRequestService: (uri) => {
				// Handle file:// URIs to load schemas from disk.
				if (uri.startsWith("file")) {
					try {
						const fsPath = fileURLToPath(uri);
						const content = fs.readFileSync(fsPath, "utf-8");
						return Promise.resolve(content);
					} catch (error) {
						return Promise.reject(error);
					}
				}
				return Promise.reject(`Schema request failed for: ${uri}`);
			}
		});

		// Bind the connection event listeners.
		this.connection.onInitialize(this.onInitialize.bind(this));
		this.connection.onInitialized(this.onInitialized.bind(this));

		// Bind the document event listeners.
		this.documents.onDidOpen(this.onDidOpen.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
		this.documents.onDidClose(this.onDidClose.bind(this));

		// Make the text document manager listen on the connection for open, change, and close text document events.
		this.documents.listen(this.connection);

		// Start the server.
		this.connection.listen();
	}


	/**
	 * Called when the client starts the server.
	 * This is where server capabilities are decalred.
	 */
	private onInitialize(params: InitializeParams): InitializeResult {
		// TODO: rootUri @deprecated — in favour of workspaceFolders
		this.workspaceFolder = params.rootUri;
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Initialization starting.`);

		this.configureSchemas();

		return {
			capabilities: {
				// Tell the client that this server supports code completion.
				completionProvider: {
					resolveProvider: true
				},
				// Tell the client how to sync text documents (Full vs Incremental).
				textDocumentSync: TextDocumentSyncKind.Incremental
			}
		};
	}


	/**
	 * Configures the JSON language service with schemas.
	 */
	private configureSchemas(): void {
		// Resolve path to the schemas folder.
		const schemasPath = path.join(__dirname, "resources", "schemas");

		// The new or modified schemas folder.
		const schemasPath_dev = path.join(__dirname, "resources", "schemas-dev");

		// Define schema associations.
		// TODO: Add more file extension mappings here.
		// TODO: Uniforms need special handling for filename to schema matching.
		const schemas = [
			{
				fileMatch: ["*.ability"],
				uri: pathToFileURL(path.join(schemasPath, "ability-schema.json")).toString()
			},
			{
				fileMatch: ["*.action_data_source"],
				uri: pathToFileURL(path.join(schemasPath, "action-data-source-schema.json")).toString()
			},
			{
				fileMatch: ["*.buff"],
				uri: pathToFileURL(path.join(schemasPath, "buff-schema.json")).toString()
			},
			{
				fileMatch: ["*.entity_manifest"],
				uri: pathToFileURL(path.join(schemasPath_dev, "entity-manifest-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit"],
				uri: pathToFileURL(path.join(schemasPath, "unit-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_skin"],
				uri: pathToFileURL(path.join(schemasPath, "unit-skin-schema.json")).toString()
			},
			{
				fileMatch: ["*.unit_item"],
				uri: pathToFileURL(path.join(schemasPath, "unit-item-schema.json")).toString()
			}
		];

		this.jsonLanguageService.configure({
			schemas: schemas
		});
	}


	/**
	 * Called after the handshake is complete.
	 */
	private onInitialized(): void {
		this.connection.console.log("Server initialized.");
	}


	/**
	 * Called when a document is opened.
	 */
	private onDidOpen(event: { document: TextDocument }): void {
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
	}


	/**
	 * Called when a document content changes.
	 * This is usually where validation logic triggers.
	 */
	private onDidChangeContent(change: { document: TextDocument }): void {
		this.validateTextDocument(change.document);
	}


	/**
	 * Called when a document is closed.
	 */
	private onDidClose(event: { document: TextDocument }): void {
		// Clear diagnostics for closed files if necessary with empty array.
		// TODO: This is over optimistic.
		this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	}


	/**
	 * Core logic for validating a document.
	 */
	private async validateTextDocument(textDocument: TextDocument): Promise<void> {
		const text = textDocument.getText();

		// TODO: Just logging the length for now.
		this.connection.console.log(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

		// Parse the document as JSON.
		const jsonDocument = this.jsonLanguageService.parseJSONDocument(textDocument);

		// Validate the document against the configured schemas.
		const diagnostics = await this.jsonLanguageService.doValidation(textDocument, jsonDocument);

		// Send the diagnostics to the client.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}


}


// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
