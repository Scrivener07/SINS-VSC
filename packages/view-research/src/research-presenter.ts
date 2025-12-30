import { VSCode } from "./services/vscode";
import { Log } from "./services/log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject } from "@soase/shared";
import { ToolbarView } from "./toolbar-view";
import { ResearchView } from "./research-view";
import { MessageText } from "./layout";
import { ResearchSubject } from "./research-render-subject";
import { ResearchDomain, ResearchModel } from "./research-model";

/* Features:
- Research tree visualizer with tier grouping.
- Zoom controls (mouse wheel, buttons, keyboard).
- Domain filtering (Civilian/Military tabs).
- Prerequisite connections (toggleable).
- VS Code theme integration.
*/

/* TODO:
- Fix the layout alignments and offsets.
- Flip the arrow direction to point at the prerequisite node instead of away from it. (debatable)
- The name "tier" is inappropriatly used for "field" groupings in some places. Refactor to use "field" instead of "tier" where applicable.
- Add scalable architecture for research subject icons/images and other resources. (CSP complexity)
- Add stats for subject counts per total\domain\tier.
- Add background grid with column\row divisions, label cells with coordinates.
- Add ALL domain view option for cross-domain prerequisites.
- Add option to only show prerequisite connections for hovered nodes.
*/

/**
 * The top-level orchestrator class for the research visualizer.
 */
export class ResearchPresenter {
    /** The VSCode API object provided to the webview. */
    private readonly vscode: VSCode;

    private readonly model: ResearchModel;

    private readonly toolbar: ToolbarView;
    private readonly display: ResearchView;

    /**
     * Instantiates a new class instance with the given VSCode API object.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCode) {
        Log.info("<ResearchPresenter::constructor> Instantiating");
        this.vscode = vscode;
        this.model = new ResearchModel();

        this.toolbar = new ToolbarView();
        this.toolbar.player.select.addEventListener("change", (e) => this.player_OnChange(e));
        this.toolbar.domain.civilian.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.toolbar.domain.military.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.toolbar.connections.checkbox.addEventListener("change", (e) => this.nodeConnection_OnChange(e));
        document.body.appendChild(this.toolbar);

        this.display = new ResearchView(this.model);
        this.display.addEventListener("click", (e) => this.node_OnClick(e));
        document.body.appendChild(this.display);
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
                this.display.replaceChildren(MessageText.create("Select a player to view research tree."));
            } else {
                this.toolbar.player.populate([]);
                this.display.replaceChildren(MessageText.create("Failed to populate player list."));
            }
        } else {
            this.display.replaceChildren(MessageText.create("No player data is available."));
        }
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
        this.display.nodeConnectionsEnabled = target.checked;
        this.display.render(this.model.subjectsFiltered);
    }

    private node_OnClick(e: PointerEvent): void {
        const target: HTMLElement = e.target as HTMLElement;
        const node: HTMLElement | null = target.closest(`.${ResearchSubject.SUBJECT_NODE_CLASS}`) as HTMLElement;
        if (node) {
            const nodeId: string | undefined = node.dataset.id;
            const message: IWebViewMessage = { type: ViewResponse.FILE_OPEN, identifier: nodeId };
            this.vscode.postMessage(message);
        }
    }

    private player_updateSubjects(subjects: IResearchSubject[]): void {
        this.model.setSubjects(subjects);

        // Show domain tabs if we have data.
        this.toolbar.domain.setVisible(subjects.length > 0);
        this.display.render(this.model.subjectsFiltered);
    }
}
