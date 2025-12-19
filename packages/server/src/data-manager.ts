import * as path from "path";
import { WorkspaceManager } from "./workspace";
import * as shared from "@soase/shared";


/**
 * Manages an index of files within the workspace for quick lookup by identifier.
 */
export class IndexManager {

	/**
	 * Maps a filename (without extension) to a list of absolute file paths.
	 *
	 * @example "trader_loyalist" -> "c:/sins2/entities/trader_loyalist.player"
	 */
	private fileIndex: Map<string, string[]> = new Map();


	/**
	 * Indexes all relevant files in the given root path.
	 * @param rootPath The root directory to index.
	 */
	public async rebuildIndex(rootPath: string): Promise<void> {
		this.fileIndex.clear();
		console.time(`Indexing::'${rootPath}'`);

		for (const extension of shared.JSON_EXTENSIONS.values()) {
			const files: string[] = await WorkspaceManager.findFiles(rootPath, extension);
			for (const file of files) {
				this.addToIndex(file);
			}
		}

		console.timeEnd(`Indexing::'${rootPath}'`);
		console.log(`Indexed ${this.fileIndex.size} unique IDs in '${rootPath}'.`);
	}


	/**
	 * Adds a file to the index.
	 * @param filePath The absolute path of the file to add.
	 */
	private addToIndex(filePath: string): void {
		const fileName: string = path.basename(filePath);
		const identifier: string = fileName.split(".")[0];

		if (!this.fileIndex.has(identifier)) {
			this.fileIndex.set(identifier, []);
		}
		this.fileIndex.get(identifier)?.push(filePath);
	}


	/**
	 * Retrieves the list of file paths associated with the given identifier.
	 * @param identifier The identifier to look up.
	 * @returns An array of file paths or undefined if the identifier is not found.
	 */
	public getPaths(identifier: string): string[] | undefined {
		return this.fileIndex.get(identifier);
	}


}
