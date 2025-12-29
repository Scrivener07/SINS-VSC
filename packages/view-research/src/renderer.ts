import { VSCode } from "./vscode";
import { Log } from "./log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject } from "@soase/shared";
import { DataController } from "./data";
import { DomainSelect, Header } from "./dom-header";
import { ResearchContainer, ResearchView } from "./dom-container";

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
 * Renders the research tree.
 */
export class ResearchRenderer {
    /** The VSCode API object provided to the webview. */
    private readonly vscode: VSCode;

    private readonly dataController: DataController;

    private readonly header: Header;
    private readonly container: ResearchContainer;

    /** The currently selected player ID. */
    private playerSelection: string | null = null;

    /**
     * Creates a new ResearchRenderer.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCode) {
        Log.info("<ResearchRenderer::constructor> Renderer instantiated");
        this.vscode = vscode;
        this.dataController = new DataController();

        this.header = new Header();
        this.header.player.select.addEventListener("change", (e) => this.player_OnChange(e));
        this.header.domain.civilian.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.header.domain.military.addEventListener("click", (e) => this.domainTab_OnClick(e));
        this.header.connections.checkbox.addEventListener("change", (e) => this.nodeConnection_OnChange(e));
        document.body.appendChild(this.header);

        this.container = new ResearchContainer(this.dataController);
        this.container.addEventListener("click", (e) => this.node_OnClick(e));
        document.body.appendChild(this.container);
    }

    public onMessage(message: any): void {
        Log.info("<ResearchRenderer::onMessage> Message received", message);
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
                Log.warn(`<ResearchRenderer::onMessage> Unhandled message type: ${message.type}`, message);
        }
    }

    private player_updateOptions(players: string[]): void {
        if (this.header.player.populate(players)) {
            this.container.replaceChildren(ResearchRenderer.createMessageText("Select a player to view research tree"));
        } else {
            this.container.replaceChildren(ResearchRenderer.createMessageText("No player data available"));
        }
    }

    private static createMessageText(text: string): HTMLDivElement {
        const division: HTMLDivElement = document.createElement("div");
        division.style.padding = "20px";
        division.textContent = text;
        return division;
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

        if (!domain || domain === this.dataController.domainSelection) {
            return;
        }

        // Update the active tab styling.
        this.header.domain.setActive(target);

        // Update the selected domain and re-render.
        this.dataController.domainSelection = domain;
        this.filterAndRender();
    }

    private nodeConnection_OnChange(e: Event): void {
        const target = e.target as HTMLInputElement;
        this.container.view.nodeConnectionsEnabled = target.checked;
        this.container.view.render(this.dataController.dataFiltered);
    }

    private node_OnClick(e: PointerEvent): void {
        const target: HTMLElement = e.target as HTMLElement;
        const node: HTMLElement | null = target.closest(".research-node") as HTMLElement;
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
        this.dataController.doFilter();
        this.container.view.render(this.dataController.dataFiltered);
    }

    private setData(data: IResearchSubject[]): void {
        this.dataController.data = data;

        // Show domain tabs if we have data.
        this.header.domain.setVisible(data.length > 0);

        this.filterAndRender();
    }
}
