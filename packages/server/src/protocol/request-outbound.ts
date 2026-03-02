import { Connection } from "vscode-languageserver/node";
import * as shared from "@soase/shared";

/**
 * Encapsulates outbound requests from the server to the client.
 */
export class RequestOutbound {
    /** The LSP connection to send requests on. */
    private connection: Connection | undefined;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Sends a data request to client.
     * @param request The request to send.
     * @returns The response from the client.
     * @throws If the connection is not defined.
     */
    private async sendRequest(request: string): Promise<string> {
        if (!this.connection) {
            throw new Error("Connection not defined.");
        }
        return this.connection.sendRequest(request).then((a: any) => a);
    }

    /**
     * Gets the current language from the client settings.
     * @returns The current language code.
     * @throws If the connection is not defined.
     */
    public async getLanguage(): Promise<string> {
        return await this.sendRequest(shared.PROPERTIES.language);
    }
}
