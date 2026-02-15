import * as path from "path";
import { WorkspaceSearch } from "../managers/workspace";
import { ValueString } from "./types";
import { ProviderBase } from "./provider";

export class TextureProvider extends ProviderBase<ValueString> {
    constructor(identifier: string, name: string, priority: number, rootPath: string) {
        super(identifier, name, priority, rootPath);
    }

    public async load(): Promise<void> {
        this.cache.clear();

        const files: string[] = await WorkspaceSearch.findFiles(this.rootPath, ".png");
        for (const file of files) {
            try {
                const fileName: string = path.basename(file);
                const fileKey: string = fileName.split(".")[0];
                this.cache.set(fileKey, { value: file, sourcePath: file });
            } catch (error) {
                console.error(`Failed to load texture file: ${file}`, error);
            }
        }

        console.log(`Loaded ${this.cache.size} texture keys for provider '${this.identifier}'`);
    }
}
