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
 * The names of the requests sent from the client to the server.
 */
export class ServerRequest {
    public static readonly PLAYERS: string = "custom/getPlayers";
    public static readonly PLAYER_RESEARCH: string = "custom/getResearchForPlayer";
    public static readonly PLAYER_FILEPATH: string = "custom/getFilePath";
}

/**
 * The names of the requests sent from the client to the webview.
 */
export class ViewRequest {
    public static readonly UPDATE: string = "update";
    public static readonly REFRESH: string = "refresh";
    public static readonly PLAYER_LIST: string = "playerList";
}

/**
 * The names of the responses sent from the webview to the client.
 */
export class ViewResponse {
    public static readonly LOG: string = "log";

    /** Indicates that the webview is ready for interaction. */
    public static readonly READY: string = "ready";

    /** Indicates that a player has been selected in the webview and research data is being requested. */
    public static readonly PLAYER_SELECT: string = "playerSelect";

    /** Indicates that the research data for the selected player should be updated in the webview. */
    public static readonly UPDATE_RESEARCH: string = "updateResearch";

    public static readonly DATA_REQUEST: string = "requestData";
    public static readonly FILE_OPEN: string = "openFile";
}
