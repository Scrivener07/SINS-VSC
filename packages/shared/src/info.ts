/**
 * Represents a DTO for server initialization options related to the client's workspace configuration.
 */
export interface IWorkspaceInfo {
    readonly gameFolder: string;
    readonly modFolders: string[];
    readonly dependencies: Record<string, string[]>;
}
