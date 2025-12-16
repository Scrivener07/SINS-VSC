import * as path from "path";
import { pathToFileURL } from "url";
import { Hover, MarkupKind } from "vscode-languageserver/node";
import { WorkspaceManager } from "./workspace";

/**
 * Manages texture files within the workspace.
 */
export class TextureManager {

	/**
	 * A cache mapping texture keys to their file paths.
	 */
	private cache: Map<string, string> = new Map();

	public async loadFromWorkspace(rootPath: string): Promise<void> {
		this.cache.clear();

		const files: string[] = await WorkspaceManager.findFiles(rootPath, ".png");
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
			const fileUrl: string = pathToFileURL(fullPath).toString();

			const markdown: string[] = [];
			markdown.push("**Texture Preview**");
			markdown.push(`[image](${fileUrl})`);
			markdown.push(`![${key}](${fileUrl})`);

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
