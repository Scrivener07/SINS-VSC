import * as vscode from "vscode";
import { WorkspaceConfiguration } from "vscode";
import * as shared from "@soase/shared";

export class Configuration {
    private static copy(): WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(shared.NAME);
    }

    public static getInstallation(): string | undefined {
        return this.copy().get<string>(shared.PROPERTIES.installation);
    }

    public static getLanguage(): string {
        return this.copy().get<string>(shared.PROPERTIES.language) || "en";
    }
}
