import * as fs from "fs";
import * as path from "path";
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
	CompletionList
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
	ASTNode,
	getLanguageService,
	JSONDocument,
	LanguageService,
	LanguageSettings,
	Location,
	MatchingSchema,
	Range
} from "vscode-json-languageservice";
import { fileURLToPath, pathToFileURL } from "url";
import { SchemaPatcher } from "./json-schema";
import { LocalizationManager } from "./localization";
import { PointerType, SchemaManager } from "./schema";
import { TextureManager } from "./texture";
import { JsonAST } from "./json-ast";
import { IndexManager } from "./data-manager";

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

	/** The localization manager to use. */
	private localizationManager: LocalizationManager;

	/** The texture manager to use. */
	private textureManager: TextureManager;

	/** The index manager to use. */
	private indexManager: IndexManager;


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		this.schemaPatcher = new SchemaPatcher();
		this.localizationManager = new LocalizationManager();
		this.textureManager = new TextureManager();
		this.indexManager = new IndexManager();

		// Initialize the JSON language service.
		this.jsonLanguageService = getLanguageService({
			schemaRequestService: async (uri) => {
				if (uri.startsWith("file")) {
					const fsPath: string = fileURLToPath(uri);
					const fileName: string = path.basename(fsPath);
					try {
						const content: string = await fs.promises.readFile(fsPath, "utf-8");
						const schema: any = JSON.parse(content);
						this.schemaPatcher.applyPointers(schema);
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
		this.connection.onDefinition(this.onDefinition.bind(this));
		this.connection.onCompletion(this.onCompletion.bind(this));

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
	 * @param params The initialization parameters from the client.
	 * @returns The server's capabilities.
	 */
	private onInitialize(params: InitializeParams): InitializeResult {
		// TODO: rootUri @deprecated — in favour of workspaceFolders
		this.workspaceFolder = params.rootUri;
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Initialization starting.`);

		const settings: LanguageSettings = {
			schemas: SchemaManager.configure()
		};

		this.jsonLanguageService.configure(settings);

		const initializeResult: InitializeResult = {
			capabilities: {

				// Tell the client how to sync text documents (Full vs Incremental).
				textDocumentSync: TextDocumentSyncKind.Incremental,

				// Tell the client that this server supports code completion.
				completionProvider: {
					triggerCharacters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
					resolveProvider: false // you haven't implemented a resolver yet
				},

				// Tell the client that this server supports hover.
				hoverProvider: true,

				// Tell the client that this server supports go-to-definition.
				definitionProvider: true
			}
		};

		return initializeResult;
	}


	/**
	 * Called after the handshake is complete.
	 */
	private onInitialized(): void {
		this.connection.console.log("Server initialized.");

		// Initialize workspace data managers.
		if (this.workspaceFolder) {
			const fsPath: string = fileURLToPath(this.workspaceFolder);
			this.localizationManager.loadFromWorkspace(fsPath).then(() => {
				this.connection.console.log("Localization data loaded.");
			});
			this.textureManager.loadFromWorkspace(fsPath).then(() => {
				this.connection.console.log("Texture data loaded.");
			});

			this.indexManager.rebuildIndex(fsPath);
		}
	}


	/**
	 * Called when a document is opened.
	 * @param event The event containing the opened document.
	 */
	private onDidOpen(event: { document: TextDocument }): void {
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
	}


	/**
	 * Called when a document content changes.
	 * This is usually where validation logic triggers.
	 * @param change The event containing the changed document.
	 */
	private onDidChangeContent(change: { document: TextDocument }): void {
		this.validateTextDocument(change.document);
	}


	/**
	 * Called when a document is closed.
	 * @param event The event containing the closed document.
	 */
	private onDidClose(event: { document: TextDocument }): void {
		// Clear diagnostics for closed files if necessary with empty array.
		// TODO: This is over optimistic.
		this.connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
	}


	/**
	 * Core logic for validating a document.
	 * @param textDocument The text document to validate.
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
	 * @param params The parameters for the hover request.
	 * @returns A promise that resolves to a Hover object or null.
	 */
	private async onHover(params: { textDocument: any, position: any }): Promise<any> {
		const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
		if (!document) {
			return null;
		}

		const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
		const offset: number = document.offsetAt(params.position);
		const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);

		// iterate over schema and return the property context, maybe encapsulate it later as it will be useful for completions as well.
		const schemas: MatchingSchema[] = await this.jsonLanguageService.getMatchingSchemas(document, jsonDocument);

		let isHovering: number = PointerType.none;

		schemas.forEach((s) => {
			const props = s.schema.properties;
			if (props) {
				Object.keys(props).forEach(key => {
					const schemaProp: any = props[key];
					if (node?.parent?.type === "property" && node.parent.keyNode.value === key && "pointer" in schemaProp) {
						switch (schemaProp.pointer) {
							case PointerType.localized_text:
								isHovering = PointerType.localized_text;
								break;
							case PointerType.brushes:
								isHovering = PointerType.brushes;
								break;
							default:
								break;
						}
					}
				});
			}
		});

		if (node && node.type === "string" && node.value) {
			if (JsonAST.isNodeValue(node)) {
				if (isHovering === PointerType.brushes && this.workspaceFolder) {
					const textureHover: Hover | null = await this.textureManager.getHover(node.value);
					if (textureHover) {
						return textureHover;
					}
				}

				if (isHovering === PointerType.localized_text) {
					const localizeHover: Hover | null = this.localizationManager.getHover(node.value);
					if (localizeHover) {
						return localizeHover;
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

		if (node && node.type === 'string' && JsonAST.isNodeValue(node)) {
			const identifier: string = node.value;
			const paths: string[] | undefined = this.indexManager.getPaths(identifier);

			if (paths && paths.length > 0) {
				// Map all found paths to Locations.
				return paths.map(filePath => {
					const location: Location = Location.create(
						pathToFileURL(filePath).toString(),
						Range.create(0, 0, 0, 0) // Point to start of file
					);
					return location;
				});
			}
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

		// TODO: Implement code completions.
		// 1. Identify the current property node.
		// 2. Check if that property maps to a known type.
		// 3. Return list of CompletionItems from the relevant manager.
		if (node && node.type === "string" && JsonAST.isNodeValue(node)) {
			const defaultSuggestions: CompletionList | null = await this.jsonLanguageService.doComplete(document, params.position, jsonDocument);
			return defaultSuggestions;
		}

		return {
			isIncomplete: false,
			items: []
		};
	}

}


// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
