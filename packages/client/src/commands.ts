import * as vscode from "vscode";

// The command has been defined in the `package.json` file.
// Now provide the implementation of the command with `registerCommand`.
// The `commandId` parameter must match the command field in `package.json`.
export class HelloCommand {
    private static readonly NAME: string = "soase.helloWorld";

    /**
     * Registers a VS Code command handler.
     * @returns A disposable instance of the command registration.
     */
    public static register(): vscode.Disposable {
        return vscode.commands.registerCommand(this.NAME, this.execute);
    }

    /**
     * The code you place here will be executed every time your command is executed.
     */
    private static execute() {
        // Display a message box to the user
        vscode.window.showInformationMessage("Hello World from Sins of a Solar Empire!");
    }
}

export class RevealFolderCommand {
    private static readonly NAME: string = "soase.contentTree.revealFolder";

    /**
     * Registers a VS Code command handler.
     * @returns A disposable instance of the command registration.
     */
    public static register(): vscode.Disposable {
        return vscode.commands.registerCommand(this.NAME, RevealFolderCommand.execute);
    }

    /**
     * Reveals a folder in the system file explorer.
     * @param argument The command argument, which can be a string path, a `vscode.Uri`, or an object with a `path` property.
     * If the path is valid, it will be revealed in the OS file explorer. Otherwise, a warning message will be shown.
     * @returns A promise that resolves when the operation is complete.
     * @remarks This command is used by the content tree view to allow users to quickly open folders in their system file explorer.
     */
    private static async execute(argument?: unknown): Promise<void> {
        let targetPath: string | undefined;
        if (typeof argument === "string") {
            targetPath = argument;
        } else if (argument instanceof vscode.Uri) {
            targetPath = argument.fsPath;
        } else if (argument && typeof argument === "object" && "path" in argument && typeof (argument as { path: unknown }).path === "string") {
            targetPath = (argument as { path: string }).path;
        }

        if (!targetPath) {
            void vscode.window.showWarningMessage("No folder path was provided.");
            return;
        }

        const uri: vscode.Uri = vscode.Uri.file(targetPath);
        try {
            await vscode.workspace.fs.stat(uri);
            await vscode.commands.executeCommand("revealFileInOS", uri);
        } catch {
            void vscode.window.showWarningMessage(`Path does not exist: ${targetPath}`);
        }
    }
}
