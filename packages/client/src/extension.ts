import * as vscode from "vscode";
import { HelloCommand } from "./commands";
import { ClientManager } from "./client";

/**
 * An entry point for this extension.
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 * @param context The VS Code extension context.
 */
export function activate(context: vscode.ExtensionContext) {
    console.log("The extension has been activated.");
    context.subscriptions.push(HelloCommand.register());
    ClientManager.activate(context);
}

/**
 * This method is called when the extension is deactivated.
 */
export function deactivate(): Thenable<void> {
    console.log("The extension has been deactivated.");
    return ClientManager.deactivate();
}
