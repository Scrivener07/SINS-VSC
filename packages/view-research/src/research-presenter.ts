import { VSCode } from "./services/vscode";
import { Log } from "./services/log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject } from "@soase/shared";
import { ToolbarView } from "./toolbar-view";
import { ResearchView } from "./research-view";
import { ResearchDomain, ResearchModel } from "./research-model";
import { StatusText } from "./status";
import { SubjectNode } from "./research-render-subject";

/**
 * The top-level orchestrator class for the research visualizer.
 */
export class ResearchPresenter {
    /** The VSCode API object provided to the webview. */
    private readonly vscode: VSCode;

    private readonly model: ResearchModel;

    private readonly toolbar: ToolbarView;

    /** A container for user-facing messages. */
    private readonly messageContainer: HTMLDivElement;

    private readonly display: ResearchView;

    /**
     * Instantiates a new class instance with the given VSCode API object.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCode) {
        Log.info("<ResearchPresenter::constructor> Instantiating");
        this.vscode = vscode;
        this.model = new ResearchModel();
        this.model.addEventListener(ResearchModel.STATUS_CHANGED, (e) => this.onStatusChanged(e as CustomEvent<string | null>));

        this.toolbar = new ToolbarView();
        this.toolbar.player.select.addEventListener("change", (e) => this.player_OnChange(e));
        this.toolbar.domain.civilian.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.toolbar.domain.military.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.toolbar.connections.checkbox.addEventListener("change", (e) => this.nodeConnection_OnChange(e));
        document.body.appendChild(this.toolbar);

        // Create message container for user-facing messages
        this.messageContainer = document.createElement("div");
        document.body.appendChild(this.messageContainer);

        this.display = new ResearchView(this.model);
        this.display.addEventListener("click", (e) => this.node_OnClick(e));
        document.body.appendChild(this.display);
    }

    private onStatusChanged(e: CustomEvent<string | null>): void {
        if (e.detail) {
            const element: HTMLDivElement = StatusText.create(e.detail);
            this.messageContainer.replaceChildren(element);
        } else {
            this.messageContainer.replaceChildren();
        }
    }

    public onMessage(message: any): void {
        Log.info("<ResearchPresenter::onMessage> Message received", message);
        switch (message.type) {
            case ViewRequest.PLAYER_LIST:
                this.player_updateOptions(message.data);
                break;
            case ViewResponse.UPDATE_RESEARCH:
                this.player_updateSubjects(message.data);
                break;
            case ViewRequest.UPDATE:
                this.player_updateSubjects(message.data);
                break;
            default:
                Log.warn(`<ResearchPresenter::onMessage> Unhandled message type: ${message.type}`, message);
        }
    }

    private player_updateOptions(players: string[]): void {
        this.model.players = players;

        if (this.model.players.length > 0) {
            if (this.toolbar.player.populate(players)) {
                this.model.setStatusMessage("Select a player to view research tree.");
            } else {
                this.toolbar.player.populate([]);
                this.model.setStatusMessage("Failed to populate player list.");
            }
        } else {
            this.model.setStatusMessage("No player data is available.");
        }
    }

    private player_updateSubjects(subjects: IResearchSubject[]): void {
        this.model.setSubjects(subjects);

        // Show domain tabs if we have data.
        this.toolbar.domain.setVisible(subjects.length > 0);
        this.display.render(this.model.subjectsFiltered);
    }

    private player_OnChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        this.model.playerSelection = target.value;

        if (this.model.playerSelection) {
            // Request research data for selected player.
            const message: IWebViewMessage = {
                type: ViewResponse.PLAYER_SELECT,
                identifier: this.model.playerSelection
            };
            this.vscode.postMessage(message);
        }
    }

    private domainTab_OnClick(e: Event): void {
        const target = e.target as HTMLButtonElement;
        const domain: string = target.dataset.domain;

        if (!domain || domain === this.model.domainSelection) {
            return;
        }

        // Update the active tab styling.
        this.toolbar.domain.setActive(target);

        // Update the selected domain and re-render.
        this.model.setDomain(domain as ResearchDomain);
        this.display.render(this.model.subjectsFiltered);
    }

    private nodeConnection_OnChange(e: Event): void {
        const target = e.target as HTMLInputElement;
        this.model.nodeConnectionsEnabled = target.checked;
        this.display.render(this.model.subjectsFiltered);
    }

    private node_OnClick(e: PointerEvent): void {
        Log.info("<ResearchPresenter::node_OnClick> Click event");
        const target: HTMLElement = e.target as HTMLElement;
        const node: HTMLElement | null = target.closest(`.${SubjectNode.SUBJECT_NODE_CLASS}`) as HTMLElement;
        if (node) {
            const nodeId: string | undefined = node.dataset.id;
            const message: IWebViewMessage = { type: ViewResponse.FILE_OPEN, identifier: nodeId };
            this.vscode.postMessage(message);
        }
    }
}
