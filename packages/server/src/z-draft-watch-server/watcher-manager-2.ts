import {
    //
    Connection,
    DidChangeWatchedFilesNotification,
    Disposable,
    FileChangeType,
    FileEvent,
    WatchKind
} from "vscode-languageserver/node";
import { fileURLToPath } from "url";

export interface WatchedDirectoryListener {
    (events: FileEvent[]): void;
}

type WatcherItem = { disposable: Disposable; listener: WatchedDirectoryListener };

/**
 * @deprecated
 * Manages dynamic file system watchers via LSP dynamic capability registration.
 *
 * The server sends `client/registerCapability` to ask VS Code to watch specific directories.
 * Change events arrive via `workspace/didChangeWatchedFiles`.
 *
 * This allows watching directories outside the workspace (game install, mod dependencies).
 *
 * Note: Only a SINGLE callback handler can be registered for `this.connection.onDidChangeWatchedFiles`.
 */
export class FileWatcherManager {
    private readonly connection: Connection;

    /** Listeners keyed by source directory. */
    private readonly watchers = new Map<string, WatcherItem>();

    constructor(connection: Connection) {
        this.connection = connection;

        // Single global handler that dispatches to per-directory listeners.
        this.connection.onDidChangeWatchedFiles((parameters) => {
            this.dispatch(parameters.changes);
        });
    }

    /**
     * Registers a dynamic file watcher for a directory.
     * Asks the client to start watching a directory. Events will be routed to `listener`.
     * @param directory The absolute directory path to watch.
     * @param listener Callback invoked with file change events for this directory.
     * @returns A promise that resolves when the watcher is registered.
     */
    public async watch(directory: string, listener: WatchedDirectoryListener): Promise<void> {
        // Normalize the directory path for consistent matching.
        const normalizedDirectory: string = directory.toLowerCase();

        // Avoid duplicate registrations.
        if (this.watchers.has(normalizedDirectory)) {
            this.connection.console.warn(`FileWatcherManager: Directory '${directory}' is already being watched.`);
            return;
        }

        // Normalize the directory path for use in a glob pattern.
        // VS Code expects forward slashes in glob patterns.
        const globBase: string = directory.replace(/\\/g, "/");

        // `connection.client.register` returns a Disposable that unregisters the capability.
        const capability = {
            watchers: [
                {
                    // Watch all files recursively under this directory.
                    globPattern: `${globBase}/**/*`,
                    kind: WatchKind.Create | WatchKind.Change | WatchKind.Delete
                }
            ]
        };

        // The library handles ID generation internally and returns a Disposable.
        // The library tracks the registration ID internally, and `.dispose()` sends the correct `client/unregisterCapability` request with the matching ID.
        // To unregister, just dispose it.
        const disposable: Disposable = await this.connection.client.register(DidChangeWatchedFilesNotification.type, capability);

        this.watchers.set(normalizedDirectory, { disposable, listener });
        this.connection.console.info(`FileWatcherManager: Watching '${directory}'`);
    }

    /**
     * Stops watching a directory.
     * Unregisters the file watcher for a directory.
     * @param directory The absolute directory path to stop watching.
     * @returns A promise that resolves when the watcher is unregistered.
     */
    public async unwatch(directory: string): Promise<void> {
        // Normalize the directory path for consistent matching.
        const normalizedDirectory: string = directory.toLowerCase();

        const entry: WatcherItem | undefined = this.watchers.get(normalizedDirectory);
        if (entry) {
            // Ask the client to dispose this watcher.
            // Disposal will trigger the library to send the correct `client/unregisterCapability` request with the matching registration ID.
            entry.disposable.dispose();
            this.watchers.delete(normalizedDirectory);
            this.connection.console.info(`FileWatcherManager: Unwatched '${directory}'`);
        }
    }

    /**
     * Dispatches file change events to the matching directory listener.
     * @param changes The file change events received from the client.
     */
    private dispatch(changes: FileEvent[]): void {
        // Group changes by which watched directory they belong to.
        const grouped = new Map<string, FileEvent[]>();

        for (const change of changes) {
            // FileEvent URIs are file:// URIs. Convert to a path for matching.
            let filePath: string;
            try {
                filePath = fileURLToPath(change.uri).toLowerCase().replace(/\\/g, "/");
            } catch {
                continue;
            }

            for (const [directory] of this.watchers) {
                const normalizedDirectory: string = directory.replace(/\\/g, "/").toLowerCase();

                // Check if this change falls under this watched directory.
                if (filePath.startsWith(normalizedDirectory + "/") || filePath === normalizedDirectory) {
                    let group: FileEvent[] | undefined = grouped.get(directory);
                    if (!group) {
                        group = [];
                        grouped.set(directory, group);
                    }
                    group.push(change);
                    break; // A file belongs to at most one watched directory.
                }
            }
        }

        // Invoke listeners.
        for (const [directory, events] of grouped) {
            const watcher: WatcherItem | undefined = this.watchers.get(directory);
            if (watcher) {
                watcher.listener(events);
            }
        }
    }

    /**
     * Disposes all watchers.
     * TODO: Call on server shutdown.
     */
    public disposeAll(): void {
        for (const [key, entry] of this.watchers) {
            entry.disposable.dispose();
        }
        this.watchers.clear();
    }
}
