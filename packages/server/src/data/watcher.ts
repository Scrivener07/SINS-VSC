import * as fs from "fs";
import * as path from "path";

/**
 * The type of file change detected after disambiguating `fs.watch` events.
 */
export enum FileChangeType {
    Added = "added",
    Removed = "removed",
    Modified = "modified"
}

/**
 * Represents a single disambiguated file change event.
 */
export interface FileChangeEvent {
    /** The type of change that occurred. */
    readonly type: FileChangeType;

    /** The relative path from the watched directory. */
    readonly relativePath: string;

    /** The full absolute path on disk. */
    readonly filePath: string;

    /** The file extension including dot.*/
    readonly extension: string;

    /** The filename without extension, lowercased. */
    readonly fileKey: string;
}

/**
 * A callback invoked with a batch of disambiguated file change events.
 */
export type FileChangeListener = (events: FileChangeEvent[]) => void;

/**
 * Wraps `fs.watch` to provide debounced and disambiguated file change events.
 *
 * The native `fs.watch` API is platform-inconsistent and emits raw `"change"` and `"rename"` events.
 * These don't distinguish between create, delete, and rename.
 *
 * - Debounces rapid-fire events into batches.
 * - Disambiguates `"rename"` into added/removed by checking `fs.existsSync`.
 * - Filters out directory events and extensionless files.
 * - Emits a single batch of {@link FileChangeEvent} objects per flush cycle.
 */
export class Watcher {
    private readonly directory: string;
    private readonly debounce: number;
    private readonly listener: FileChangeListener;

    private readonly pending = new Map<string, fs.WatchEventType>();
    private flushTimeout: ReturnType<typeof setTimeout> | undefined;

    private watcher: fs.FSWatcher | undefined = undefined;

    /**
     * Creates a new Watcher instance.
     * @param directory The absolute path of the directory to watch recursively.
     * @param debounce The debounce interval in milliseconds.
     * @param listener The event callback to invoke.
     */
    constructor(directory: string, debounce: number, listener: FileChangeListener) {
        this.directory = directory;
        this.debounce = debounce;
        this.listener = listener;
    }

    /**
     * Starts watching the directory for file changes.
     * If already watching, the previous watcher is disposed first.
     */
    public start(): void {
        this.dispose();
        try {
            this.watcher = fs.watch(this.directory, { recursive: true }, this.onWatch.bind(this));
        } catch (error) {
            console.error(`Watcher: Failed to watch directory: ${this.directory}`, error);
        }
    }

    /**
     * Disposes the watcher by stopping the watch and clearing pending events.
     */
    public dispose(): void {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = undefined;
        }
        this.pending.clear();

        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
    }

    //#region Watcher

    /**
     * Raw `fs.watch` callback. Accumulates events and schedules a debounced flush.
     */
    private onWatch(eventType: fs.WatchEventType, filename: string | null): void {
        if (!filename) {
            return;
        }

        this.pending.set(filename, eventType);

        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
        }
        this.flushTimeout = setTimeout(() => this.flush(), this.debounce);
    }

    /**
     * Processes all pending raw events, disambiguates them, and emits a single batch.
     */
    private flush(): void {
        const events: FileChangeEvent[] = [];

        for (const [filename, eventType] of this.pending) {
            const event: FileChangeEvent | undefined = this.toEvent(eventType, filename);
            if (event) {
                events.push(event);
            }
        }
        this.pending.clear();

        if (events.length > 0) {
            this.listener(events);
        }
    }

    /**
     * Converts a raw `fs.watch` event into a disambiguated {@link FileChangeEvent},
     * @param eventType The raw event type from `fs.watch` ("rename" or "change").
     * @param filename The filename relative to the watched directory.
     * @returns A {@link FileChangeEvent}, or `undefined` if the event should be ignored (directories, extensionless files).
     */
    private toEvent(eventType: fs.WatchEventType, filename: string): FileChangeEvent | undefined {
        const filePath: string = path.join(this.directory, filename);
        const extension: string = path.extname(filePath);

        // Ignore directory events and files without extensions.
        if (!extension) {
            return undefined;
        }

        let type: FileChangeType;
        if (eventType === "rename") {
            if (fs.existsSync(filePath)) {
                type = FileChangeType.Added;
            } else {
                type = FileChangeType.Removed;
            }
        } else if (eventType === "change") {
            type = FileChangeType.Modified;
        } else {
            return undefined;
        }

        return {
            type: type,
            relativePath: filename,
            filePath: filePath,
            extension: extension,
            fileKey: path.basename(filePath, extension).toLowerCase()
        };
    }

    //#endregion
}
