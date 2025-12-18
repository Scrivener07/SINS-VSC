import * as fs from "fs";
import * as path from "path";
import * as shared from "@soase/shared";
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
import {
	ASTNode,
	CompletionItemKind,
	DocumentSymbol,
	getLanguageService,
	JSONDocument,
	LanguageService,
	LanguageSettings,
	Location,
	Range,
	SymbolInformation
} from "vscode-json-languageservice";
import { fileURLToPath, pathToFileURL } from "url";
import { SchemaPatcher } from "./json-schema";
import { LocalizationManager } from "./localization";
import { PointerType, SchemaManager } from "./schema";
import { TextureManager } from "./texture";
import { JsonAST } from "./json-ast";
import { IndexManager } from "./data-manager";
import { CacheManager, CompletionManager } from "./completion";


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

	private completionManager: CompletionManager;

	private cacheManager: CacheManager;

	/** The index manager to use. */
	private indexManager: IndexManager;

	private currentLanguageCode: string = "en";
	private isInitialized: boolean;


	constructor() {
		// Create the LSP connection.
		this.connection = createConnection(ProposedFeatures.all);

		// Create a manager for open text documents.
		this.documents = new TextDocuments(TextDocument);

		this.isInitialized = false;

		this.schemaPatcher = new SchemaPatcher();
		this.localizationManager = new LocalizationManager();
		this.textureManager = new TextureManager();
		this.cacheManager = new CacheManager();
		this.completionManager = new CompletionManager(this.cacheManager);
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
		this.connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));

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
		this.connection.console.log("Server initialized.");

		// Initialize workspace data managers.
		if (this.workspaceFolder) {
			const fsPath: string = fileURLToPath(this.workspaceFolder);
			await Promise.all([
				this.localizationManager.loadFromWorkspace(fsPath).then(() =>
					this.connection.console.log("Localization data loaded")
				),
				this.textureManager.loadFromWorkspace(fsPath).then(() =>
					this.connection.console.log("Texture data loaded")
				),
				this.completionManager.loadFromWorkspace(fsPath).then(() =>
					this.connection.console.log("Completion data loaded")
				)
			]);
			this.indexManager.rebuildIndex(fsPath);
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
		this.connection.console.log(`[Server(${process.pid}) ${this.workspaceFolder}] Document opened: ${event.document.uri}`);
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

		// Using `sendRequest` creates client specific coupling on the agnostic server.
		this.connection.sendRequest(shared.PROPERTIES.language).then((code: any) => this.currentLanguageCode = code);
		await this.validateTextDocument(change.document);

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

	private async validatePointers(document: TextDocument, jsonDocument: JSONDocument): Promise<Diagnostic[]> {
		const diagnostics: Diagnostic[] = [];
		const cache = this.cacheManager.getCache();

		function walk(node: ASTNode | undefined, pointer: PointerType) {
			if (!node || node.value === null) {
				return;
			}

			if (node.type === "array") {
				node.items.forEach(item => walk(item, pointer));
				return;
			}

			const range: Range = {
				start: document.positionAt(node.offset),
				end: document.positionAt(node.offset + node.length)
			};

			const value = node.value as string;

			switch (pointer) {
				case PointerType.localized_text:
					// TODO: create a function for diagnostic logging
					if (!cache.localized_text.has(value)) {
						diagnostics.push({ severity: 1, range, message: `- no localisation key found for: "${value}".`, source: shared.SOURCE });
					}
					break;
				case PointerType.brushes:
					if (!cache.brushes.has(value)) {
						diagnostics.push({ severity: 1, range, message: `- no texture found for: "${value}".`, source: shared.SOURCE });
					}
					break;
				case PointerType.unit_skins:
					if (!cache.unit_skins.has(value)) {
						diagnostics.push({ severity: 1, range, message: `- no unit_skin found for: "${value}".`, source: shared.SOURCE });
					}
					break;
			}
		};

		const schemas = await this.jsonLanguageService.getMatchingSchemas(document, jsonDocument);
		schemas.forEach(schemaMatch => {
			const props = schemaMatch.schema.properties;
			if (!props) {
				return;
			}

			Object.keys(props).forEach(key => {
				const schemaProp: any = props[key];

				if (!("pointer" in schemaProp)) {
					return;
				}

				const nodes = JsonAST.findNodes(jsonDocument.root, key);
				nodes.forEach(node => {
					// prevent validation on properties with the same names that aren't in the same context
					if (!JsonAST.isWithinSchemaNode(node.offset, schemaMatch.node)) {
						return;
					}
					walk(node.valueNode, schemaProp.pointer);
				});
			});
		});

		return diagnostics;
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
		const diagnostics: Diagnostic[] = [
			...(await this.jsonLanguageService.doValidation(textDocument, jsonDocument)),
			...(await this.validatePointers(textDocument, jsonDocument))
		];

		// Send the diagnostics to the client.
		this.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
	}

	public async getContext(jsonLanguageService: LanguageService, document: TextDocument, jsonDocument: JSONDocument, node: ASTNode | undefined): Promise<PointerType> {
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

			const props = schema.schema.properties;
			if (!props) {
				continue;
			}

			const key = currentNode.keyNode.value;
			const schemaProp: any = props[key];

			if (!("pointer" in schemaProp)) {
				continue;
			}

			return schemaProp.pointer as PointerType;

		}

		return PointerType.none;
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
		const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);
		console.log("Hover context:", PointerType[context]);

		if (node && node.type === "string" && node.value) {
			if (JsonAST.isNodeValue(node)) {
				if (context === PointerType.brushes && this.workspaceFolder) {
					const textureHover: Hover | null = await this.textureManager.getHover(node.value);
					if (textureHover) {
						return textureHover;
					}
				}

				if (context === PointerType.localized_text) {
					const localizeHover: Hover | null = this.localizationManager.getHover(node.value, this.currentLanguageCode);
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
		const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);

		if (node && node.type === 'string' && JsonAST.isNodeValue(node)) {
			const identifier: string = node.value;
			let paths: string[] | undefined = this.indexManager.getPaths(identifier);
			let range: Range = Range.create({ character: 0, line: 0 }, { character: 0, line: 0 });


			if (context === PointerType.localized_text) {
				// TODO: encapsulate this later...
				paths = this.indexManager.getPaths(this.currentLanguageCode);

				const localisation = this.cacheManager.getCache().localized_text;
				if (!localisation.has(identifier) || !paths) {
					return null;
				}

				const text = await fs.promises.readFile(paths[0], "utf-8");
				const lines = text.split("\n");
				for (let i = 0; i < lines.length; i++) {
					const idx = lines[i].indexOf(`"${identifier}"`);
					if (idx !== -1) {
						range = Range.create({ line: i, character: idx }, { line: i, character: idx + identifier.length + 2 });
						break;
					}
				}
			}
			if (paths && paths.length > 0) {
				// Map all found paths to Locations.
				return paths.map(filePath => {
					const location: Location = Location.create(
						pathToFileURL(filePath).toString(),
						range // Point to start of file
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
		const context: PointerType = await this.getContext(this.jsonLanguageService, document, jsonDocument, node);

		// TODO: Implement code completions.
		// 1. Identify the current property node.
		// 2. Check if that property maps to a known type.
		// 3. Return list of CompletionItems from the relevant manager.

		if (node) {
			const range: Range = {
				start: document.positionAt(node.offset + 1),
				end: document.positionAt(node.offset + node.length - 1)
			};
			if (context === PointerType.localized_text) {
				const localisation: CompletionList = this.completionManager.setCompletionList("localized_text", CompletionItemKind.Constant, range);
				return localisation;
			} else if (context === PointerType.brushes) {
				const textures: CompletionList = this.completionManager.setCompletionList("brushes", CompletionItemKind.File, range);
				return {
					isIncomplete: textures.isIncomplete,
					items: textures.items.filter(e => e.label.endsWith(".dds") || e.label.endsWith(".png")).map(e => {
						const label = path.basename(e.label, path.extname(e.label));
						return {
							label: e.label,
							kind: e.kind,
							textEdit: { range, newText: label }
						};
					})
				};
			} else if (context === PointerType.unit_skins) {
				const unit_skins: CompletionList = this.completionManager.setCompletionList("unit_skins", CompletionItemKind.Enum, range);
				return unit_skins;
			}
		}


		const defaultSuggestions: CompletionList | null = await this.jsonLanguageService.doComplete(document, params.position, jsonDocument);

		return defaultSuggestions;
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


}


// Start the language server instance.
//--------------------------------------------------
void new SinsLanguageServer();
