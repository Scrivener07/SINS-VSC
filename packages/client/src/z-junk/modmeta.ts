import * as path from "path";
import * as vscode from "vscode";
import * as shared from "@soase/shared";
import { ModMetaData } from "@soase/shared";
import { GameDirectory } from "../environment";

interface ModInfo {
    meta: shared.ModMetaData | null;
    meta_file: vscode.Uri | undefined;
    root: vscode.Uri;
    dependencies: ModInfo[];
}

class ModMeta {
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
        } catch (error) {
            return null;
        }
    }
}

class Example {
    private static async game(): Promise<ModInfo> {
        const info: ModInfo = {
            meta: {
                compatibility_version: 2,
                display_name: "Sins of a Solar Empire 2",
                display_version: "1.50.7.0",
                short_description: "The base game installation content.",
                long_description: "The base game installation content.",
                logos: {
                    large_logo: "logo_large.png",
                    small_logo: "logo_small.png"
                }
            },
            meta_file: undefined,
            root: await GameDirectory.get(),
            dependencies: []
        };
        return info;
    }

    private static async balance_preview(): Promise<ModInfo> {
        const meta_file = vscode.Uri.file("C:\\Users\\Public\\mod.io\\5762\mods\\5757349\\.mod_meta_data");
        const root = vscode.Uri.file(path.dirname(meta_file.fsPath));
        const info: ModInfo = {
            meta: await ModMeta.read(meta_file),
            meta_file: meta_file,
            root: root,
            dependencies: []
        };
        return info;
    }
}
