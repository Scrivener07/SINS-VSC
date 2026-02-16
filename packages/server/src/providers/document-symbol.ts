import { Connection, DocumentSymbolParams, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DocumentSymbol, JSONDocument, LanguageService } from "vscode-json-languageservice";

export class DocumentSymbolProvider {
    private jsonLanguageService: LanguageService;

    private documents: TextDocuments<TextDocument>;

    constructor(jsonLanguageService: LanguageService, documents: TextDocuments<TextDocument>) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
    }

    /**
     * Registers the feature handler with the LSP connection.
     * @param connection The LSP connection to register the handler on.
     */
    public register(connection: Connection): void {
        connection.onDocumentSymbol(this.onDocumentSymbol.bind(this));
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
