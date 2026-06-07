import * as path from "path";
import { FileSearch, Watcher, FileChangeEvent, FileChangeType } from "../files";

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
 * Callback invoked after the catalog has been updated from file system changes.
 */
export type CatalogChangeListener = (source: DataSource, events: FileChangeEvent[]) => void;

/**
 * Represents one data source directory (base game or mod).
 * Scans once and stores a catalog of all files found sorted by extension.
 */
export class DataSource {
    /**
     * The root directory of the data source.
     * This is used as a primary key for lookups.
     */
    public readonly directory: string;

    /**
     * A friendly display name for the source, used in logging and debugging.
     */
    public readonly name: string;

    /**
     * The priority of the source. Higher priority sources override lower ones.
     *
     * TODO: deprecate in favor of explicit dependency graph construction.
     */
    public readonly priority: number;

    public readonly dependencies: string[];

    public readonly kind: "game" | "mod";

    /** extension → fileKey → FileEntry */
    private readonly catalog = new Map<string, Map<string, FileEntry>>();
    private onCatalogChanged: CatalogChangeListener | undefined;

    /**
     * Registers a listener that is notified after catalog mutations from file system changes.
     * Only one listener is supported for the owning instance.
     */
    public setChangeListener(listener: CatalogChangeListener | undefined): void {
        this.onCatalogChanged = listener;
    }

    private readonly watcher: Watcher;

    constructor(directory: string, name: string, priority: number, dependencies: string[] = [], kind: "game" | "mod" = "mod") {
        this.directory = directory;
        this.name = name;
        this.priority = priority;
        this.dependencies = dependencies;
        this.kind = kind;
        this.watcher = new Watcher(this.directory, 300, this.onFileChanged.bind(this));
    }

    public load(): void {
        //
    }

    public unload(): void {
        this.watcher.close();
    }

    //#region Scan

    public async scan(): Promise<void> {
        this.catalog.clear();
        await FileSearch.scanFiles(this.directory, this.onScan.bind(this));
    }

    private onScan(filePath: string): void {
        const extension: string = path.extname(filePath);
        if (!extension) {
            return;
        }

        const fileKey: string = path.basename(filePath, extension).toLowerCase();
        this.add(extension, fileKey, filePath);
    }

    //#endregion

    //#region Watch

    public watch(): void {
        this.watcher.watch();
    }

    private onFileChanged(events: FileChangeEvent[]): void {
        for (const event of events) {
            console.log(`Source: ${this.name}, Action: ${event.type}, File: ${event.relativePath}`);

            switch (event.type) {
                case FileChangeType.Added:
                    this.add(event.extension, event.fileKey, event.filePath);
                    break;
                case FileChangeType.Removed:
                    this.remove(event.extension, event.fileKey);
                    break;
                case FileChangeType.Modified:
                    // TODO: Notify listeners that cached data for this file is stale.
                    break;
            }
        }

        // Notify listeners for a catalog change.
        this.onCatalogChanged?.(this, events);
    }

    //#endregion

    //#region Catalog

    private add(extension: string, fileKey: string, filePath: string): void {
        let bucket: Map<string, FileEntry> | undefined = this.catalog.get(extension);
        if (!bucket) {
            bucket = new Map();
            this.catalog.set(extension, bucket);
        }

        const entry: FileEntry = { fileKey, filePath, extension };
        bucket.set(fileKey, entry);
    }

    private remove(extension: string, fileKey: string): void {
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
