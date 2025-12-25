import * as vscode from "vscode";
import { ResearchPanel } from "./panel";

/**
 * The command to open the research visualizer in a webview panel.
 */
export class ResearchOpenCommand {
    /**
     * The command identifier for opening the research visualizer.
     * Ensure this matches the command defined in `package.json`.
     */
    private static readonly IDENTIFIER: string = "soase.research.visualizer.open";

    /**
     * Registers the research visualizer open command.
     * @param context The extension context.
     * @returns A disposable for the registered command.
     */
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.commands.registerCommand(ResearchOpenCommand.IDENTIFIER, () => ResearchOpenCommand.execute(context));
    }

    /**
     * A handler that executes the research visualizer open command.
     * @param context The extension context.
     */
    private static execute(context: vscode.ExtensionContext): void {
        ResearchPanel.show(context);
    }
}
