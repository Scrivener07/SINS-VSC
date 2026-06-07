import * as vscode from "vscode";
import { WorkspaceConfiguration } from "vscode";
import * as shared from "@soase/shared";

export class Configuration {
    private static copy(scope?: vscode.ConfigurationScope): WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(shared.NAME, scope);
    }

    public static getInstallation(): string | undefined {
        return this.copy().get<string>(shared.PROPERTIES.installation);
    }

    public static getLanguage(): string {
        return this.copy().get<string>(shared.PROPERTIES.language) || "en";
    }

    public static getDataSources(scope?: vscode.ConfigurationScope): DataSourceSettings {
        return this.copy(scope).get<DataSourceSettings>(shared.PROPERTIES.dataSources) ?? {};
    }
}

/**
 * Represents a mapping of data source identifiers to their settings.
 * A data source is a content directory for a modification, which may have dependencies on other data sources.
 * The data source key is a full path to the content directory.
 */
export type DataSourceSettings = Record<string, IDataSourceSetting>;

/**
 * Represents the settings for a data source which is a modification content directory.
 *
 * TODO: See also `IModDependencyFile` and consider if these should be unified or if the `IDataSourceSettings` should be a subset of the mod dependency file.
 */
export interface IDataSourceSetting {
    dependencies?: string[];
}
