import { CompletionItem, CompletionItemKind, CompletionList, Range, TextDocument } from "vscode-json-languageservice";
import * as path from "path";
import { PointerType } from "../pointers";
import { UniformManager, CacheManager, CacheType } from "../managers";

export class CompletionManager {
    // the maximum amount of suggestions that will pop up before being cut
    private readonly MAX_SUGGESTIONS: number = 1000;

    public doComplete(
        context: PointerType,
        currentEntity: PointerType,
        prefix: string,
        range: Range,
        document: TextDocument,
        offset: number,
        cacheManager: CacheManager,
        uniformManager: UniformManager
    ): CompletionList | null {
        if (context === PointerType.localized_text) {
            if (currentEntity === PointerType.localized_text) {
                const cursorText = prefix.slice(0, offset - document.offsetAt(range.start));
                const match = /{icon:(\w*)$/.exec(cursorText);

                if (match) {
                    const contents = match[1];
                    range = {
                        start: document.positionAt(offset - contents.length),
                        end: document.positionAt(offset)
                    };
                    return this.setBrushCompletionList(cacheManager.get("brush"), range, contents);
                }
                return null;
            }
            return this.setCompletionList(cacheManager.get("localized_text"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.brush) {
            return this.setBrushCompletionList(cacheManager.get("brush"), range, prefix);
        } else if (context === PointerType.unit_skin) {
            return this.setCompletionList(cacheManager.get("unit_skin"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit_item) {
            return this.setCompletionList(cacheManager.get("unit_item"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit) {
            return this.setCompletionList(cacheManager.get("unit"), CompletionItemKind.Enum, range, prefix, (e) => ({
                ...e,
                detail: ".unit"
            }));
        } else if (context === PointerType.mesh) {
            return this.setCompletionList(cacheManager.get("mesh"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".obj"
            }));
        } else if (context === PointerType.weapon_tag) {
            return this.setCompletionList(uniformManager.get("weapon"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.weapon) {
            return this.setCompletionList(cacheManager.get("weapon"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".weapon"
            }));
        } else if (context === PointerType.mesh_material) {
            return this.setCompletionList(cacheManager.get("mesh_material"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".mesh_material"
            }));
        } else if (context === PointerType.ttf) {
            return this.setCompletionList(cacheManager.get("ttf"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".ttf"
            }));
        }
        return null;
    }

    public setCompletionList(
        cache: CacheType[keyof CacheType],
        kind: CompletionItemKind,
        range: Range,
        prefix: string,
        optional?: (e: CompletionItem) => CompletionItem
    ): CompletionList {
        return {
            isIncomplete: false,
            items: Array.from(cache)
                .filter((e) => e.startsWith(prefix))
                .slice(0, this.MAX_SUGGESTIONS)
                .map((e) => {
                    const label = e.toLocaleLowerCase();
                    return {
                        label: label,
                        kind: kind,
                        textEdit: { range: range, newText: label }
                    };
                })
                .map((e) => optional?.(e) ?? e)
        };
    }

    public setBrushCompletionList(cache: CacheType[keyof CacheType], range: Range, prefix: string): CompletionList {
        const brushes: CompletionList = this.setCompletionList(cache, CompletionItemKind.File, range, prefix);
        return {
            ...brushes,
            items: brushes.items
                .filter((e) => e.label.endsWith(".png"))
                .map((e) => {
                    const label = path.basename(e.label, path.extname(e.label));
                    return {
                        ...e,
                        label: label,
                        detail: ".png",
                        textEdit: {
                            range: range,
                            newText: label
                        }
                    };
                })
        };
    }
}
