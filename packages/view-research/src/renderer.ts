import { VSCode } from "./vscode";
import { Log } from "./log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject, Point } from "@soase/shared";

/**
 * Renders the research tree.
 */
export class ResearchRenderer {
    /** The VSCode API object provided to the webview. */
    private readonly vscode: VSCode;

    /** The full research data for the selected player. */
    private data: IResearchSubject[] = [];

    /** The currently filtered research data to render. */
    private dataFiltered: IResearchSubject[] = [];

    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-tree-container";

    /** The main container element for the research tree. */
    private container: HTMLElement;

    /** The width of each research node cell. */
    private readonly CELL_WIDTH: number = 180;

    /** The height of each research node cell. */
    private readonly CELL_HEIGHT: number = 120;

    /** The padding around the research tree. */
    private readonly PADDING: number = 20;

    /** The ID of the player selector element. */
    private static readonly PLAYER_SELECTOR_ID: string = "player-selector";

    /** The currently selected player ID. */
    private playerSelection: string | null = null;

    /** The ID of the domain tabs container. */
    private static readonly DOMAIN_TABS_ID: string = "domain-tabs";

    /** The currently selected domain (civilian or military). */
    private domainSelection: string = "civilian";

    /** The ID of the node connection selector element. */
    private static readonly NODE_CONNECTION_SELECTOR_ID: string = "node-connection-selector";
    private nodeConnectionsEnabled: boolean = false;

    /**
     * Creates a new ResearchRenderer.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCode) {
        Log.info("<ResearchRenderer::constructor> Renderer instantiated");
        this.vscode = vscode;
        this.container = document.getElementById(ResearchRenderer.CONTAINER_ID)!;
        this.container.addEventListener("click", (e) => this.node_OnClick(e));
        this.setupPlayerSelector();
        this.setupDomainTabs();
        this.setupNodeConnectionSelector();
    }

    private setupPlayerSelector(): void {
        const select: HTMLSelectElement | null = document.getElementById(ResearchRenderer.PLAYER_SELECTOR_ID) as HTMLSelectElement;
        if (select) {
            select.addEventListener("change", (e) => this.player_OnChange(e));
        }
    }

    private setupNodeConnectionSelector(): void {
        const select: HTMLSelectElement | null = document.getElementById(ResearchRenderer.NODE_CONNECTION_SELECTOR_ID) as HTMLSelectElement;
        if (select) {
            select.addEventListener("change", (e) => this.nodeConnection_OnChange(e));
        }
    }

    private setupDomainTabs(): void {
        const tabs: NodeListOf<Element> = document.querySelectorAll(".domain-tab");
        tabs.forEach((tab) => {
            tab.addEventListener("click", (e) => this.domainTab_OnClick(e));
        });
    }

    public onMessage(message: any): void {
        Log.info("<ResearchRenderer::onMessage> Message received", message);
        switch (message.type) {
            case ViewRequest.UPDATE:
                this.setData(message.data);
                break;
            case ViewRequest.PLAYER_LIST:
                this.renderPlayerSelector(message.data);
                break;
            case ViewResponse.UPDATE_RESEARCH:
                this.setData(message.data);
                break;
            case ViewRequest.REFRESH:
                this.refresh(); // unused
                break;
            default:
                Log.warn(`<ResearchRenderer::onMessage> Unhandled message type: ${message.type}`);
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
        const target = e.target as HTMLElement;
        const domain: string = target.dataset.domain;

        if (!domain || domain === this.domainSelection) {
            return;
        }

        // Update active tab styling
        document.querySelectorAll(".domain-tab").forEach((tab) => {
            tab.classList.remove("active");
        });
        target.classList.add("active");

        // Update the selected domain and re-render.
        this.domainSelection = domain;
        this.filterAndRender();
    }

    private nodeConnection_OnChange(e: Event): void {
        const target = e.target as HTMLInputElement;
        this.nodeConnectionsEnabled = target.checked;
        this.render(this.dataFiltered);
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

    private renderPlayerSelector(players: string[]): void {
        const selector = document.getElementById(ResearchRenderer.PLAYER_SELECTOR_ID) as HTMLSelectElement;
        if (!selector) {
            console.error("Player selector element not found");
            return;
        }

        if (players.length === 0) {
            selector.innerHTML = '<option value="">No players available</option>';
            selector.disabled = true;
            this.container.innerHTML = '<div style="padding: 20px;">No player data available</div>';
            return;
        }

        // Build options HTML.
        const options: string[] = [
            '<option value="">Select a player...</option>',
            ...players.map((playerId) => `<option value="${playerId}">${playerId}</option>`)
        ];

        selector.innerHTML = options.join("");
        selector.disabled = false;

        // Clear the research container.
        this.container.innerHTML = '<div style="padding: 20px;">Select a player to view research tree</div>';
    }

    private setData(data: IResearchSubject[]): void {
        this.data = data;

        // Show domain tabs if we have data.
        const tabsContainer = document.getElementById(ResearchRenderer.DOMAIN_TABS_ID);
        if (tabsContainer) {
            if (data.length > 0) {
                tabsContainer.style.display = "block";
            } else {
                tabsContainer.style.display = "none";
            }
        }

        this.filterAndRender();
    }

    /**
     * Filters the data by the selected domain and then renders the research tree.
     */
    private filterAndRender(): void {
        this.dataFiltered = this.data.filter((node) => {
            const nodeDomain: string = node.field?.toLowerCase() || "";
            return nodeDomain.includes(this.domainSelection);
        });

        console.log(`<ResearchRenderer::filterAndRender> Rendering ${this.dataFiltered.length} nodes for domain: ${this.domainSelection}`);

        this.render(this.dataFiltered);
    }

