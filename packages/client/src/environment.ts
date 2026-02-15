import * as vscode from "vscode";
import { Configuration } from "./configuration";

/**
 * Provides utilities for detecting and retrieving the game installation directory.
 */
export class GameDirectory {
    /** A likely guess for the default game installation directory. */
    private static readonly DEFAULT: string = "C:/Program Files (x86)/Steam/steamapps/common/Sins2";

    /**
     * Retrieves the default game installation directory.
     * This is not checked for validity.
     * @returns The default game installation directory as a `vscode.Uri`.
     */
    private static default(): vscode.Uri {
        return vscode.Uri.file(GameDirectory.DEFAULT);
    }

    /**
     * A heuristic that determines if a directory is a valid game installation.
     * @returns A promise that resolves to a boolean indicating if the directory is a valid game installation.
     */
    public static async isValid(directory: vscode.Uri): Promise<boolean> {
        // Check for game executable or known game structure.
        const executableUri: vscode.Uri = vscode.Uri.joinPath(directory, "Sins2.exe");

        // If `fs.stat` throws then the directory is not valid.
        try {
            void (await vscode.workspace.fs.stat(executableUri));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Attempts to retrieve the game installation directory from the user configuration.
     * @returns A promise that resolves to a `vscode.Uri` of the game installation directory, or `undefined` if not found or invalid.
     */
    private static async fromConfiguration(): Promise<vscode.Uri | undefined> {
        const path: string | undefined = Configuration.getInstallation();
        if (path) {
            const uri: vscode.Uri = vscode.Uri.file(path);
            if (await GameDirectory.isValid(uri)) {
                return uri;
            }
        }
        return undefined;
    }

    /**
     * Attempts to find a valid game installation directory within the workspace folders.
     * @returns A promise that resolves to a `vscode.Uri` of the valid game installation directory, or `undefined` if none is found.
     */
    private static async fromWorkspace(): Promise<vscode.Uri | undefined> {
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                if (await GameDirectory.isValid(folder.uri)) {
                    return folder.uri;
                }
            }
        }
        return undefined;
    }

    /**
     * Retrieves the game installation directory.
     * @returns A promise that resolves to the game installation directory as a `vscode.Uri`.
     */
    public static async get(): Promise<vscode.Uri> {
        let directory: vscode.Uri | undefined = undefined;

        // Use the user-defined installation directory from configuration.
        directory = await GameDirectory.fromConfiguration();
        if (directory) {
            return directory;
        }

        // Fallback: Check each workspace folder.
        directory = await GameDirectory.fromWorkspace();
        if (directory) {
            return directory;
        }

        // Fallback: Use default installation directory. This is not checked for validity.
        return GameDirectory.default();
    }
}

export class ModificationDirectory {
    public static async isValid(folder: vscode.Uri): Promise<boolean> {
        return Detect_MetaFile.isValid(folder);
    }

    public static async fromWorkspace(): Promise<vscode.Uri[]> {
        const folders: vscode.Uri[] = [];
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                if (await Detect_MetaFile.isValid(folder.uri)) {
                    folders.push(folder.uri);
                }
            }
        }
        return folders;
    }
}

class Detect_MetaFile {
    private static readonly FILE_NAME: string = ".mod_meta_data";

    public static async isValid(folder: vscode.Uri): Promise<boolean> {
        try {
            const file: vscode.Uri = vscode.Uri.joinPath(folder, Detect_MetaFile.FILE_NAME);
            void (await vscode.workspace.fs.stat(file));
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * @deprecated This is unused for now, but may be useful in the future for project directories that may lack a `.mod_meta_data` file.
 */
class Detect_Extensions {
    // Just a small sample of known file extensions.
    private static readonly FILE_EXTENSIONS = [".mod_meta_data", ".entity_manifest", ".player", ".unit", ".weapon", ".ability", ".buff"];

    /**
     * A heuristic to scan top-level directory for known game file extensions.
     * @param folder The workspace folder to scan.
     * @returns A promise that resolves when the detection is complete.
     */
    public static async isValid(folder: vscode.Uri): Promise<boolean> {
        try {
            const entries: [string, vscode.FileType][] = await vscode.workspace.fs.readDirectory(folder);
            const hasMatch: boolean = entries.some(([name, fileType]) =>
                Detect_Extensions.FILE_EXTENSIONS.some((extension) => name.endsWith(extension))
            );
            return hasMatch;
        } catch {
            return false;
        }
    }
}
