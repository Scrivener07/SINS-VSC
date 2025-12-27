import { WorkspaceConfiguration, workspace } from "vscode";
import * as shared from "@soase/shared";

export class Configuration {
    private static copy(): WorkspaceConfiguration {
        return workspace.getConfiguration(shared.NAME);
    }

    public static getLanguage(): string {
        return this.copy().get<string>(shared.PROPERTIES.language) || "en";
    }

    // Add more...
}
