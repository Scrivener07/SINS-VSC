import * as fs from "fs";
import { Hover, MarkupKind } from "vscode-json-languageservice";
import { IndexerService, LocalizationService, TextureService } from "../data/service-game";
import { pathToFileURL } from "url";

export class HoverProvider {
    private indexManager: IndexerService;
    private localization: LocalizationService;
    private textureService: TextureService;

    constructor(indexManager: IndexerService, localizationManager: LocalizationService, texture: TextureService) {
        this.indexManager = indexManager;
        this.localization = localizationManager;
        this.textureService = texture;
    }

    public async getWeapon(key: string, language: string = "en"): Promise<Hover | null> {
        const paths = this.indexManager.index.get(key)?.value;
        const markdown: string[] = [];
        if (paths) {
            const file: string = await fs.promises.readFile(paths[0], "utf-8");
            const contents = JSON.parse(file);
            if (paths.some((e) => e.endsWith(".weapon"))) {
                markdown.push(`**${this.localization.get(language)?.get(contents.name)}**`);
                markdown.push("\n");
                markdown.push("------------");
                markdown.push("\n");
                markdown.push(`| Damage | Range | Cooldown | Tags`);
                markdown.push(`| :---- | :---- | :---- | :----`);
                markdown.push(`| ${contents?.damage} | ${contents?.range} | ${contents?.cooldown_duration} | ${contents.tags?.join(", ")}`);
            }
        }

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: markdown.join("\n")
            }
        };
    }

    public async getWeaponTag(key: string, language: string = "en"): Promise<Hover | null> {
        const paths: string | undefined = this.indexManager.index.get("weapon")?.value.find((found) => found.endsWith(".uniforms"));
        const markdown: string[] = [];
        if (paths) {
            const contents = JSON.parse(await fs.promises.readFile(paths, "utf-8"));
            const local_key = contents?.weapon_tags.find((found: any) => found?.name === key)?.localized_name;
            const local_text: string | undefined = this.localization.get(language)?.get(local_key)?.value;

            markdown.push(`**Tag**`);
            markdown.push("\n");
            markdown.push("------------");
            markdown.push("\n");
            markdown.push(`${local_text}`);
        }

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: markdown.join("\n")
            }
        };
    }

    /**
     * Checks if a string is a known localization key and returns a `Hover` object if so.
     */
    public getLocalizedText(key: string, language: string = "en"): Hover | null {
        const text: string | undefined = this.localization.get(language)?.get(key)?.value;
        if (!text) {
            return null;
        }

        const markdown: string[] = [];
        markdown.push(`**Localized Text** - *${language}.localized_text*`);
        markdown.push(`\n`);
        markdown.push(`------------`);
        markdown.push(`\n`);
        markdown.push(`${text}`);

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: markdown.join("\n")
            }
        };
    }

    /**
     * Provides hover support for texture files.
     *
     * TODO:
     * - Add support for Direct Draw Surface (DDS).
     *
     * @param key The texture key value from the JSON (`"trader_light_frigate_hud_icon"`).
     */
    public getTexture(key: string): Hover | null {
        if (!this.textureService.textures.has(key)) {
            return null;
        }

        const fullPath: string = this.textureService.textures.get(key)?.value || "";

        try {
            const fileUrl: string = pathToFileURL(fullPath).toString();

            const markdown: string[] = [];
            markdown.push("**Texture Preview**");
            markdown.push(`[image](${fileUrl})`);
            markdown.push(`![${key}](${fileUrl})`);

            const hover: Hover = {
                contents: {
                    kind: MarkupKind.Markdown,
                    value: markdown.join("\n\n")
                }
            };

            return hover;
        } catch (error) {
            // File not found or read error.
            console.error(`Error reading texture file at ${fullPath}:`, error);
            return null;
        }
    }
}
