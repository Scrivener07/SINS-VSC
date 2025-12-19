import * as fs from "fs";
import * as path from "path";
import { WorkspaceManager } from "./workspace";
import { EntityManifest } from "./manifest";
import { IndexManager } from "./data-manager";

export interface CacheType extends EntityManifest {
    texture: Set<string>;
    localized_text: Set<string>;
    brush: Set<string>;
    mesh: Set<string>;
}

interface CacheManagerI {
	loadBrushes(rootPath: string): Promise<void>;
	loadUnitItems(rootPath: string): Promise<void>;
	loadUnitSkins(rootPath: string): Promise<void>;
	loadUnits(rootPath: string): Promise<void>;
	loadTextures(rootPath: string): Promise<void>;
	loadMeshes(rootPath: string): Promise<void>;
	loadLocalisations(rootPath: string, lang: string): Promise<void>;
	loadCache(rootPath: string, lang: string): Promise<void>;
}

export class CacheManager implements CacheManagerI  {
    protected cache: Map<keyof CacheType, Set<string>> = new Map();

    public get(cache: keyof CacheType): Set<string> {
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

    public set(cache: keyof CacheType, items: Set<string>): void {
        if (!this.cache.has(cache)) {
            this.cache.set(cache, new Set<string>());
        }
        this.cache.get(cache)?.clear();
        for (const item of items) {
            this.cache.get(cache)?.add(item);
        }
    }

    public clear(): void {
        for (const cache of this.cache.values()) {
            cache.clear();
        }
    }

    /* -------------------------------------------------------- */

    public async loadBrushes(rootPath: string): Promise<void> {
        const brushes: string[] = await WorkspaceManager.findFiles(rootPath, ".png");
        const set: Set<string> = new Set();
        for (const brush of brushes) {
            set.add(path.basename(brush));
            set.add(path.basename(brush, path.extname(brush)));
        }
        this.set("brush", set);
    }

    public async loadUnitItems(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".unit_item");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)));
        }
        this.set("unit_item", set);
    }

    public async loadUnitSkins(rootPath: string): Promise<void> {
        const ids: any = await WorkspaceManager.findFiles(rootPath, ".unit_skin");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)));
        }
        this.set("unit_skin", set);
    }

    public async loadUnits(rootPath: string): Promise<void> {
        const ids: string[] = await WorkspaceManager.findFiles(rootPath, ".unit");
        const set: Set<string> = new Set();
        for (const id of ids) {
            set.add(path.basename(id, path.extname(id)));
        }
        this.set("unit", set);
    }

    /* this should load .dds only */
    public async loadTextures(rootPath: string): Promise<void> {
        const textures: string[] = await WorkspaceManager.findFiles(rootPath, ".dds");
        const set: Set<string> = new Set();
        for (const texture of textures) {
            set.add(path.basename(texture));
            set.add(path.basename(texture, path.extname(texture)));
        }
        this.set("texture", set);
    }

    public async loadMeshes(rootPath: string): Promise<void> {
        const meshes: string[] = await WorkspaceManager.findFiles(rootPath, ".mesh");
        const set: Set<string> = new Set();
        for (const mesh of meshes) {
            set.add(path.basename(mesh, path.extname(mesh)));
        }
        this.set("mesh", set);
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
            this.loadLocalisations(rootPath, lang),
            this.loadTextures(rootPath),
            this.loadBrushes(rootPath),
            this.loadUnitSkins(rootPath),
            this.loadUnitItems(rootPath),
            this.loadUnits(rootPath),
            this.loadMeshes(rootPath),
        ]);
    }
}
