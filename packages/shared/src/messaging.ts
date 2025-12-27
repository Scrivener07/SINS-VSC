/*
Shared messaging types and constants for client-server-webview communication.
*/

/**
 * The structure of messages exchanged between the webview and the extension.
 */
export interface IWebViewMessage {
    /** The type of the message. */
    type: string;

    /** An optional identifier for the message. */
    identifier?: string;

    /** Optional data payload for the message. */
    data?: any;
}

/**
 * The structure of log messages sent from the webview to the extension.
 */
export interface ILogMessage {
    /** The severity level of the log message. */
    level: "info" | "warn" | "error";

    /** The log message text. */
    text: string;

    /** Additional data associated with the log message. */
    data?: any;
}

/**
 * The names of the requests sent from the client to the webview.
 */
export enum ViewRequest {
    /** Sends the list of players to the webview. */
    PLAYER_LIST = "playerList",

    /** @deprecated WIP: For the unused refresh request. */
    UPDATE = "update",

    /** @deprecated WIP: For the unused refresh request. */
    REFRESH = "refresh"
}

/**
 * The names of the responses sent from the webview to the client.
 */
export enum ViewResponse {
    /** Log message from the webview to be recorded by the extension. */
    LOG = "log",

    /** Indicates that the webview is ready for interaction. */
    READY = "ready",

    /** Indicates that a player has been selected in the webview and research data is being requested. */
    PLAYER_SELECT = "playerSelect",

    /** Indicates that the research data for the selected player should be updated in the webview. */
    UPDATE_RESEARCH = "updateResearch",

    /** @deprecated WIP: For the unused refresh request. */
    DATA_REQUEST = "requestData",

    /** Indicates a request to open a file in the editor. */
    FILE_OPEN = "openFile"
}
