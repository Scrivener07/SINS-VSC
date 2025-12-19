import { WorkspaceConfiguration, workspace } from "vscode";
import * as shared from "@soase/shared";

export class Configuration {
    private static copy(): WorkspaceConfiguration {
        return workspace.getConfiguration(shared.NAME);
    }

    public static getLanguage(): any {
        return this.copy().get(shared.PROPERTIES.language);
    }

    // Add more...
}
