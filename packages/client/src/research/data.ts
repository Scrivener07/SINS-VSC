import * as vscode from "vscode";
import { IRequestEntityPath, IRequestLocalization, IResearchSubject, ServerRequest } from "@soase/shared";
import { LanguageClient } from "vscode-languageclient/node";
import { Configuration } from "../configuration";

/**
 * Service for loading research data by coordinating server requests and file I/O.
 */
export class ResearchDataService {
    private readonly client: LanguageClient;

    constructor(client: LanguageClient) {
        this.client = client;
    }

    /**
     * Gets the list of available player IDs.
     * @returns The list of player IDs.
     */
    public async getPlayerList(): Promise<string[]> {
        console.info("<ResearchDataService::getPlayerList> Getting player list from server.");
        return await this.client.sendRequest<string[]>(ServerRequest.GET_PLAYER_IDS, undefined);
    }

    /**
     * Gets all research subjects for a given player.
     * @param playerID The player identifier.
     * @returns An array of research subjects for the specified player.
     */
    public async getResearchForPlayer(playerID: string): Promise<IResearchSubject[]> {
        console.info(`<ResearchDataService::getResearchForPlayer> Getting research for player ID: ${playerID}`);
        try {
            // Get player file path from server.
            const playerPath: string | null = await this.getEntityPath(playerID);
            if (!playerPath) {
                console.warn(`<ResearchDataService::getResearchForPlayer> File not found for player ID: ${playerID}`);
                return [];
            }

            // Read and extract research subject IDs from the player's research section.
            const player: any = await this.readJsonFile(playerPath);
            const researchSubjectIds: string[] = player.research?.research_subjects ?? [];
            console.info(`<ResearchDataService::getResearchForPlayer> Found ${researchSubjectIds.length} research subjects`);

            // Load each research subject.
            const research_subject: IResearchSubject[] = [];
            for (const researchId of researchSubjectIds) {
                const researchSubject: IResearchSubject | null = await this.loadResearchSubject(researchId);
                if (researchSubject) {
                    research_subject.push(researchSubject);
                }
            }

            return research_subject;
        } catch (error) {
            console.error(`Failed to load research for player ${playerID}:`, error);
            return [];
        }
    }

    /**
     * Loads a single research subject by ID.
     */
    private async loadResearchSubject(researchId: string): Promise<IResearchSubject | null> {
        try {
            // Get research subject file path from server.
            const researchPath: string | null = await this.getEntityPath(researchId);
            if (!researchPath) {
                console.warn(`<ResearchDataService::loadResearchSubject> File not found for research ID: ${researchId}`);
                return null;
            }

            // Read and parse research subject file.
            const json: any = await this.readJsonFile(researchPath);

            // Get user language preference.
            const language: string = Configuration.getLanguage();

            // Get the localized name.
            const localizedName: string = (await this.getLocalization(language, json.name)) || json.name;

            // Create subject matching ResearchNode interface.
            const research_subject: IResearchSubject = {
                id: researchId,
                name: localizedName,
                field: json.field || "unknown",
                field_coord: json.field_coord || [0, 0],
                tier: json.tier || 0,
                prerequisites: json.prerequisites || []
            };

            return research_subject;
        } catch (error) {
            console.error(`Failed to load research subject ${researchId}:`, error);
            return null;
        }
    }

    /**
     * Gets the file path for an entity by its identifier.
     */
    public async getEntityPath(identifier: string): Promise<string | null> {
        const request: IRequestEntityPath = {
            identifier: identifier
        };
        return await this.client.sendRequest<string | null>(ServerRequest.GET_ENTITY_PATH, request);
    }

    /**
     * Gets a localized string for a given key and language.
     */
    private async getLocalization(language: string, key: string): Promise<string | null> {
        const request: IRequestLocalization = {
            language: language,
            key: key
        };
        return await this.client.sendRequest<string | null>(ServerRequest.GET_LOCALIZATION, request);
    }

    //--------------------------------------------------

    /**
     * Reads and parses a JSON file from the file system.
     */
    private async readJsonFile(filePath: string): Promise<any> {
        const uri: vscode.Uri = vscode.Uri.file(filePath);
        const content: Uint8Array = await vscode.workspace.fs.readFile(uri);
        const json: string = content.toString();
        return JSON.parse(json);
    }
}
