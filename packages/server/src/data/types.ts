export type DataSourceKind = "game" | "mod";

/**
 * Represents a source of game data, such as a mod or the base game itself.
 * This essentially just acts as a DTO configuration for constructing a `DataSource` right now.
 */
export interface IDataSource {
    readonly directory: string;

    readonly name: string;

    /**
     * @deprecated TODO: deprecate in favor of explicit dependency graph construction.
     */
    readonly priority: number;

    readonly dependencies: string[];

    readonly kind: DataSourceKind;
}
