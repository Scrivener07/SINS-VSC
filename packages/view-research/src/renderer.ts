import { VSCode } from "./vscode";
import { Log } from "./log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject } from "@soase/shared";
import { DataController as ResearchModel } from "./data";
import { Header as ToolbarView } from "./dom-header";
import { ResearchView } from "./dom-container";
import { MessageText } from "./dom-layout";
import { ResearchSubject } from "./research-subject";

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

    /** The currently selected player ID. */
    private playerSelection: string | null = null;

    /**
     * Instantiates a new class instance with the given VSCode API object.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCode) {
        Log.info("<ResearchPresenter::constructor> Presenter instantiated");
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
            case ViewRequest.UPDATE:
                this.setData(message.data);
                break;
            case ViewRequest.PLAYER_LIST:
                this.player_updateOptions(message.data);
                break;
            case ViewResponse.UPDATE_RESEARCH:
                this.setData(message.data);
                break;
            default:
                Log.warn(`<ResearchPresenter::onMessage> Unhandled message type: ${message.type}`, message);
        }
    }

    private player_updateOptions(players: string[]): void {
        if (this.toolbar.player.populate(players)) {
            this.display.replaceChildren(MessageText.create("Select a player to view research tree"));
        } else {
            this.display.replaceChildren(MessageText.create("No player data available"));
        }
    }

    private player_OnChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        this.playerSelection = target.value;

        if (this.playerSelection) {
            // Request research data for selected player.
            const message: IWebViewMessage = {
                type: ViewResponse.PLAYER_SELECT,
                identifier: this.playerSelection
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
        this.model.domainSelection = domain;
        this.filterAndRender();
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

    /**
     * Filters the data by the selected domain and then renders the research tree.
     */
    private filterAndRender(): void {
        this.model.doFilter();
        this.display.render(this.model.subjectsFiltered);
    }

    private setData(subjects: IResearchSubject[]): void {
        this.model.subjects = subjects;

        // Show domain tabs if we have data.
        this.toolbar.domain.setVisible(subjects.length > 0);

        this.filterAndRender();
    }
}
