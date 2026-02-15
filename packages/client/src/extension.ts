import * as vscode from "vscode";
import { Services } from "./services";
import { HelloCommand } from "./commands";
import { ResearchOpenCommand } from "./research";

/**
 * An entry point for this extension.
 * This method is called when the extension is activated.
 * The extension is activated the very first time a command is executed.
 * @param context The VS Code extension context.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log("The extension has been activated.");
    await Services.activate(context);
    context.subscriptions.push(HelloCommand.register());
    context.subscriptions.push(ResearchOpenCommand.register(context));
}

/**
 * This method is called when the extension is deactivated.
 */
export async function deactivate(): Promise<void> {
    console.log("The extension has been deactivated.");
    await Services.deactivate();
}
