/**
 * The names of the requests sent from the client to the server.
 */
export enum ServerRequest {
    /** A request to get the list of player IDs. */
    GET_PLAYER_IDS = "soase/entity/player_ids",

    /** A request to get the file path for an entity by ID. */
    GET_ENTITY_PATH = "soase/entity/file_path",

    /** A request to get a localized string. */
    GET_LOCALIZATION = "soase/entity/localization"
}

/**
 * Request to get the file path for an entity by ID.
 */
export interface IRequestEntityPath {
    /** The identifier of the entity. */
    identifier: string;
}

/**
 * Request to get a localized string.
 */
export interface IRequestLocalization {
    /** The language code. */
    language: string;

    /** The localization key. */
    key: string;
}
