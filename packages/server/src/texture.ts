import * as fs from "fs";
import * as path from "path";
import { pathToFileURL } from "url";
import { Hover, MarkupKind } from "vscode-languageserver/node";

/**
 * Manages texture files within the workspace.
 */
export class TextureManager {

	/**
	 * A cache mapping texture keys to their file paths.
	 */
	private cache: Map<string, string> = new Map();

	/**
	 * The maximum directory depth for the file searcher.
	 */
	private readonly searchMaxDepth = 5;


	public async loadFromWorkspace(rootPath: string): Promise<void> {
		this.cache.clear();

		const files: string[] = await this.findTextureFiles(rootPath);
		for (const file of files) {
			try {
				const fileName: string = path.basename(file);
				const fileKey: string = fileName.split(".")[0];
				this.cache.set(fileKey, file);
			}
			catch (error) {
				console.error(`Failed to load texture file: ${file}`, error);
			}
		}

		console.log(`Loaded ${this.cache.size} texture keys for workspace '${rootPath}'`);
	}


	private async findTextureFiles(directory: string, depth: number = 0): Promise<string[]> {
		if (depth > this.searchMaxDepth) {
			console.log(`Search depth maximum hit. (depth:${depth}): ${directory}`);
			return [];
		}

		let results: string[] = [];
		try {
			const list = await fs.promises.readdir(directory, { withFileTypes: true });
			for (const entry of list) {
				const fullPath: string = path.join(directory, entry.name);

				if (entry.isDirectory()) {
					// Skip `node_modules` and `.git` to save time, though `node_modules` is unlikely.
					if (entry.name !== "node_modules" && entry.name !== ".git") {
						const result: string[] = await this.findTextureFiles(fullPath, depth + 1);
						results = results.concat(result);
					}
				}
				else if (entry.name.endsWith(".png")) {
					results.push(fullPath);
				}
			}

		}
		catch (error) {
			// TODO: Ignore "Access Denied" errors (like System Volume Information or locked folders).
			console.error(`Failed search (depth:${depth}): ${directory}`, error);
		}

		return results;
	}


	/**
	 * Provides hover support for texture files.
	 *
	 * TODO:
	 * - Add support for Direct Draw Surface (DDS).
	 *
	 * @param key The texture key value from the JSON (`"trader_light_frigate_hud_icon"`).
	 */
	public async getHover(key: string): Promise<Hover | null> {
		if (!this.cache.has(key)) {
			return null;
		}

		const fullPath: string = this.cache.get(key) || "";
		try {
			await fs.promises.access(fullPath);

			const fileUrl: string = pathToFileURL(fullPath).toString();

			const buffer: Buffer = await fs.promises.readFile(fullPath);
			const base64: string = buffer.toString("base64");
			const uri: string = `data:image/png;base64,${base64}`;

			const markdown: string[] = [];
			markdown.push("**Texture Preview**");
			markdown.push(`[${fullPath}](${fileUrl})`);
			markdown.push(`![${key}](${uri})`);

			const hover: Hover = {
				contents: {
					kind: MarkupKind.Markdown,
					value: markdown.join("\n\n")
				}
			};

			return hover;
		}
		catch (error) {
			// File not found or read error.
			console.error(`Error reading texture file at ${fullPath}:`, error);
			return null;
		}
	}


}
