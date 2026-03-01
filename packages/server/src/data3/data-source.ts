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

    constructor(directory: string, name: string, priority: number) {
        this.directory = directory;
        this.name = name;
        this.priority = priority;
    }

    public async scan(): Promise<void> {
        this.catalog.clear();
        await WorkspaceSearch.scanFiles(this.directory, this.onScan.bind(this));
    }

    private onScan(filePath: string): void {
        const extension: string = path.extname(filePath);
        if (!extension) {
            return;
        }

        const fileKey: string = path.basename(filePath, extension).toLowerCase();
        let bucket: Map<string, FileEntry> | undefined = this.catalog.get(extension);
        if (!bucket) {
            bucket = new Map();
            this.catalog.set(extension, bucket);
        }

        const entry: FileEntry = { fileKey, filePath, extension };
        bucket.set(fileKey, entry);
    }

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
}
