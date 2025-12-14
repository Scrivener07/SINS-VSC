import * as fs from "fs";
import * as path from "path";
import { Hover, MarkupKind } from "vscode-languageserver/node";

/**
 * Provides localization management for loading and retrieving localized text.
 */
export class LocalizationManager {

	/**
	 * Maps language codes to their respective localization key-value pairs.
	 *
	 * Example:
	 * `"en"` -> `{ "trader_light_frigate_name": "Cobalt Light Frigate" }`
	 */
	private cache: Map<string, Map<string, string>> = new Map();

	/**
	 * A set of all unique keys found across all languages.
	 * Used to quickly check if a string is a localization key without iterating everything.
	 */
	private knownKeys: Set<string> = new Set();

	/**
	 * The maximum directory depth for the file searcher.
	 */
	private readonly searchMaxDepth = 5;


	/**
	 * Scans the workspace for `.localized_text` files and loads them.
	 */
	public async loadFromWorkspace(rootPath: string): Promise<void> {
		this.cache.clear();
		this.knownKeys.clear();

		const files: string[] = await this.findLocalizedTextFiles(rootPath);

		for (const file of files) {
			try {
				const fileName: string = path.basename(file); // "en.localized_text"
				const languageCode: string = fileName.split(".")[0]; // "en"

				const content: string = await fs.promises.readFile(file, "utf-8");
				const json: any = JSON.parse(content);

				let languageMap: Map<string, string> | undefined = this.cache.get(languageCode);
				if (!languageMap) {
					languageMap = new Map();
					this.cache.set(languageCode, languageMap);
				}

				for (const [key, value] of Object.entries(json)) {
					if (typeof value === "string") {
						languageMap.set(key, value);
						this.knownKeys.add(key);
					}
				}
				console.log(`Loaded ${languageMap.size} keys for language '${languageCode}'`);
			}
			catch (error) {
				console.error(`Failed to load localization file: ${file}`, error);
			}
		}
	}


	/**
	 * Recursive finder for `.localized_text` files.
	 *
	 * TODO: Implement `Promise.all` to scan subdirectories in parallel.
	 */
	private async findLocalizedTextFiles(directory: string, depth: number = 0): Promise<string[]> {
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
						const result: string[] = await this.findLocalizedTextFiles(fullPath, depth + 1);
						results = results.concat(result);
					}
				}
				else if (entry.name.endsWith(".localized_text")) {
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
	 * Checks if a string is a known localization key and returns a `Hover` object if so.
	 */
	public getHover(key: string): Hover | null {
		if (!this.knownKeys.has(key)) {
			return null;
		}

		const markdown: string[] = [];
		markdown.push(`**Localized Text**`);
		markdown.push(`| Language | Value |`);
		markdown.push(`| :--- | :--- |`);

		// Iterate over all loaded languages to show values or missing status.
		for (const [languageCode, languageMap] of this.cache.entries()) {
			const value: string | undefined = languageMap.get(key);
			if (value) {
				markdown.push(`| **${languageCode}** | ${value} |`);
			}
			else {
				markdown.push(`| ${languageCode} | ❗ *(missing)* |`);
			}
		}

		const hover: Hover = {
			contents: {
				kind: MarkupKind.Markdown,
				value: markdown.join("\n")
			}
		};

		return hover;
	}


}
