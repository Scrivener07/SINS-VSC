import * as fs from "fs";
import { ASTNode, Hover, JSONDocument, LanguageService, MarkupKind } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { IndexerService, LocalizationService, TextureService } from "../data/service-game";
import { pathToFileURL } from "url";
import { PointerType } from "../pointers";
import { JsonAST } from "../json-ast";
import { Connection, TextDocuments } from "vscode-languageserver/node";
import { WorkspaceService } from "../managers";
import { JsonPointer } from "../json-pointer";
import { ILanguageState } from "../types";

export class HoverProvider {
    private readonly jsonLanguageService: LanguageService;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly workspace: WorkspaceService;
    private readonly indexer: IndexerService;
    private readonly localization: LocalizationService;
    private readonly textures: TextureService;
    private readonly language: ILanguageState;

    constructor(
        jsonLanguageService: LanguageService,
        documents: TextDocuments<TextDocument>,
        language: ILanguageState,
        workspace: WorkspaceService,
        indexer: IndexerService,
        localization: LocalizationService,
        textures: TextureService
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
        this.language = language;
        this.workspace = workspace;
        this.indexer = indexer;
        this.localization = localization;
        this.textures = textures;
    }

    /**
     * Registers the feature handler with the LSP connection.
     * @param connection The LSP connection to register the handler on.
     */
    public register(connection: Connection): void {
        connection.onHover(this.onHover.bind(this));
    }

    /**
     * Called when the user hovers over text.
     * @param params The parameters for the hover request.
     * @returns A promise that resolves to a Hover object or null.
     */
    private async onHover(params: { textDocument: any; position: any }): Promise<any> {
        const document: TextDocument | undefined = this.documents.get(params.textDocument.uri);
        if (!document) {
            return null;
        }

        const jsonDocument: JSONDocument = this.jsonLanguageService.parseJSONDocument(document);
        const offset: number = document.offsetAt(params.position);
        const node: ASTNode | undefined = jsonDocument.getNodeFromOffset(offset);
        const context: PointerType = await JsonPointer.getContext(this.jsonLanguageService, document, jsonDocument, node);
        console.info("Hover context:", PointerType[context]);

        if (node && node.type === "string" && node.value) {
            if (JsonAST.isNodeValue(node)) {
                if (context === PointerType.brush && this.workspace.gameFolder) {
                    const textureHover: Hover | null = this.getTexture(node.value);
                    if (textureHover) {
                        return textureHover;
                    }
                }

                if (context === PointerType.localized_text) {
                    const localizeHover: Hover | null = this.getLocalizedText(node.value, this.language.code);
                    if (localizeHover) {
                        return localizeHover;
                    }
                }

                if (context === PointerType.weapon) {
                    const weaponHover: Hover | null = await this.getWeapon(node.value, this.language.code);
                    if (weaponHover) {
                        return weaponHover;
                    }
                }

                if (context === PointerType.weapon_tag) {
                    const weaponTagHover: Hover | null = await this.getWeaponTag(node.value, this.language.code);
                    if (weaponTagHover) {
                        return weaponTagHover;
                    }
                }
            }
        }

        // Fallback to standard JSON schema hover.
        return this.jsonLanguageService.doHover(document, params.position, jsonDocument);
    }

    private async getWeapon(key: string, language: string = "en"): Promise<Hover | null> {
        const paths = this.indexer.index.get(key)?.item.value;
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

    private async getWeaponTag(key: string, language: string = "en"): Promise<Hover | null> {
        const paths: string | undefined = this.indexer.index.get("weapon")?.item.value.find((found) => found.endsWith(".uniforms"));
        const markdown: string[] = [];
        if (paths) {
            const contents = JSON.parse(await fs.promises.readFile(paths, "utf-8"));
            const local_key = contents?.weapon_tags.find((found: any) => found?.name === key)?.localized_name;
            const local_text: string | undefined = this.localization.get(language)?.get(local_key)?.item.value;

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
    private getLocalizedText(key: string, language: string = "en"): Hover | null {
        const text: string | undefined = this.localization.get(language)?.get(key)?.item.value;
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
    private getTexture(key: string): Hover | null {
        if (!this.textures.root.has(key)) {
            return null;
        }

        const fullPath: string = this.textures.root.get(key)?.item.value || "";

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
