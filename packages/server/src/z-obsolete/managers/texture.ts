import * as path from "path";
import { FileSearch } from "../../files/search";

/**
 * @deprecated
 * Manages texture files within the workspace.
 */
export class TextureManager {
    /**
     * A cache mapping texture keys to their file paths.
     */
    private cache: Map<string, string> = new Map();

    public async loadFromWorkspace(rootPath: string): Promise<void> {
        this.cache.clear();

        const files: string[] = await FileSearch.findFiles(rootPath, ".png");
        for (const file of files) {
            try {
                const fileName: string = path.basename(file);
                const fileKey: string = fileName.split(".")[0];
                this.cache.set(fileKey, file);
            } catch (error) {
                console.error(`Failed to load texture file: ${file}`, error);
            }
        }

        console.log(`Loaded ${this.cache.size} texture keys for workspace '${rootPath}'`);
    }
}
