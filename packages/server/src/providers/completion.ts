import * as path from "path";
import { CompletionItem, CompletionItemKind, CompletionList, Range, TextDocument } from "vscode-json-languageservice";
import { PointerType } from "../pointers";
import { DataService, UniformService } from "../data/service-game";

export class CompletionManager {
    /** The maximum amount of suggestions that will pop up before being cut. */
    private readonly MAX_SUGGESTIONS: number = 1000;

    private static readonly EMPTY_SET: Set<string> = new Set<string>();

    public doComplete(
        context: PointerType,
        currentEntity: PointerType,
        prefix: string,
        range: Range,
        document: TextDocument,
        offset: number,
        dataManager: DataService,
        uniformManager: UniformService
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
                    return this.setBrushCompletionList(this.getCache(dataManager, "brush"), range, contents);
                }
                return null;
            }
            return this.setCompletionList(this.getCache(dataManager, "localized_text"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.brush) {
            return this.setBrushCompletionList(this.getCache(dataManager, "brush"), range, prefix);
        } else if (context === PointerType.unit_skin) {
            return this.setCompletionList(this.getCache(dataManager, "unit_skin"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit_item) {
            return this.setCompletionList(this.getCache(dataManager, "unit_item"), CompletionItemKind.Enum, range, prefix);
        } else if (context === PointerType.unit) {
            return this.setCompletionList(this.getCache(dataManager, "unit"), CompletionItemKind.Enum, range, prefix, (e) => ({
                ...e,
                detail: ".unit"
            }));
        } else if (context === PointerType.mesh) {
            return this.setCompletionList(this.getCache(dataManager, "mesh"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".obj"
            }));
        } else if (context === PointerType.weapon_tag) {
            return this.setCompletionList(this.getCache(uniformManager, "weapon"), CompletionItemKind.Variable, range, prefix);
        } else if (context === PointerType.weapon) {
            return this.setCompletionList(this.getCache(dataManager, "weapon"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".weapon"
            }));
        } else if (context === PointerType.mesh_material) {
            return this.setCompletionList(this.getCache(dataManager, "mesh_material"), CompletionItemKind.Variable, range, prefix, (e) => ({
                ...e,
                detail: ".mesh_material"
            }));
        } else if (context === PointerType.ttf) {
            return this.setCompletionList(this.getCache(dataManager, "ttf"), CompletionItemKind.File, range, prefix, (e) => ({
                ...e,
                detail: ".ttf"
            }));
        }
        return null;
    }

    /**
     * Retrieves the set of identifiers for the given key from a service root.
     * Returns an empty set if the category is not found.
     */
    private getCache(service: DataService | UniformService, key: string): Set<string> {
        return service.root.get(key)?.value.value ?? CompletionManager.EMPTY_SET;
    }

    public setCompletionList(
        cache: Set<string>,
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
                    const label: string = e.toLocaleLowerCase();
                    return {
                        label: label,
                        kind: kind,
                        textEdit: { range: range, newText: label }
                    };
                })
                .map((e) => optional?.(e) ?? e)
        };
    }

    public setBrushCompletionList(cache: Set<string>, range: Range, prefix: string): CompletionList {
        const brushes: CompletionList = this.setCompletionList(cache, CompletionItemKind.File, range, prefix);
        return {
            ...brushes,
            items: brushes.items
                .filter((e) => e.label.endsWith(".png"))
                .map((e) => {
                    const label: string = path.basename(e.label, path.extname(e.label));
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
