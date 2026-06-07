import * as vscode from "vscode";
import * as path from "path";
import * as shared from "@soase/shared";
import { ModMetaData } from "@soase/shared";

export interface ModInfo {
    readonly file: vscode.Uri | undefined;
    meta: shared.ModMetaData | null;
}

export class MetaFile {
    public static readonly FILE_NAME: string = ".mod_meta_data";

    public static async exists(file: vscode.Uri): Promise<boolean> {
        if (path.basename(file.fsPath).toLowerCase() !== MetaFile.FILE_NAME) {
            return false;
        }
        try {
            void (await vscode.workspace.fs.stat(file));
            return true;
        } catch {
            return false;
        }
    }

    public static async existsIn(folder: vscode.Uri): Promise<boolean> {
        const file: vscode.Uri = vscode.Uri.joinPath(folder, MetaFile.FILE_NAME);
        return await MetaFile.exists(file);
    }

    public static async read(uri: vscode.Uri): Promise<ModMetaData | null> {
        try {
            const bytes: Uint8Array = await vscode.workspace.fs.readFile(uri);
            const text: string = bytes.toString();
            const json: any = JSON.parse(text);
            const meta: ModMetaData = {
                compatibility_version: json.compatibility_version,
                display_name: json.display_name,
                display_version: json.display_version,
                short_description: json.short_description,
                long_description: json.long_description,
                logos: {
                    large_logo: json.logos.large_logo,
                    small_logo: json.logos.small_logo
                }
            };
            return meta;
        } catch {
            return null;
        }
    }
}
