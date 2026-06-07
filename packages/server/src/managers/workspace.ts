import { Connection, InitializeParams, TextDocuments } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as shared from "@soase/shared";
import { ClientNotification } from "@soase/shared";
import { DataService, IDataSource } from "../data";
import { Validator } from "../validate";

/**
 * Manages workspace directories and files.
 *
 * TODO: Support workspace folder changes.
 */
export class WorkspaceService {
    private readonly connection: Connection;
    private readonly documents: TextDocuments<TextDocument>;
    private readonly validator: Validator;
    private readonly data: DataService;

    /** A cached string to the vanilla game installation folder. */
    public gameFolder: IDataSource | undefined = undefined;

    /** A list of cached strings to the workspace folders this server is operating on. */
    public modFolders: Map<string, IDataSource> = new Map<string, IDataSource>();

    constructor(connection: Connection, documents: TextDocuments<TextDocument>, validator: Validator, data: DataService) {
        this.connection = connection;
        this.documents = documents;
        this.validator = validator;
        this.data = data;

        // Bind the named server notifications.
        this.connection.onNotification(ClientNotification.WORKSPACE_FOLDERS_CHANGED, (params: shared.IWorkspaceInfo) =>
            this.onWorkspaceFoldersChanged(params)
        );
    }

    //#region Initialization

    /**
     * Called during server initialization.
     * Caches the workspace folder paths for later use.
     * @param parameters The initialization parameters sent by the client, containing workspace info in `initializationOptions`.
     */
    public initializing(parameters: InitializeParams): void {
        const info: shared.IWorkspaceInfo = parameters.initializationOptions.info;
        if (!info) {
            console.warn(
                "WorkspaceService::initializing: Initialization parameters missing workspace info. Server will run with limited functionality."
            );
            return;
        }

        this.gameFolder = WorkspaceService.create(info.gameFolder, "Base Game", 0, [], "game");

        for (let index = 0; index < info.modFolders.length; index++) {
            const modFolder: string = info.modFolders[index];
            const modDependencies: string[] = info.dependencies[modFolder] ?? [];
            const modSource: IDataSource = WorkspaceService.create(modFolder, "Mod", index + 1, modDependencies, "mod");
            this.modFolders.set(modFolder.toLowerCase(), modSource);
        }
    }

    /**
     * Called after the server has initialized.
     * Registers workspace folders as data sources and triggers an initial scan to populate file catalogs.
     */
    public async initialized(): Promise<void> {
        // Initialize game workspace data layer.
        if (this.gameFolder) {
            await this.data.addSource(this.gameFolder);
        } else {
            this.connection.console.warn("WorkspaceService::initialized: No game folder found in workspace. Skipping game layer initialization.");
            this.connection.window.showWarningMessage("SINS: No game folder configured. Some features will be unavailable.");
            return;
        }

        // Initialize mod workspace data layer.
        for (const [key, value] of this.modFolders) {
            await this.data.addSource(value);
        }

        // Load all data to populate caches before processing any documents.
        await this.data.reload();
    }

    public static create(directory: string, name: string, priority: number, dependencies: string[] = [], kind: "game" | "mod" = "mod"): IDataSource {
        return {
            directory: directory,
            name: name,
            priority: priority,
            dependencies: dependencies,
            kind: kind
        };
    }

    //#endregion

    //#region Notifications

    /**
     * Incrementally updates providers when client workspace folders change.
     */
    private async onWorkspaceFoldersChanged(info: shared.IWorkspaceInfo): Promise<void> {
        this.connection.console.info(`[Server(${process.pid}) Workspace folders changed: ${JSON.stringify(info, null, 4)}]`);

        const oldGameFolder: string | undefined = this.gameFolder?.directory;
        const oldModFolders: Set<string> = new Set(this.modFolders.keys());

        const newGameFolder: string | null = info.gameFolder;
        const newModFolders: Set<string> = new Set(info.modFolders);

        // Detect added and removed folders.
        const added: string[] = [];
        const removed: string[] = [];

        // Check game folder.
        if (oldGameFolder && newGameFolder !== oldGameFolder) {
            removed.push(oldGameFolder);
        }
        if (newGameFolder && newGameFolder !== oldGameFolder) {
            added.push(newGameFolder);
        }

        // Check mod folders.
        for (const folder of oldModFolders) {
            if (!newModFolders.has(folder)) {
                removed.push(folder);
            }
        }
        for (const folder of newModFolders) {
            if (!oldModFolders.has(folder)) {
                added.push(folder);
            }
        }

        // Update workspace service state.
        this.gameFolder = WorkspaceService.create(newGameFolder, "Base Game", 0, [], "game");
        let index: number = 1;
        for (const modFolder of newModFolders) {
            this.modFolders.set(modFolder.toLowerCase(), WorkspaceService.create(modFolder, "Mod", index, [], "mod"));
            index++;
        }

        // Remove sources for removed folders.
        for (const folder of removed) {
            this.connection.console.info(`Removing source: ${folder}`);
            this.data.removeSource(folder);
        }

        // Add sources for added folders.
        for (const folder of added) {
            this.connection.console.info(`Adding source: ${folder}`);
            if (this.gameFolder?.directory.toLowerCase() === folder.toLowerCase()) {
                await this.data.addSource(this.gameFolder);
            } else if (this.modFolders.has(folder.toLowerCase())) {
                const found: IDataSource | undefined = this.modFolders.get(folder.toLowerCase());
                if (found) {
                    await this.data.addSource(found);
                }
            }
        }

        // Reload caches and re-validate if anything changed.
        if (added.length > 0 || removed.length > 0) {
            await this.data.reload();

            for (const document of this.documents.all()) {
                await this.validator.validateTextDocument(document);
            }

            this.connection.console.info(`Sources updated: +${added.length} -${removed.length}`);
        } else {
            this.connection.console.info("No source changes needed.");
        }
    }

    //#endregion
}
