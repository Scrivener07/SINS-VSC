import * as fs from "fs";
import * as path from "path";
import { WorkspaceSearch } from "../managers";

/**
 * Represents a single file entry in the virtual file system.
 */
export interface FileEntry {
    /**
     * Filename without extension, lowercased.
     * - Example: `advent_commerce_0`
     */
    readonly fileKey: string;

    /**
     * Full absolute path on disk.
     * - Example: `C:\Sins2\entities\advent_commerce_0.research_subject`
     */
    readonly filePath: string;

    /**
     * File extension including dot.
     * - Example: `.research_subject`
     */
    readonly extension: string;
}

/**
 * Represents one data source directory (base game or mod).
 * Scans once and stores a catalog of all files found sorted by extension.
 */
export class DataSource {
    public readonly directory: string;
    public readonly name: string;
    public readonly priority: number;

    /** extension → fileKey → FileEntry */
    private readonly catalog = new Map<string, Map<string, FileEntry>>();

    private watcher: fs.FSWatcher | undefined = undefined;

    constructor(directory: string, name: string, priority: number) {
        this.directory = directory;
        this.name = name;
        this.priority = priority;
    }

    public dispose(): void {
        this.watcher_dispose();
    }

    //#region Scan

    public async scan(): Promise<void> {
        this.catalog.clear();
        await WorkspaceSearch.scanFiles(this.directory, this.onScan.bind(this));
    }

    private onScan(filePath: string): void {
        const extension: string = path.extname(filePath);
        if (!extension) {
            return;
        }

        // TODO: Consolidate with catalogAdd method once it has been proven to work with watch events.
        const fileKey: string = path.basename(filePath, extension).toLowerCase();
        let bucket: Map<string, FileEntry> | undefined = this.catalog.get(extension);
        if (!bucket) {
            bucket = new Map();
            this.catalog.set(extension, bucket);
        }

        const entry: FileEntry = { fileKey, filePath, extension };
        bucket.set(fileKey, entry);
    }

    //#endregion

    //#region Watcher

    private readonly pendingEvents = new Map<string, fs.WatchEventType>();
    private flushTimeout: ReturnType<typeof setTimeout> | undefined;

    public watch(): void {
        this.watcher_dispose();
        try {
            this.watcher = fs.watch(this.directory, { recursive: true }, this.onWatch.bind(this));
        } catch (error) {
            console.error(`Failed to watch directory: ${this.directory}`, error);
        }
    }

    private onWatch(eventType: fs.WatchEventType, filename: string | null): void {
        // console.log(`Source: ${this.name}, File changed: ${filename} (${eventType})`);

        if (!filename) {
            return;
        }

        // debounce

        // Accumulate events, last event type wins per filename.
        this.pendingEvents.set(filename, eventType);

        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
        }
        this.flushTimeout = setTimeout(() => this.flushPendingEvents(), 300);
    }

    private flushPendingEvents(): void {
        for (const [filename, eventType] of this.pendingEvents) {
            this.processWatchEvent(eventType, filename);
        }
        this.pendingEvents.clear();
    }

    private processWatchEvent(eventType: fs.WatchEventType, filename: string): void {
        const filePath: string = path.join(this.directory, filename);
        const extension: string = path.extname(filePath);

        // Ignore directory events and files without extensions.
        if (!extension) {
            return;
        }

        const fileKey: string = path.basename(filePath, extension).toLowerCase();

        if (eventType === "rename") {
            // "rename" fires for create, delete, and rename.
            // Check if the file exists to determine which.
            const exists: boolean = fs.existsSync(filePath);

            if (exists) {
                // File was created (or is the new name of a rename).
                this.catalogAdd(extension, fileKey, filePath);
                console.log(`Source: ${this.name}, File added: ${filename}`);
            } else {
                // File was deleted (or is the old name of a rename).
                this.catalogRemove(extension, fileKey);
                console.log(`Source: ${this.name}, File removed: ${filename}`);
            }
        } else if (eventType === "change") {
            // File content changed. The catalog entry (path/key) doesn't change, but downstream caches may need invalidation.
            if (this.catalog.get(extension)?.has(fileKey)) {
                console.log(`Source: ${this.name}, File modified: ${filename}`);
                // TODO: Notify listeners that cached data for this file is stale.
            }
        }
    }

    private watcher_dispose(): void {
        if (this.flushTimeout) {
            clearTimeout(this.flushTimeout);
            this.flushTimeout = undefined;
        }
        this.pendingEvents.clear();

        if (this.watcher) {
            this.watcher.close();
            this.watcher = undefined;
        }
    }

    //#endregion

    //#region Catalog

    private catalogAdd(extension: string, fileKey: string, filePath: string): void {
        let bucket: Map<string, FileEntry> | undefined = this.catalog.get(extension);
        if (!bucket) {
            bucket = new Map();
            this.catalog.set(extension, bucket);
        }

        const entry: FileEntry = { fileKey, filePath, extension };
        bucket.set(fileKey, entry);
    }

    private catalogRemove(extension: string, fileKey: string): void {
        const bucket: Map<string, FileEntry> | undefined = this.catalog.get(extension);
        if (bucket) {
            bucket.delete(fileKey);
            if (bucket.size === 0) {
                this.catalog.delete(extension);
            }
        }
    }

    //#endregion

    //#region Query

    /** Get a specific file by extension and key. */
    public getFile(extension: string, fileKey: string): FileEntry | undefined {
        fileKey = fileKey.toLowerCase();
        return this.catalog.get(extension)?.get(fileKey);
    }

    /** Get all files of a given extension. */
    public getFilesByExtension(extension: string): Map<string, FileEntry> | undefined {
        return this.catalog.get(extension);
    }

    /** Get all extensions this source contains. */
    public getExtensions(): Iterable<string> {
        return this.catalog.keys();
    }

    //#endregion
}

// class Watcher {
//     constructor() {}
// }
