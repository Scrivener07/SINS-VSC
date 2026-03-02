import * as fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { ASTNode, Hover, JSONDocument, LanguageService, MarkupKind } from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection, TextDocuments } from "vscode-languageserver/node";
import { PointerType } from "../pointers";
import { JsonAST } from "../json-ast";
import { JsonPointer } from "../json-pointer";
import { WorkspaceService } from "../managers";
import { ILanguageState } from "../types";
import { GameData, ResolvedFile, UniformEntry } from "../data";

// TODO: Try to eliminate awaited file IO. Hover should be fast and non-blocking.

export class HoverProvider {
    private readonly jsonLanguageService: LanguageService;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly workspace: WorkspaceService;
    private readonly data: GameData;
    private readonly language: ILanguageState;

    constructor(
        jsonLanguageService: LanguageService,
        documents: TextDocuments<TextDocument>,
        language: ILanguageState,
        workspace: WorkspaceService,
        data: GameData
    ) {
        this.jsonLanguageService = jsonLanguageService;
        this.documents = documents;
        this.language = language;
        this.workspace = workspace;
        this.data = data;
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
                    const filepath: string = fileURLToPath(params.textDocument.uri);
                    const weaponTagHover: Hover | null = this.getWeaponTag(filepath, node.value, this.language.code);
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
        // TODO: Use the document URI to narrow down the search to a specific data source instead of searching everything.

        const resolved: ResolvedFile | undefined = this.data.context.root.resolveFile(".weapon", key);
        if (!resolved) {
            return null;
        }

        const text: string = await fs.promises.readFile(resolved.entry.filePath, "utf-8");
        const json: any = JSON.parse(text);

        const markdown: string[] = [];
        markdown.push(`**${this.data.localization.get(language, json.name)}**`);
        markdown.push("\n");
        markdown.push("------------");
        markdown.push("\n");
        markdown.push(`| Damage | Range | Cooldown | Tags`);
        markdown.push(`| :---- | :---- | :---- | :----`);
        markdown.push(`| ${json?.damage} | ${json?.range} | ${json?.cooldown_duration} | ${json.tags?.join(", ")}`);

        return {
            contents: {
                kind: MarkupKind.Markdown,
                value: markdown.join("\n")
            }
        };
    }

    private getWeaponTag(filepath: string, key: string, language: string = "en"): Hover | null {
        // TODO: Use the document URI to narrow down the search to a specific data source instead of searching everything.

        const entry: UniformEntry | undefined = this.data.uniforms.getEntry("weapon", key);
        if (!entry?.localizedName) {
            return null;
        }

        // Resolve the localized text for this key and language.
        const local_text: string | undefined = this.data.localization.get(language, entry.localizedName);

        const markdown: string[] = [];
        markdown.push(`**Tag**`);
        markdown.push("\n");
        markdown.push("------------");
        markdown.push("\n");
        markdown.push(`${local_text ?? entry.localizedName}`);

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
        const text: string | undefined = this.data.localization.get(language, key);
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
        const resolved: ResolvedFile | undefined = this.data.context.root.resolveFile(".png", key);
        if (!resolved) {
            return null;
        }

        const fullPath: string = resolved.entry.filePath || "";
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
