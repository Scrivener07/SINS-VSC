import * as vscode from "vscode";
import { TextDocument, WorkspaceConfiguration, WorkspaceFoldersChangeEvent } from "vscode";
import * as shared from "@soase/shared";

/*
Known URI Schemes
- file
- vscode-scm
- vscode-userdata
- output
*/

class MyWorkspace {
    constructor() {
        console.info(`Workspace file: ${MyWorkspace.uriToString(vscode.workspace.workspaceFile)}`);
        vscode.workspace.onDidChangeWorkspaceFolders((event) => this.onDidChangeWorkspaceFolders(event));

        // Listen for workspace file opens and handle any already opened files.
        vscode.workspace.onDidOpenTextDocument((document) => this.didOpenTextDocument(document));
        vscode.workspace.textDocuments.forEach((document) => this.didOpenTextDocument(document));
    }

    private onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent) {
        const added = event.added.map((folder) => MyWorkspace.uriToString(folder.uri)).join(", ");
        const removed = event.removed.map((folder) => MyWorkspace.uriToString(folder.uri)).join(", ");
        console.info(`Workspace folders changed. Added: ${added}, Removed: ${removed}`);
    }

    private async didOpenTextDocument(document: TextDocument): Promise<void> {
        console.info(`Document opened: ${MyWorkspace.uriToString(document.uri)}`);
    }

    private static uriToString(uri: vscode.Uri | undefined): string {
        if (!uri) {
            return "undefined";
        }
        const values: string[] = [
            `URI: ${uri.toString()}`,
            `   - Scheme: ${uri.scheme}`,
            `   - Path: ${uri.path}`,
            `   - Authority: ${uri.authority}`,
            `   - Fragment: ${uri.fragment}`,
            `   - Query: ${uri.query}`,
            `   - fs.path: ${uri.fsPath}`,
            `   - vsc.workspace: ${vscode.workspace.getWorkspaceFolder(uri)?.uri.toString() || "undefined"}`
        ];
        return values.join("\n");
    }
}

class MyConfiguration {
    constructor() {
        vscode.workspace.onDidChangeConfiguration((event) => this.onDidChangeConfiguration(event));
    }

    private async onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): Promise<void> {
        if (!event.affectsConfiguration(shared.NAME)) {
            return;
        }

        const configurations = vscode.workspace.getConfiguration(shared.NAME);
        const keys = Object.keys(configurations);

        console.info(`${shared.NAME} has ${keys.length} Configuration Changed ===`);
        for (const key of keys) {
            // Skip internal properties and methods.
            if (key.startsWith("_") || typeof (configurations as any)[key] === "function") {
                continue;
            }

            // Check if this specific configuration key was affected.
            if (!event.affectsConfiguration(`${shared.NAME}.${key}`)) {
                continue;
            }

            ConfigurationDebug.print(configurations, key);
        }
    }
}

export class ConfigurationDebug {
    public static printAll(): void {
        const configurations = vscode.workspace.getConfiguration(shared.NAME);
        const keys = Object.keys(configurations);

        console.info(`${shared.NAME} Configurations`);
        for (const key of keys) {
            // Skip internal properties and methods.
            if (key.startsWith("_") || typeof (configurations as any)[key] === "function") {
                continue;
            }

            ConfigurationDebug.print(configurations, key);
        }
    }

    public static print(configurations: WorkspaceConfiguration, key: string): void {
        const inspection = configurations.inspect(key);
        if (inspection) {
            console.info(`\nConfiguration: ${inspection.key}`);
            console.info(`  Value: ${JSON.stringify(configurations.get(key))}`);
            console.info(`  Default: ${JSON.stringify(inspection.defaultValue)}`);
            console.info(`  Folder: ${JSON.stringify(inspection.workspaceFolderValue)}`);
            console.info(`  Workspace: ${JSON.stringify(inspection.workspaceValue)}`);
            console.info(`  Global: ${JSON.stringify(inspection.globalValue)}`);
        }
    }
}
