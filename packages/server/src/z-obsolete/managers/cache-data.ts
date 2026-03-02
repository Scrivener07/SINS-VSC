import * as fs from "fs";
import * as path from "path";
import { WorkspaceSearch } from "../../managers/workspace";
import { CacheStorage } from "./cache";
import { ManifestType } from "./cache-manifest";

/**
 * @deprecated
 */
export interface DataType extends ManifestType {
    texture: Set<string>;
    localized_text: Set<string>;
    brush: Set<string>;
    mesh: Set<string>;
    mesh_material: Set<string>;
    ttf: Set<string>;
}

/**
 * @deprecated
 * Stores a list of files for quick lookup.
 */
export class DataManager extends CacheStorage<DataType> {
    public async load(rootPath: string, language: string): Promise<void> {
        await Promise.all([
            this.loadLocalizations(rootPath, language),
            this.loadBrushes(rootPath),
            this.loadTextures(rootPath),
            this.loadPlayers(rootPath),
            this.loadUnitSkins(rootPath),
            this.loadUnitItems(rootPath),
            this.loadUnits(rootPath),
            this.loadMeshes(rootPath),
            this.loadWeapons(rootPath),
            this.loadMeshMaterials(rootPath),
            this.loadTtfFonts(rootPath)
        ]);
    }

    private toFile(id: string): string {
        return path.basename(id).toLocaleLowerCase();
    }

    private toFileName(id: string): string {
        return path.basename(id, path.extname(id)).toLocaleLowerCase();
    }

    private async loadLocalizations(rootPath: string, language: string): Promise<void> {
        const filePaths: string[] | undefined = await WorkspaceSearch.findFiles(rootPath, `${language}.localized_text`);

        if (filePaths && filePaths.length > 0) {
            const text: string = await fs.promises.readFile(filePaths[0], "utf-8");
            const content: string = JSON.parse(text);
            const set: Set<string> = new Set();
            for (const key of Object.keys(content)) {
                set.add(key);
            }
            this.set("localized_text", set);
        } else {
            console.info(`No localization found for '${language}' in '${rootPath}'.`);
            return;
        }
    }

    private async loadBrushes(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".png");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFile(filePath));
            set.add(this.toFileName(filePath));
        }
        this.set("brush", set);
    }

    /* this should load .dds only */
    private async loadTextures(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".dds");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFile(filePath));
            set.add(this.toFileName(filePath));
        }
        this.set("texture", set);
    }

    private async loadPlayers(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".player");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("player", set);
    }

    private async loadUnitItems(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".unit_item");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("unit_item", set);
    }

    private async loadWeapons(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".weapon");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("weapon", set);
    }

    private async loadUnitSkins(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".unit_skin");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("unit_skin", set);
    }

    private async loadUnits(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".unit");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("unit", set);
    }

    private async loadMeshes(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".mesh");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("mesh", set);
    }

    private async loadMeshMaterials(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".mesh_material");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("mesh_material", set);
    }

    private async loadTtfFonts(rootPath: string): Promise<void> {
        const filePaths: string[] = await WorkspaceSearch.findFiles(rootPath, ".ttf");
        const set: Set<string> = new Set();
        for (const filePath of filePaths) {
            set.add(this.toFileName(filePath));
        }
        this.set("ttf", set);
    }
}
