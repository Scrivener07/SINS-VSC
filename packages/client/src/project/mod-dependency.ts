import * as vscode from "vscode";
import * as path from "path";

// Example `.mod_dependency` file content:
/*
{
	"dependencies": [
		"C:\\Users\\Public\\mod.io\\5762\\mods\\4527333"
	]
}
*/

/**
 * Represents the shape of the optional JSON file that can be placed in a mod directory to specify dependencies.
 * NOTE: Possibly consolidate with `IDataSourceSettings`.
 */
type DependencyFileShape = string[] | { dependencies?: string[] };

// For the Client
export class ModDependencyFile {
    public static readonly FILE_NAME = ".mod_dependency";

    /**
     * Attempts to read a `.mod_dependency` file from the specified mod directory to retrieve dependencies.
     * @param modDirectory The file path to the mod directory to check for a `.mod_dependency` file.
     * @returns An array of dependency paths if the file is found and valid, or `null` if the file does not exist or is invalid.
     */
    public static async read(modDirectory: string): Promise<string[] | null> {
        const filePath: string = path.join(modDirectory, ModDependencyFile.FILE_NAME);

        try {
            const uri: vscode.Uri = vscode.Uri.file(filePath);
            const bytes: Uint8Array = await vscode.workspace.fs.readFile(uri);
            const text: string = Buffer.from(bytes).toString("utf8").trim();

            if (text.length === 0) {
                return [];
            }

            const parsed: DependencyFileShape = JSON.parse(text);

            if (Array.isArray(parsed)) {
                return parsed.filter((value) => typeof value === "string");
            }

            if (parsed && Array.isArray(parsed.dependencies)) {
                return parsed.dependencies.filter((value) => typeof value === "string");
            }

            return [];
        } catch {
            return null;
        }
    }
}
