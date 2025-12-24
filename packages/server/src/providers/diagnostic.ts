import { Diagnostic, Range } from "vscode-json-languageservice";
import * as shared from "@soase/shared";

enum Severity {
    error = 1,
    warn = 2,
    info = 3,
    hint = 4
}

export class DiagnosticManager {
    constructor(private diagnostics: Diagnostic[]) {
        this.diagnostics = diagnostics;
    }

    private report(message: string, range: Range, severity: Severity): void {
        this.diagnostics.push({
            severity: severity,
            range: range,
            message: message,
            source: shared.SOURCE
        });
    }

    public error(message: string, range: Range): void {
        this.report(message, range, Severity.error);
    }

    public warn(message: string, range: Range): void {
        this.report(message, range, Severity.warn);
    }

    public info(message: string, range: Range): void {
        this.report(message, range, Severity.info);
    }

    public hint(message: string, range: Range): void {
        this.report(message, range, Severity.hint);
    }

    // ----------------------------------- //
}

export class Report {
    public static missingInFiles(message: string, pointer: string): string {
        return `[${pointer}]: "${message}" is missing.`;
    }
    public static missingInManifest(message: string, pointer: string): string {
        return `[${pointer}]: "${message}" is missing in ${pointer}.entity_manifest`;
    }
}
