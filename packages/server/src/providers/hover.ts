import { Hover, MarkupKind } from "vscode-json-languageservice";
import * as fs from "fs";
import { LocalizationManager, IndexManager } from "../managers";

export class HoverProvider {
    private indexManager: IndexManager;
    private localizationManager: LocalizationManager;

    constructor(indexManager: IndexManager, localizationManager: LocalizationManager) {
        this.indexManager = indexManager;
        this.localizationManager = localizationManager;
    }

    public async getWeapon(key: string, lang: string = "en"): Promise<Hover | null> {
        const paths = this.indexManager.getPaths(key);
        const markdown: string[] = [];
        if (paths) {
            const file: string = await fs.promises.readFile(paths[0], "utf-8");
            const contents = JSON.parse(file);
            if (paths.some((e) => e.endsWith(".weapon"))) {
                markdown.push(`**${this.localizationManager.get(lang).get(contents.name)}**`);
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

    public async getWeaponTag(key: string, lang: string = "en"): Promise<Hover | null> {
        const paths = this.indexManager.getPaths("weapon")?.find((e) => e.endsWith(".uniforms"));
        const markdown: string[] = [];
        if (paths) {
            const contents = JSON.parse(await fs.promises.readFile(paths, "utf-8"));

            markdown.push(`**Tag**`);
            markdown.push("\n");
            markdown.push("------------");
            markdown.push("\n");
            markdown.push(`${this.localizationManager.get(lang)?.get(contents?.weapon_tags.find((e: any) => e?.name === key)?.localized_name)}`);
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
    public getLocalizedText(key: string, lang: string = "en"): Hover | null {
        if (!this.localizationManager.knownKeys.has(key)) {
            return null;
        }

        const markdown: string[] = [];
        markdown.push(`**Localized Text** - *${lang}.localized_text*`);
        markdown.push(`\n`);
        markdown.push(`------------`);
        markdown.push(`\n`);
        markdown.push(`${this.localizationManager.get(lang)?.get(key)}`);

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: markdown.join("\n")
            }
        };
    }
}
