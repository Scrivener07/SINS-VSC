import * as vscode from "vscode";
import { workspace as Workspace } from "vscode";
import { Configuration } from "./configuration";

/**
 * Provides utilities for detecting and retrieving the game installation directory.
 */
export class GameInstallation {
    /** A likely guess for the default game installation directory. */
    private static readonly DEFAULT: string = "C:/Program Files (x86)/Steam/steamapps/common/Sins2";

    /**
     * Retrieves the default game installation directory.
     * This is not checked for validity.
     * @returns The default game installation directory as a `vscode.Uri`.
     */
    private static default(): vscode.Uri {
        return vscode.Uri.file(GameInstallation.DEFAULT);
    }

    /**
     * A heuristic that determines if a directory is a valid game installation.
     * @returns A promise that resolves to a boolean indicating if the directory is a valid game installation.
     */
    private static async isValid(directory: vscode.Uri): Promise<boolean> {
        // Check for game executable or known game structure.
        const exePath = vscode.Uri.joinPath(directory, "Sins2.exe");
        const dataPath = vscode.Uri.joinPath(directory, "Data");

        // If `fs.stat` throws then the directory is not valid.
        try {
            void (await vscode.workspace.fs.stat(exePath));
            void (await vscode.workspace.fs.stat(dataPath));
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
            if (await GameInstallation.isValid(uri)) {
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
        if (Workspace.workspaceFolders) {
            for (const folder of Workspace.workspaceFolders) {
                if (await GameInstallation.isValid(folder.uri)) {
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
        directory = await GameInstallation.fromConfiguration();
        if (directory) {
            return directory;
        }

        // Fallback: Check each workspace folder.
        directory = await GameInstallation.fromWorkspace();
        if (directory) {
            return directory;
        }

        // Fallback: Use default installation directory. This is not checked for validity.
        return GameInstallation.default();
    }
}
