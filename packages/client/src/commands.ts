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
