/**
 * Represents a source of game data, such as a mod or the base game itself.
 * This essentially just acts as a DTO configuration for constructing a `DataSource` right now.
 */
export interface IDataSource {
    directory: string;
    name: string;
    priority: number;
}
