import { Connection, DidChangeWatchedFilesParams, FileEvent, InitializeParams } from "vscode-languageserver/node";
import { FileWatcherManager } from "./watcher-manager-2";

// A test driver that will be deleted once the watcher manager is verified working.
// It simulates the workflow. Dont bother your pretty little head about this class.
export class WatcherService {
    private readonly connection: Connection;
    private readonly watcher: FileWatcherManager;

    constructor(connection: Connection) {
        this.connection = connection;
        this.watcher = new FileWatcherManager(connection);
        // this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));
    }

    public async add(directory: string) {
        await this.watcher.watch(directory, this.onWatch.bind(this));
    }

    public async remove(directory: string) {
        await this.watcher.unwatch(directory);
    }

    private async onWatch(events: FileEvent[]): Promise<void> {
        console.log(`WatcherService::onWatch: Received ${events.length} file events.`);
        for (const event of events) {
            console.log(`    ${event.uri} (${event.type})`);
        }
    }

    // private async onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): Promise<void> {
    //     console.log(`WatcherService::onDidChangeWatchedFiles: Received ${params.changes.length} file events.`);
    //     for (const change of params.changes) {
    //         console.log(`    File change detected: ${change.uri} (${change.type})`);
    //     }
    // }

    private static check_dynamicWatchSupported(connection: Connection, params: InitializeParams): void {
        const isDynamicWatchSupported: boolean = params.capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration === true;
        if (!isDynamicWatchSupported) {
            connection.console.warn("Client does not support dynamic file watcher registration.");
        }
    }
}
