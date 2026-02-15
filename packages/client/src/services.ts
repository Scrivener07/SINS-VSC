import * as vscode from "vscode";
import { ClientManager } from "./client";

export class Services {
    public static readonly sins: ClientManager = new ClientManager();

    public static async activate(context: vscode.ExtensionContext): Promise<void> {
        await Services.sins.activate(context);
        context.subscriptions.push(Services.sins);
    }

    public static async deactivate(): Promise<void> {
        await Services.sins?.deactivate();
    }
}
