import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { InitializeParams } from "vscode-languageserver/node";

/**
 * Manages workspace directories and files.
 *
 * TODO: Support workspace folder changes.
 */
export class WorkspaceService {
    /** A cached string to the vanilla game installation folder. */
    public gameFolder: string | null = null;

    /** A cached string to the workspace folder this server is operating on. */
    public modFolder: string | null = null;

    public initialize(parameters: InitializeParams): void {
        // The vanilla game installation directory.
        const vanilla: string = parameters.initializationOptions.vanilla;
        this.gameFolder = fileURLToPath(vanilla);

        // All workspace folders.
        if (parameters.workspaceFolders) {
            for (const folder of parameters.workspaceFolders) {
                this.modFolder = fileURLToPath(folder.uri);
                break; // TODO: Using only the first workspace folder for now.
            }
        }
    }
}

/**
 * Manages workspace related operations such as file searching.
 */
export class WorkspaceSearch {
    /**
     * The maximum directory depth for the file searcher.
     */
    private static readonly searchMaxDepth: number = 5;

    /**
     * Folders to ignore during the file search.
     */
    private static readonly ignoreFolders: Set<string> = new Set<string>([".git", ".vscode", ".vs", "node_modules"]);

    /**
     * Recursive finder for workspace files.
     *
     * TODO: Implement `Promise.all` to scan subdirectories in parallel.
     *
     * @param directory The root directory to start the search from.
     * @param fileExtension The file extension to search for (.txt).
     * @param depth The maximum folder depth to recurse into.
     * @returns A promise that resolves to an array of file paths matching the extension.
     */
    public static async findFiles(directory: string, fileExtension: string, depth: number = 0): Promise<string[]> {
        if (depth > WorkspaceSearch.searchMaxDepth) {
            console.log(`Search depth maximum hit. (depth:${depth}): ${directory}`);
            return [];
        }

        let results: string[] = [];
        try {
            const list = await fs.promises.readdir(directory, { withFileTypes: true });
            for (const entry of list) {
                const fullPath: string = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    if (!WorkspaceSearch.ignoreFolders.has(entry.name)) {
                        const result: string[] = await this.findFiles(fullPath, fileExtension, depth + 1);
                        results = results.concat(result);
                    }
                } else if (entry.name.endsWith(fileExtension)) {
                    results.push(fullPath);
                }
            }
        } catch (error) {
            // TODO: Ignore "Access Denied" errors (like System Volume Information or locked folders).
            console.error(`Failed search (depth:${depth}): ${directory}`, error);
        }

        return results;
    }
}
