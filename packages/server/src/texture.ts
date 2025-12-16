import * as fs from "fs";
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

	/** The maximum image preview size in kilobytes. */
	private static readonly MAX_PREVIEW_KB = 100;


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
	 * NOTE:
	 * - Preview limited to `100 Kilobytes` (`102400 Bytes`).
	 *
	 * TODO:
	 * - Add support for Direct Draw Surface (DDS).
	 * - Possibly add emoji for too-large warning.
	 *
	 * @param key The texture key value from the JSON (`"trader_light_frigate_hud_icon"`).
	 */
	public async getHover(key: string): Promise<Hover | null> {
		if (!this.cache.has(key)) {
			return null;
		}

		const fullPath: string = this.cache.get(key) || "";

		try {
			// The file stats return the size as bytes.
			const stats = await fs.promises.stat(fullPath);

			const fileUrl: string = pathToFileURL(fullPath).toString();

			const markdown: string[] = [];
			markdown.push("**Texture Preview**");

			// Navigation to the file should always be available.
			markdown.push(`[Open File](${fileUrl})`);

			// Determine the image content (Preview vs Warning)
			if (stats.size <= 1024 * TextureManager.MAX_PREVIEW_KB) {
				const buffer: Buffer = await fs.promises.readFile(fullPath);
				const base64: string = buffer.toString("base64");
				const uri: string = `data:image/png;base64,${base64}`;
				markdown.push(`![${key}](${uri})`);
			} else {
				markdown.push(`_(Image too large for preview: ${(stats.size / 1024).toFixed(1)} KB)_`);
				markdown.push(`Maximum file size is ${TextureManager.MAX_PREVIEW_KB} KB.`);
			}

			// The file protocol string did not work correctly.
			// Let me know what you advise when you are able.
			// - Scrivener
				// markdown.push(`[image](${fileUrl})`);
				// markdown.push(`![${key}](file:///${fullPath})`);

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
