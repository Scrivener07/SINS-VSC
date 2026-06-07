import * as vscode from "vscode";
import { KeyedCollection } from "@soase/shared";
import { Path } from "../path";
import { ModInfo, MetaFile } from "./mod-meta";

/** Represents the kind of project, either a game or a mod. */
export enum ProjectKind {
    Game = "game",
    Mod = "mod"
}

/** Represents a project, either a game or a mod. */
export class Project {
    /** The directory of the project.
     * @remarks Serves as the raw value for the primary key of this object.
     * The true key is normalized via `ProjectCollection.toKey` when added to the collection.
     * This property retains the original path for display and reference purposes.
     */
    public readonly directory: vscode.Uri;

    /** The kind of project, either game or mod. */
    public readonly kind: ProjectKind;

    public readonly info: ModInfo;

    /** The dependencies of the project. */
    public dependencies: Project[];

    constructor(directory: vscode.Uri, kind: ProjectKind) {
        this.directory = directory;
        this.kind = kind;
        this.dependencies = [];
        this.info = {
            file: vscode.Uri.joinPath(this.directory, ".mod_meta_data"),
            meta: null
        };
    }

    public async refresh(): Promise<void> {
        if (this.kind === ProjectKind.Mod && this.info.file) {
            const meta = await MetaFile.read(this.info.file);
            this.info.meta = meta;
        }
    }
}

export class ProjectCollection extends KeyedCollection<string, Project> {
    protected getKeyForItem(item: Project): string {
        return Path.toKey(item.directory.fsPath);
    }

    public getByPath(value: string): Project | undefined {
        return this.get(Path.toKey(value));
    }

    public getGame(): Project | undefined {
        return this.toArray().find((value) => value.kind === ProjectKind.Game);
    }

    public getMods(): Project[] {
        return this.toArray().filter((value) => value.kind === ProjectKind.Mod);
    }
}
