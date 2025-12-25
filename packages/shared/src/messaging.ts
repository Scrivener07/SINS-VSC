/*
Shared messaging constants for client-server-webview communication.
*/

/**
 * The structure of messages exchanged between the webview and the extension.
 */
export interface IWebViewMessage {
    type: string;
    identifier?: string;
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
    /** Indicates that the webview is ready for interaction. */
    public static readonly READY: string = "ready";

    /** Indicates that a player has been selected in the webview and research data is being requested. */
    public static readonly PLAYER_SELECT: string = "playerSelect";

    /** Indicates that the research data for the selected player should be updated in the webview. */
    public static readonly UPDATE_RESEARCH: string = "updateResearch";

    public static readonly DATA_REQUEST: string = "requestData";
    public static readonly FILE_OPEN: string = "openFile";
}

/**
 * Some dummy sample data for the research tree.
 *
 * TODO: Delete this and fetch real data from the language server.
 */
export const SAMPLE_DATA = [
    {
        id: "advent_commerce_0",
        name: "Commerce I",
        prerequisites: [],
        field_coord: [0, 1],
        tier: 0,
        field: "civilian_material"
    },
    {
        id: "advent_commerce_1",
        name: "Commerce II",
        prerequisites: [["advent_commerce_0"]],
        field_coord: [3, 1],
        tier: 1,
        field: "civilian_material"
    },
    {
        id: "advent_commerce_2",
        name: "Commerce III",
        prerequisites: [["advent_commerce_1"]],
        field_coord: [6, 1],
        tier: 3,
        field: "civilian_material"
    },
    {
        id: "my_tech_0",
        name: "Tech I",
        prerequisites: [],
        field_coord: [0, 2],
        tier: 0,
        field: "civilian_material"
    },
    {
        id: "my_tech_1",
        name: "Tech II",
        prerequisites: [["my_tech_0"]],
        field_coord: [1, 2],
        tier: 1,
        field: "civilian_material"
    },
    {
        id: "my_tech_2",
        name: "Tech III A",
        prerequisites: [["my_tech_1"]],
        field_coord: [2, 2],
        tier: 3,
        field: "civilian_material"
    },
    {
        id: "my_tech_2",
        name: "Tech III B",
        prerequisites: [["my_tech_1"]],
        field_coord: [2, 3],
        tier: 3,
        field: "civilian_material"
    }
];
