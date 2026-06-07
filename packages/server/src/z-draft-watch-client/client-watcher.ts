import { Connection, DidChangeWatchedFilesParams } from "vscode-languageserver/node";

/**
 * @deprecated
 * An isolated test for client file watching configured on the server connection.
 *
 * There is currently a competing server side implementation for file watching that may be used instead.
 */
export class ClientWatcherTestDriver {
    private readonly connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    public register(): void {
        this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));
    }

    private onDidChangeWatchedFiles(parameters: DidChangeWatchedFilesParams): void {
        for (const change of parameters.changes) {
            this.connection.console.info(`[static watcher] ${change.uri} (${change.type})`);
        }
    }
}
