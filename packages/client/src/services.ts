import * as vscode from "vscode";
import { ClientManager } from "./client";
import { ProjectTreeManager } from "./views/project-tree";
import { ProjectContext } from "./project";

export class Services {
    private static readonly projects: ProjectContext = new ProjectContext();
    public static readonly sins: ClientManager = new ClientManager(Services.projects);
    private static readonly projectTree: ProjectTreeManager = new ProjectTreeManager(Services.projects);

    public static async activate(context: vscode.ExtensionContext): Promise<void> {
        await Services.projects.activate();
        await Services.sins.activate(context);
        await Services.projectTree.activate(context);
        context.subscriptions.push(Services.sins, Services.projectTree, Services.projects);
    }

    public static async deactivate(): Promise<void> {
        await Services.sins?.deactivate();
        // await Services.projectTree?.deactivate();
        // await Services.projects?.deactivate();
    }
}
