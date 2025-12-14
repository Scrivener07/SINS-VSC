import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	TextDocumentSyncKind,
	InitializeResult,
	Connection,
	Hover,
	Diagnostic
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	ASTNode,
	getLanguageService,
	JSONDocument,
	LanguageService,
	LanguageSettings
} from "vscode-json-languageservice";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { SchemaPatcher } from "./json-schema";
import { LocalizationManager } from "./localization";
import { SchemaManager } from "./schema";
import { TextureManager } from "./texture";

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

	private schemaPatcher: SchemaPatcher;

	private localizationManager: LocalizationManager;

	private textureManager: TextureManager;


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		this.schemaPatcher = new SchemaPatcher();
		this.localizationManager = new LocalizationManager();
		this.textureManager = new TextureManager();

		// Initialize the JSON language service.
		this.jsonLanguageService = getLanguageService({
			schemaRequestService: async (uri) => {
				if (uri.startsWith("file")) {
					const fsPath: string = fileURLToPath(uri);
					const fileName: string = path.basename(fsPath);
					try {
						const content: string = await fs.promises.readFile(fsPath, "utf-8");
						const schema: any = JSON.parse(content);
						this.schemaPatcher.apply(fileName, schema);
						return JSON.stringify(schema);
					}
					catch (error) {
						return Promise.reject(error);
					}
				}
				return Promise.reject(`Schema request failed for: ${uri}`);
			}
		});

		// Bind the connection event listeners.
		this.connection.onInitialize(this.onInitialize.bind(this));
		this.connection.onInitialized(this.onInitialized.bind(this));

		// Bind the language feature listeners.
		this.connection.onHover(this.onHover.bind(this));

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

		const settings: LanguageSettings = {
			schemas: SchemaManager.configure()
		};

		this.jsonLanguageService.configure(settings);

		return {
			capabilities: {
				// Tell the client that this server supports code completion.
				completionProvider: {
					resolveProvider: true
				},
				// Tell the client how to sync text documents (Full vs Incremental).
				textDocumentSync: TextDocumentSyncKind.Incremental,

				// Tell the client that this server supports hover.
				hoverProvider: true,
			}
		};
	}


	/**
	 * Called after the handshake is complete.
	 */
	private onInitialized(): void {
		this.connection.console.log("Server initialized.");

		// Scan workspace for localized text files
		if (this.workspaceFolder) {
			const fsPath: string = fileURLToPath(this.workspaceFolder);
			this.localizationManager.loadFromWorkspace(fsPath).then(() => {
				this.connection.console.log("Localization data loaded.");
			});
			this.textureManager.loadFromWorkspace(fsPath).then(() => {
				this.connection.console.log("Texture data loaded.");
			});
		}
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
		const text: string = textDocument.getText();

		// TODO: Just logging the length for now.
		this.connection.console.log(`Validating ${textDocument.uri} (${text.length} characters in length.)`);

		// Parse the document as JSON.
		const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(textDocument);

		// Validate the document against the configured schemas.
		const diagnostics: Diagnostic[] = await this.jsonLanguageService.doValidation(textDocument, jsonDocument);

		// Send the diagnostics to the client.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}


	/**
	 * Called when the user hovers over text.
	 */
	private async onHover(params: { textDocument: any, position: any }): Promise<any> {
		const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
		if (!document) {
			return null;
		}

		const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
		const offset: number = document.offsetAt(params.position);
		const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);

		// Check that a string node is being hovered.
		if (node && node.type === "string" && node.value) {
			if (JsonAST.isNodeValue(node)) {
				if (this.workspaceFolder) {
					const textureHover: Hover | null = await this.textureManager.getHover(node.value);
					if (textureHover) {
						return textureHover;
					}
				}

				const localizeHover: Hover | null = this.localizationManager.getHover(node.value);
				if (localizeHover) {
					return localizeHover;
				}
			}
		}

		// Fallback to standard JSON schema hover.
		return this.jsonLanguageService.doHover(document, params.position, jsonDocument);
	}


}


/**
 * Provides utility methods for working with JSON AST nodes.
 */
class JsonAST {

	/** An index for the AST node key. */
	public static readonly NODE_KEY: number = 0;

	/** An index for the AST node value. */
	public static readonly NODE_VALUE: number = 1;

	/**
	 * Determines if the given AST node is a value node.
	 */
	public static isNodeValue(node: ASTNode | undefined): boolean {
		if (!node) {
			return false;
		}
		else if (node.parent?.type === "property" && node.parent.children?.[JsonAST.NODE_VALUE] === node) {
			// Its a value in an object property (Key: Value)
			return true;
		}
		else if (node.parent?.type === "array") {
			// Its an item in an array
			return true;
		}
		else if (!node.parent) {
			// Its the root node (rare, but valid)
			return true;
		}
		else {
			return false;
		}
	}

}


// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
