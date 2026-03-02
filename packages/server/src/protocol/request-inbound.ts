import { Connection } from "vscode-languageserver/node";
import { ServerRequest, IRequestEntityPath, IRequestLocalization, IRequestUniformPath } from "@soase/shared";
import { GameData, ResolvedFile } from "../data3";

/**
 * Encapsulates inbound requests from the client to the server.
 */
export class RequestInbound {
    private readonly data: GameData;

    constructor(data: GameData) {
        this.data = data;
    }

    /**
     * Registers the request handlers for incoming client requests.
     * @param connection The LSP connection to register handlers on.
     */
    public register(connection: Connection) {
        // Bind the named client request handlers.
        connection.onRequest(ServerRequest.GET_PLAYER_IDS, () => this.getPlayerIdentifiers());
        connection.onRequest(ServerRequest.GET_UNIFORM_PATH, (params: IRequestUniformPath) => this.getUniformPath(params.identifier));
        connection.onRequest(ServerRequest.GET_ENTITY_PATH, (params: IRequestEntityPath) => this.getEntityPath(params.identifier));
        connection.onRequest(ServerRequest.GET_TEXTURE_PATH, (params: string) => this.getTexturePath(params));
        connection.onRequest(ServerRequest.GET_LOCALIZATION, (params: IRequestLocalization) => this.getLocalization(params.language, params.key));
    }

    //#region Paths

    /**
     * Gets the file path for a specific entity identifier where the file type is unspecified.
     * @param identifier The entity identifier.
     * @returns The file path, or undefined if not found.
     */
    private getEntityPath(identifier: string): string | undefined {
        console.info(`<RequestInbound::getEntityPath> Getting file path for entity indentifier: ${identifier}`);
        const results: ResolvedFile[] = this.data.context.root.resolveIdentifier(identifier);

        if (results.length === 0) {
            console.warn(`<RequestInbound::getEntityPath> No paths found for identifier: ${identifier}`);
            return undefined;
        }

        if (results.length > 1) {
            console.warn(`<RequestInbound::getEntityPath> Multiple paths found for identifier: ${identifier}, returning the first one.`);
        }

        // Return the first path found.
        return results[0].entry.filePath;
    }

    /**
     * Gets the file path for a specific texture identifier.
     * @param identifier The texture identifier.
     * @returns The file path, or undefined if not found.
     */
    private getTexturePath(identifier: string): string | undefined {
        console.info(`<RequestInbound::getTexturePath> Getting file path for texture indentifier: ${identifier}`);
        const resolved: ResolvedFile | undefined = this.data.context.root.resolveFile(".png", identifier);
        if (resolved) {
            return resolved.entry.filePath;
        } else {
            console.warn(`<RequestInbound::getTexturePath> No paths found for identifier: ${identifier}`);
            return undefined;
        }
    }

    /**
     * Gets the file path for a specific uniform file identifier.
     * @param identifier The uniform file identifier.
     * @returns The file path, or undefined if not found.
     */
    private getUniformPath(identifier: string): string | undefined {
        console.info(`<RequestInbound::getUniformPath> Getting file path for uniform indentifier: ${identifier}`);
        const resolved: ResolvedFile | undefined = this.data.context.root.resolveFile(".uniforms", identifier);
        if (resolved) {
            return resolved.entry.filePath;
        } else {
            console.warn(`<RequestInbound::getUniformPath> No paths found for identifier: ${identifier}`);
            return undefined;
        }
    }

    //#endregion

    /**
     * Gets the list of available player identifiers.
     *
     * NOTE: `Set<T>` is not serializable and must be converted to an array in order to move over the LSP.
     * TODO: Possibly make this more generic by accepting an entity type parameter.
     * @returns The list of player identifiers.
     */
    private getPlayerIdentifiers(): string[] {
        console.info("<RequestInbound::getPlayerIdentifiers> Getting player IDs from cache.");
        const players: Set<string> | undefined = this.data.getIdentifiers(".player");
        if (players) {
            return Array.from(players);
        } else {
            return [];
        }
    }

    /**
     * Gets the localized value for a specific key and language.
     * @param language The language code.
     * @param key The localization key.
     * @returns The localized value, or undefined if not found.
     */
    private getLocalization(language: string, key: string): string | undefined {
        console.info(`<RequestInbound::getLocalization> Getting localization for key: ${key} in language: ${language}`);
        const text: string | undefined = this.data.localization.get(language, key);
        if (text) {
            return text;
        } else {
            console.warn(`<RequestInbound::getLocalization> No localization data found for key: ${key} in language: ${language}`);
            return undefined;
        }
    }
}
