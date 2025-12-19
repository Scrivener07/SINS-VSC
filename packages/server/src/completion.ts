import { CompletionItem, CompletionItemKind, CompletionList, Range } from "vscode-json-languageservice";
import { CacheType } from "./cache";

export class CompletionManager {
    // the maximum amount of suggestions that will pop up before being cut
    private readonly MAX_SUGGESTIONS: number = 1000;

    public setCompletionList(
        cache: CacheType[keyof CacheType],
        kind: CompletionItemKind,
        range: Range,
        prefix: string,
        optional?: (e: CompletionItem) => CompletionItem,
    ): CompletionList {
        return {
            isIncomplete: false,
            items: Array.from(cache)
                .filter((e) => e.startsWith(prefix))
                .slice(0, this.MAX_SUGGESTIONS)
                .map((e) => {
                    return {
                        label: e,
                        kind: kind,
                        textEdit: { range: range, newText: e },
                    };
                })
                .map((e) => optional?.(e) ?? e),
        };
    }
}
