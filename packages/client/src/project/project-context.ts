import * as vscode from "vscode";
import { WorkspaceFoldersChangeEvent } from "vscode";
import * as path from "path";
import * as shared from "@soase/shared";
import { Path } from "../path";
import { GameDirectory, ModificationDirectory } from "../environment";
import { Project, ProjectCollection, ProjectKind, ModDependencyFile } from ".";
import { Configuration, DataSourceSettings } from "../configuration";

export class ProjectContext implements vscode.Disposable {
    private readonly projects: ProjectCollection;

    private readonly disposables: vscode.Disposable[];
    private readonly changed: vscode.EventEmitter<void>;

    private metaFileWatchers: vscode.FileSystemWatcher[];
    private dependencyFileWatchers: vscode.FileSystemWatcher[];

    public readonly onDidChange: vscode.Event<void>;

    constructor() {
        this.projects = new ProjectCollection();
        this.changed = new vscode.EventEmitter<void>();
        this.disposables = [];
        this.dependencyFileWatchers = [];
        this.metaFileWatchers = [];
        this.onDidChange = this.changed.event;
    }

    //#region Disposable

    public dispose(): void {
        this.changed.dispose();

        for (const watcher of this.metaFileWatchers) {
            watcher.dispose();
        }
        this.metaFileWatchers = [];

        for (const watcher of this.dependencyFileWatchers) {
            watcher.dispose();
        }
        this.dependencyFileWatchers = [];

        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    //#endregion

    //#region Extension

    public async activate(): Promise<void> {
        this.disposables.push(
            vscode.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders.bind(this)),
            vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this))
        );

        await this.refresh();
    }

    //#endregion

    //#region VSC - Changes

    private onDidChangeWorkspaceFolders(event: WorkspaceFoldersChangeEvent): void {
        void this.refresh();
    }

    private onDidChangeConfiguration(event: vscode.ConfigurationChangeEvent): void {
        if (
            event.affectsConfiguration(shared.NAME + "." + shared.PROPERTIES.installation) ||
            event.affectsConfiguration(shared.NAME + "." + shared.PROPERTIES.dataSources)
        ) {
            void this.refresh();
        }
    }

    private onWatcherChanged(uri: vscode.Uri): void {
        void this.refresh();
    }

    //#endregion

    //#region Changes

    public async refresh(): Promise<void> {
        const next = new ProjectCollection();

        // Determine the game directory.
        const gameDirectory: vscode.Uri = await GameDirectory.get();
        {
            const project: Project = new Project(gameDirectory, ProjectKind.Game);
            await project.refresh();
            next.add(project);
        }

        // Determine the modification directories.
        const modDirectories: vscode.Uri[] = await ModificationDirectory.fromWorkspace();
        {
            // Create mod projects.
            for (const modDirectory of modDirectories) {
                const project: Project = new Project(modDirectory, ProjectKind.Mod);
                await project.refresh();
                next.add(project);
            }
        }

        // Assign dependencies to allocated mod projects.
        {
            const modPaths: string[] = modDirectories.map(function (value) {
                return value.fsPath;
            });

            const dependenciesByMod: Record<string, string[]> = {};
            for (const modDirectory of modDirectories) {
                dependenciesByMod[modDirectory.fsPath] = await DependencyResolver.getDependenciesFor(modDirectory.fsPath);
            }

            for (const modPath of modPaths) {
                const modProject: Project | undefined = next.getByPath(modPath);
                if (!modProject) {
                    continue;
                }

                const dependencyPaths: string[] = dependenciesByMod[modPath] ?? [];
                for (const dependencyPath of dependencyPaths) {
                    const dependencyProject: Project | undefined = next.getByPath(dependencyPath);
                    if (dependencyProject) {
                        modProject.dependencies.push(dependencyProject);
                    }
                }
            }
        }

        // Replace collection contents
        {
            for (const project of this.projects.toArray()) {
                this.projects.remove(project);
            }
            for (const project of next.toArray()) {
                this.projects.add(project);
            }
        }

        this.dependencyFileWatchers = this.rebuildDependencyWatchers(modDirectories);
        this.metaFileWatchers = this.rebuildMetaWatchers(modDirectories);
        this.changed.fire();
    }

    private rebuildMetaWatchers(modDirectories: vscode.Uri[]): vscode.FileSystemWatcher[] {
        for (const watcher of this.metaFileWatchers) {
            watcher.dispose();
        }

        const watchers: vscode.FileSystemWatcher[] = [];
        const metaFileName = ".mod_meta_data";

        for (const modDirectory of modDirectories) {
            const relativePattern = new vscode.RelativePattern(modDirectory, metaFileName);
            const watcher = vscode.workspace.createFileSystemWatcher(relativePattern);

            watcher.onDidCreate((uri) => this.onMetaFileChanged(uri));
            watcher.onDidChange((uri) => this.onMetaFileChanged(uri));
            watcher.onDidDelete((uri) => this.onMetaFileChanged(uri));

            watchers.push(watcher);
        }

        return watchers;
    }

    private async onMetaFileChanged(uri: vscode.Uri): Promise<void> {
        const projectPath: string = path.dirname(uri.fsPath);
        const project: Project | undefined = this.projects.getByPath(projectPath);
        if (!project) {
            // ignore
            return;
        }

        try {
            await project.refresh();
            this.changed.fire();
        } catch {
            // swallow errors - keep model stable
            this.changed.fire();
        }
    }

    private rebuildDependencyWatchers(modDirectories: vscode.Uri[]): vscode.FileSystemWatcher[] {
        for (const watcher of this.dependencyFileWatchers) {
            watcher.dispose();
        }

        const watchers: vscode.FileSystemWatcher[] = [];
        for (const modDirectory of modDirectories) {
            const relativePattern: vscode.RelativePattern = new vscode.RelativePattern(modDirectory, ModDependencyFile.FILE_NAME);
            const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(relativePattern);
            watcher.onDidCreate(this.onWatcherChanged.bind(this));
            watcher.onDidChange(this.onWatcherChanged.bind(this));
            watcher.onDidDelete(this.onWatcherChanged.bind(this));
            watchers.push(watcher);
        }

        return watchers;
    }

    //#endregion

    //#region Projects

    public add(project: Project): void {
        this.projects.add(project);
    }

    public remove(project: Project): void {
        this.projects.remove(project);
    }

    public get(path: string): Project | undefined {
        return this.projects.getByPath(path);
    }

    public values(): Project[] {
        return this.projects.toArray();
    }

    public getGame(): Project | undefined {
        return this.projects.getGame();
    }

    public getMods(): Project[] {
        return this.projects.getMods();
    }

    //#endregion
}