    // UNUSED
    private refresh(): void {
        const message: IWebViewMessage = { type: ViewResponse.DATA_REQUEST };
        this.vscode.postMessage(message);
    }

    private render(data: IResearchSubject[]): void {
        if (data.length === 0) {
            this.container.innerHTML = `<div style="padding: 20px;">No ${this.domainSelection} research data available</div>`;
            return;
        }

        // Calculate grid dimensions.
        const maxColumn: number = Math.max(...data.map((column) => column.field_coord[0]));
        const maxRow: number = Math.max(...data.map((row) => row.field_coord[1]));

        const width: number = (maxColumn + 1) * this.CELL_WIDTH + this.PADDING * 2;
        const height: number = (maxRow + 1) * this.CELL_HEIGHT + this.PADDING * 2;

        // Create the SVG container for use as a canvas.
        const svg: string = `
            <svg width="${width}" height="${height}" style="display: block;">
                ${this.renderNodes(data)}
                ${this.renderConnections(data, this.nodeConnectionsEnabled)}
            </svg>
        `;

        this.container.innerHTML = svg;
    }

    private renderConnections(data: IResearchSubject[], enabled: boolean): string {
        if (!enabled) {
            return "";
        }
        const connections: string[] = [];
        const nodeMap: Map<string, IResearchSubject> = new Map(data.map((nodeEntry) => [nodeEntry.id, nodeEntry]));

        // Node dimensions (matching renderNode)
        const nodeWidth: number = this.CELL_WIDTH - 20;
        const nodeHeight: number = this.CELL_HEIGHT - 20;

        for (const node of data) {
            if (!node.prerequisites || node.prerequisites.length === 0) {
                continue;
            }

            const [toColumn, toRow]: Point = node.field_coord;
            const toCenterX: number = toColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
            const toCenterY: number = toRow * this.CELL_HEIGHT + this.PADDING + this.CELL_HEIGHT / 2;

            // Prerequisites are in OR groups (outer array is AND, inner array is OR).
            for (const prerequisite_group of node.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    const prerequisite_node = nodeMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        continue;
                    }

                    const [fromColumn, fromRow]: Point = prerequisite_node.field_coord;
                    const fromCenterX: number = fromColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
                    const fromCenterY: number = fromRow * this.CELL_HEIGHT + this.PADDING + this.CELL_HEIGHT / 2;

                    // Calculate the angle between nodes
                    const dx: number = toCenterX - fromCenterX;
                    const dy: number = toCenterY - fromCenterY;
                    const angle: number = Math.atan2(dy, dx);

                    // Calculate edge intersection points on the rectangles
                    // For the 'from' node (start point)
                    const fromEdge = ResearchRenderer.getRectangleEdgePoint(
                        fromCenterX,
                        fromCenterY,
                        nodeWidth - 20, // Account for padding
                        nodeHeight - 20,
                        angle
                    );

                    // For the 'to' node (end point)
                    const toEdge = ResearchRenderer.getRectangleEdgePoint(
                        toCenterX,
                        toCenterY,
                        nodeWidth - 20,
                        nodeHeight - 20,
                        angle + Math.PI // Opposite direction
                    );

                    // Draw line with arrow from edge to edge.
                    const line: string = `
                    <line
                        x1="${fromEdge.x}"
                        y1="${fromEdge.y}"
                        x2="${toEdge.x}"
                        y2="${toEdge.y}"
                        stroke="var(--vscode-editorLineNumber-foreground)"
                        stroke-width="2"
                        marker-end="url(#arrowhead)"
                    />
                `;
                    connections.push(line);
                }
            }
        }

        return `
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill="var(--vscode-editorLineNumber-foreground)"
                    />
                </marker>
            </defs>
            ${connections.join("")}
        `;
    }

    private renderNodes(data: IResearchSubject[]): string {
        const nodes: string[] = data.map((node) => this.renderNode(node));
        return nodes.join("");
    }

    private renderNode(node: IResearchSubject): string {
        const [column, row]: Point = node.field_coord;
        const x: number = column * this.CELL_WIDTH + this.PADDING;
        const y: number = row * this.CELL_HEIGHT + this.PADDING;

        const nodeWidth: number = this.CELL_WIDTH - 20;
        const nodeHeight: number = this.CELL_HEIGHT - 20;

        return `
            <foreignObject x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}">
                <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    class="research-node"
                    data-id="${node.id}"
                    style="
                        width: ${nodeWidth - 20}px;
                        height: ${nodeHeight - 20}px;
                        padding: 10px;
                    "
                >
                    <div class="research-tier">Tier ${node.tier}</div>
                    <div class="research-name">${node.name}</div>
                    <div class="research-field">${node.field}</div>
                </div>
            </foreignObject>
        `;
    }

    /**
     * Calculates the point where a line at the given angle intersects the edge of a rectangle.
     * @param centerX The X coordinate of the rectangle center.
     * @param centerY The Y coordinate of the rectangle center.
     * @param width The width of the rectangle.
     * @param height The height of the rectangle.
     * @param angle The angle of the line in radians.
     * @returns The intersection point {x, y}.
     */
    private static getRectangleEdgePoint(centerX: number, centerY: number, width: number, height: number, angle: number): { x: number; y: number } {
        const halfWidth: number = width / 2;
        const halfHeight: number = height / 2;

        // Calculate the absolute angle components.
        const directionX: number = Math.cos(angle);
        const directionY: number = Math.sin(angle);

        // Determine which edge the line intersects.
        const distanceToEdge_Vertical_X: number = halfWidth / Math.abs(directionX);
        const distanceToEdge_Horizontal_Y: number = halfHeight / Math.abs(directionY);

        // Use the smaller distance value (closer intersection).
        const distanceToEdge: number = Math.min(distanceToEdge_Vertical_X, distanceToEdge_Horizontal_Y);

        return {
            x: centerX + distanceToEdge * directionX,
            y: centerY + distanceToEdge * directionY
        };
    }
}
