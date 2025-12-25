import * as fs from "fs";
import * as path from "path";
import { EntityManifestType } from "./manifest";
import { WorkspaceManager } from "./workspace";
import { UniformType } from "./uniform";

export interface CacheType extends EntityManifestType {
    texture: Set<string>;
    localized_text: Set<string>;
    brush: Set<string>;
    mesh: Set<string>;
    mesh_material: Set<string>;
    ttf: Set<string>;
}

export class CacheStorage<T extends CacheType | EntityManifestType | UniformType> {
    protected cache = new Map<keyof T, Set<string>>();

    public set<K extends keyof T>(cache: K, items: Set<string>) {
        this.cache.set(cache, new Set(items));
    }

    public get<K extends keyof T>(cache: K): Set<string> {
        if (!this.cache.has(cache)) {
            this.cache.set(cache, new Set<string>());
        }
        return this.cache.get(cache)!;
    }

    public size(): number {
        let size: number = 0;
        for (const cache of this.cache.values()) {
            size += cache.size;
        }
        return size;
    }

    public clear(): void {
        for (const cache of this.cache.values()) {
            cache.clear();
        }
    }
}

export class CacheManager extends CacheStorage<CacheType> {
    public async loadPlayers(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".player");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)).toLocaleLowerCase());
        }
        this.set("player", set);
    }

    public async loadBrushes(rootPath: string): Promise<void> {
        const brushes: string[] = await WorkspaceManager.findFiles(rootPath, ".png");
        const set: Set<string> = new Set();
        for (const brush of brushes) {
            set.add(path.basename(brush).toLocaleLowerCase());
            set.add(path.basename(brush, path.extname(brush)).toLocaleLowerCase());
        }
        this.set("brush", set);
    }

    public async loadUnitItems(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".unit_item");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)).toLocaleLowerCase());
        }
        this.set("unit_item", set);
    }

    public async loadWeapons(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".weapon");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)).toLocaleLowerCase());
        }
        this.set("weapon", set);
    }

    public async loadUnitSkins(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".unit_skin");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)).toLocaleLowerCase());
        }
        this.set("unit_skin", set);
    }

    public async loadUnits(rootPath: string): Promise<void> {
        const ids: string[] = await WorkspaceManager.findFiles(rootPath, ".unit");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)).toLocaleLowerCase());
        }
        this.set("unit", set);
    }

    /* this should load .dds only */
    public async loadTextures(rootPath: string): Promise<void> {
        const textures: string[] = await WorkspaceManager.findFiles(rootPath, ".dds");
        const set: Set<string> = new Set();
        for (const texture of textures) {
            set.add(path.basename(texture).toLocaleLowerCase());
            set.add(path.basename(texture, path.extname(texture)).toLocaleLowerCase());
        }
        this.set("texture", set);
    }

    public async loadMeshes(rootPath: string): Promise<void> {
        const meshes: string[] = await WorkspaceManager.findFiles(rootPath, ".mesh");
        const set: Set<string> = new Set();
        for (const mesh of meshes) {
            set.add(path.basename(mesh, path.extname(mesh)).toLocaleLowerCase());
        }
        this.set("mesh", set);
    }

    public async loadMeshMaterials(rootPath: string): Promise<void> {
        const materials: string[] = await WorkspaceManager.findFiles(rootPath, ".mesh_material");
        const set: Set<string> = new Set();
        for (const material of materials) {
            set.add(path.basename(material, path.extname(material)).toLocaleLowerCase());
        }
        this.set("mesh_material", set);
    }
    public async loadTtfFonts(rootPath: string): Promise<void> {
        const ttfs: string[] = await WorkspaceManager.findFiles(rootPath, ".ttf");
        const set: Set<string> = new Set();
        for (const ttf of ttfs) {
            set.add(path.basename(ttf, path.extname(ttf)).toLocaleLowerCase());
        }
        this.set("ttf", set);
    }

    public async loadLocalisations(rootPath: string, lang: string): Promise<void> {
        const localized_text: string[] | undefined = await WorkspaceManager.findFiles(rootPath, `${lang}.localized_text`);
        if (localized_text) {
            const content: string = JSON.parse(await fs.promises.readFile(localized_text[0], "utf-8"));
            const set: Set<string> = new Set();
            for (const k of Object.keys(content)) {
                set.add(k);
            }
            this.set("localized_text", set);
        }
    }

    public async loadCache(rootPath: string, lang: string): Promise<void> {
        await Promise.all([
            this.loadPlayers(rootPath),
            this.loadLocalisations(rootPath, lang),
            this.loadTextures(rootPath),
            this.loadBrushes(rootPath),
            this.loadUnitSkins(rootPath),
            this.loadUnitItems(rootPath),
            this.loadUnits(rootPath),
            this.loadMeshes(rootPath),
            this.loadWeapons(rootPath),
            this.loadMeshMaterials(rootPath),
            this.loadTtfFonts(rootPath)
        ]);
    }
}