/*
- read declared dependencies from file (if exists) or configuration
- - detect origin of declared dependencies (file vs workspace/folder/user) and store in the object model
- normalize and deduplicate declared dependencies
- append implicit game dependency if not already declared and not self

---

- filter out any declared dependencies that don't match known project paths (mod or game directories)
- - Note, we may want to optionally include unknown dependencies in the result for informational purposes, even though they won't be resolved to projects.
    This would allow us to show them in the UI and potentially warn the user that they are declared but not found.
    For these reasons I think all declared dependencies should be included in the result.
    A seperate function can be provided to filter to just the known dependencies if needed.
    Or the object model can store some data alongside each dependency indicating it's validation status.
*/
class DependencyResolver {
    /**
     * Retrieves the resolved dependencies for a given mod directory.
     * @param modDirectory The file path to the mod directory for which to retrieve dependencies.
     * @returns A promise that resolves to an array of dependency paths. If no dependencies are found, an empty array is returned.
     */
    public static async getDependenciesFor(modDirectory: string): Promise<string[]> {
        // First check for file based dependencies.
        {
            const dependencies: string[] | null = await ModDependencyFile.read(modDirectory);
            if (dependencies) {
                return dependencies;
            }
        }

        // Fall back to configuration if no file-based dependencies are found.
        {
            const settingKey: string = Path.toKey(modDirectory);
            const setting: DataSourceSettings = Configuration.getDataSources();
            for (const [key, value] of Object.entries(setting)) {
                if (Path.toKey(key) === settingKey) {
                    return value.dependencies ?? [];
                }
            }
        }

        // No dependencies found.
        return [];
    }
}
