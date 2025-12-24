import * as fs from "fs";
import * as path from "path";

/**
 * Manages workspace-related operations such as file searching.
 */
export class WorkspaceManager {
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
        if (depth > WorkspaceManager.searchMaxDepth) {
            console.log(`Search depth maximum hit. (depth:${depth}): ${directory}`);
            return [];
        }

        let results: string[] = [];
        try {
            const list = await fs.promises.readdir(directory, { withFileTypes: true });
            for (const entry of list) {
                const fullPath: string = path.join(directory, entry.name);

                if (entry.isDirectory()) {
                    if (!WorkspaceManager.ignoreFolders.has(entry.name)) {
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
