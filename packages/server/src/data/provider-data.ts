import * as fs from "fs";
import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { IDataProvider, KeyType, ValueSetString } from "./types";

/**
 * Scans known file extensions and collects identifiers (filename without extension) into sets.
 * Each category key ("player", "weapon") maps to a `Set<string>` of identifiers.
 *
 * Also scans asset types (textures, brushes, meshes, fonts) that DataManager handles.
 */
export class DataProvider implements IDataProvider<Set<string>> {
    public identifier: string;
    public name: string;
    public priority: number;

    private readonly rootPath: string;
    private readonly language: string;
    private readonly cache = new Map<KeyType, ValueSetString>();
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, rootPath: string, language: string) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.rootPath = rootPath;
        this.language = language;
    }

    public async load(): Promise<void> {
        this.cache.clear();

        await Promise.all([
            this.loadLocalizations(),
            this.loadBrushes(),
            this.loadTextures(),
            this.loadPlayers(),
            this.loadUnitSkins(),
            this.loadUnitItems(),
            this.loadUnits(),
            this.loadMeshes(),
            this.loadWeapons(),
            this.loadMeshMaterials(),
            this.loadTtfFonts()
        ]);

        console.log(`DataProvider: Loaded ${this.cache.size} categories for '${this.identifier}'`);
    }

    private toFile(id: string): string {
        return path.basename(id).toLocaleLowerCase();
    }

    private toFileName(id: string): string {
        return path.basename(id, path.extname(id)).toLocaleLowerCase();
    }

    private async loadLocalizations(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, `${this.language}.localized_text`);

        if (filePaths.length === 0) {
            console.info(`DataProvider: No localization found for '${this.language}' in '${this.rootPath}'.`);
            return;
        }

        try {
            const text: string = await fs.promises.readFile(filePaths[0], "utf-8");
            const content: Record<string, unknown> = JSON.parse(text);
            const set = new Set<string>();
            for (const key of Object.keys(content)) {
                set.add(key);
            }
            this.cache.set("localized_text", { value: set, sourcePath: filePaths[0] });
        } catch (error) {
            console.error(`DataProvider: Failed to load localizations from '${this.rootPath}':`, error);
        }
    }

    private async loadBrushes(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".png");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFile(filePath));
            set.add(this.toFileName(filePath));
        }
        this.cache.set("brush", { value: set, sourcePath: this.rootPath });
    }

    private async loadTextures(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".dds");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFile(filePath));
            set.add(this.toFileName(filePath));
        }
        this.cache.set("texture", { value: set, sourcePath: this.rootPath });
    }

    private async loadPlayers(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".player");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("player", { value: set, sourcePath: this.rootPath });
    }

    private async loadUnitItems(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".unit_item");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("unit_item", { value: set, sourcePath: this.rootPath });
    }

    private async loadWeapons(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".weapon");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("weapon", { value: set, sourcePath: this.rootPath });
    }

    private async loadUnitSkins(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".unit_skin");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("unit_skin", { value: set, sourcePath: this.rootPath });
    }

    private async loadUnits(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".unit");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("unit", { value: set, sourcePath: this.rootPath });
    }

    private async loadMeshes(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".mesh");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("mesh", { value: set, sourcePath: this.rootPath });
    }

    private async loadMeshMaterials(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".mesh_material");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("mesh_material", { value: set, sourcePath: this.rootPath });
    }

    private async loadTtfFonts(): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".ttf");
        const set = new Set<string>();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.cache.set("ttf", { value: set, sourcePath: this.rootPath });
    }

    public has(key: KeyType): boolean {
        return this.cache.has(key);
    }

    public get(key: KeyType): Set<string> | undefined {
        return this.cache.get(key)?.value;
    }

    public getAll(): Iterable<[KeyType, ValueSetString]> {
        return this.cache.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter((listened) => listened !== listener);
        };
    }

    public notifyChanged(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}
