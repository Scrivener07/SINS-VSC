import * as vscode from "vscode";
import { GameDirectory, ModificationDirectory } from "../environment";
import { ExtensionContext } from "vscode";
import { ProjectContext, Project } from "../project";

export class ProjectTreeManager implements vscode.Disposable {
    private static readonly NAME: string = "soase.contentTree";

    private context: ProjectContext;
    private disposables: vscode.Disposable[];

    public constructor(context: ProjectContext) {
        this.context = context;
        this.disposables = [];
    }

    public async activate(_context: ExtensionContext) {
        const treeProvider = new ProjectTreeProvider(this.context);
        this.disposables.push(treeProvider);
        this.disposables.push(vscode.window.createTreeView(ProjectTreeManager.NAME, { treeDataProvider: treeProvider }));
    }

    // @vscode.Disposable
    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}

type TreeNodeType = "game" | "mod" | "dependencies" | "dependency" | "empty";
type TreeNodeStatus = "valid" | "invalid";

class ProjectTreeItem extends vscode.TreeItem {
    /** The directory path associated with the tree node. */
    public readonly path: string;

    /** The type of the tree node.
     * @remarks Essentially the same as the `contextValue`, but strongly typed.
     */
    public readonly type: TreeNodeType;

    /** The validation status of the tree node's path. */
    public readonly status: TreeNodeStatus;

    constructor(label: string, path: string, type: TreeNodeType, status: TreeNodeStatus, collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.path = path;
        this.type = type;
        this.status = status;

        this.contextValue = type;
        this.description = ProjectTreeItem.toDescription(status);
        this.tooltip = ProjectTreeItem.toTooltip(label, path, type, status);
        this.iconPath = ProjectTreeItem.toIcon(type, status);
    }

    private static toDescription(status: TreeNodeStatus): string | undefined {
        if (status === "invalid") {
            return "Invalid path";
        }

        return undefined;
    }

    private static toTooltip(label: string, path: string, type: TreeNodeType, status: TreeNodeStatus): string {
        let description: string = label;
        if (type === "mod" || type === "game") {
            description += `\n${path}`;
        }
        if (status === "invalid") {
            description += "\n⚠ Path is invalid or missing.";
        }
        return description;
    }

    private static toIcon(type: TreeNodeType, status: TreeNodeStatus): vscode.ThemeIcon {
        if (status === "invalid") {
            return new vscode.ThemeIcon("warning", new vscode.ThemeColor("problemsErrorIcon.foreground"));
        } else if (type === "dependencies" || type === "dependency") {
            return new vscode.ThemeIcon("references");
        } else if (type === "empty") {
            return new vscode.ThemeIcon("info");
        } else {
            return new vscode.ThemeIcon("folder");
        }
    }
}

export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem>, vscode.Disposable {
    private readonly emitter: vscode.EventEmitter<void | ProjectTreeItem | undefined>;
    public readonly onDidChangeTreeData: vscode.Event<void | ProjectTreeItem | undefined>;

    private readonly disposables: vscode.Disposable[];

    private readonly context: ProjectContext;

    constructor(context: ProjectContext) {
        this.context = context;
        this.emitter = new vscode.EventEmitter<ProjectTreeItem | undefined | void>();
        this.onDidChangeTreeData = this.emitter.event;
        this.disposables = [];
        this.disposables.push(this.context.onDidChange(this.onProjectsChanged.bind(this)));
    }

    //#region Disposable

    public dispose(): void {
        this.emitter.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables.length = 0;
    }

    //#endregion

    //#region Changes

    private onProjectsChanged(): void {
        this.refresh();
    }

    public refresh(): void {
        this.emitter.fire();
    }

    //#endregion

    //#region Tree-Provider

    public getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
        return element;
    }

    public async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
        // Add root nodes for the game and each mod found in the workspace.
        if (!element) {
            return await this.nodeRoot();
        }

        // Add dependencies container node for each mod and the game.
        if (element.type === "game" || element.type === "mod") {
            return await this.nodeDependency(element);
        }

        // Add dependency nodes for the dependencies container.
        if (element.type === "dependencies") {
            return await this.nodeDependencies(element);
        }

        return [];
    }

    //#endregion

    //#region Tree-Nodes

    private async nodeRoot(): Promise<ProjectTreeItem[]> {
        const items: ProjectTreeItem[] = [];

        // Create root game node.
        {
            const game: Project | undefined = this.context.getGame();
            if (game) {
                const valid: boolean = await GameDirectory.isValid(game?.directory);
                const item: ProjectTreeItem = new ProjectTreeItem(
                    `Game: Sins of a Solar Empire 2`,
                    game?.directory.fsPath,
                    "game",
                    ProjectTreeProvider.toStatus(valid),
                    vscode.TreeItemCollapsibleState.Collapsed
                );
                items.push(item);
            }
        }

        // Create root mod nodes.
        {
            const mods: Project[] = this.context.getMods();
            for (const mod of mods) {
                const valid: boolean = await ModificationDirectory.isValid(mod.directory);
                const item = new ProjectTreeItem(
                    `Mod: ${mod.info.meta?.display_name ?? mod.directory.fsPath}`,
                    mod.directory.fsPath,
                    "mod",
                    ProjectTreeProvider.toStatus(valid),
                    vscode.TreeItemCollapsibleState.Collapsed
                );
                items.push(item);
            }
        }

        // Concatenate game and mod nodes, with the game node first.
        return items;
    }

    private async nodeDependency(element: ProjectTreeItem): Promise<ProjectTreeItem[]> {
        return [new ProjectTreeItem("Dependencies", element.path, "dependencies", "valid", vscode.TreeItemCollapsibleState.Collapsed)];
    }

    private async nodeDependencies(element: ProjectTreeItem): Promise<ProjectTreeItem[]> {
        const project: Project | undefined = this.context.get(element.path);
        if (project) {
            if (!project.dependencies || project.dependencies.length === 0) {
                return [new ProjectTreeItem("No dependencies...", element.path, "empty", "valid", vscode.TreeItemCollapsibleState.None)];
            }

            return Promise.all(
                project.dependencies.map(async (dependency) => {
                    const valid: boolean = await this.pathExists(dependency.directory.fsPath);
                    return new ProjectTreeItem(
                        dependency.directory.fsPath,
                        dependency.directory.fsPath,
                        "dependency",
                        ProjectTreeProvider.toStatus(valid),
                        vscode.TreeItemCollapsibleState.None
                    );
                })
            );
        }

        return [];
    }

    //#endregion

    //#region Validation

    private static toStatus(valid: boolean): TreeNodeStatus {
        if (valid) {
            return "valid";
        } else {
            return "invalid";
        }
    }

    private async pathExists(path: string): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(path));
            return true;
        } catch {
            return false;
        }
    }

    //#endregion
}
