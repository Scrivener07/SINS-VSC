import { VSCodeApi } from "./vscode";
import { IWebViewMessage, ViewRequest, ViewResponse } from "@soase/shared";
import { ResearchNode } from "./data";

/**
 * Renders the research tree.
 */
export class ResearchRenderer {
    /** The VSCode API object provided to the webview. */
    private vscode: VSCodeApi;

    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-tree-container";

    /** The main container element for the research tree. */
    private container: HTMLElement;

    /** The research data to render. */
    private data: ResearchNode[] = [];

    /** The width of each research node cell. */
    private readonly CELL_WIDTH: number = 180;

    /** The height of each research node cell. */
    private readonly CELL_HEIGHT: number = 120;

    /** The padding around the research tree. */
    private readonly PADDING: number = 20;

    /**
     * Creates a new ResearchRenderer.
     * @param containerId The ID of the container element.
     * @param vscode The VSCode API object.
     */
    constructor(vscode: VSCodeApi) {
        this.vscode = vscode;
        this.container = document.getElementById(ResearchRenderer.CONTAINER_ID)!;
        this.container.addEventListener("click", (e) => this.onClick(e));

        // Listen for player selection changes.
        this.setupPlayerSelector();
    }

    public onMessage(message: any): void {
        switch (message.type) {
            case ViewRequest.UPDATE:
                this.render(message.data);
                break;
            case ViewRequest.PLAYER_LIST:
                this.renderPlayerSelector(message.data);
                break;
            case ViewResponse.UPDATE_RESEARCH:
                this.render(message.data);
                break;

            case ViewRequest.REFRESH:
                this.refresh();
                break;

            default:
                console.warn(`<ResearchRenderer::onMessage> Unhandled message type: ${message.type}`);
        }
    }

    private onClick(e: PointerEvent): void {
        const target: HTMLElement = e.target as HTMLElement;
        const node: HTMLElement | null = target.closest(".research-node") as HTMLElement;
        if (node) {
            const nodeId: string | undefined = node.dataset.id;
            const message: IWebViewMessage = { type: ViewResponse.FILE_OPEN, identifier: nodeId };
            this.vscode.postMessage(message);
        }
    }

    /** The ID of the player selector element. */
    private static readonly PLAYER_SELECTOR_ID: string = "player-selector";

    /** The currently selected player ID. */
    private selectedPlayerId: string | null = null;

    private setupPlayerSelector(): void {
        const selector = document.getElementById(ResearchRenderer.PLAYER_SELECTOR_ID) as HTMLSelectElement;
        if (selector) {
            selector.addEventListener("change", (e) => this.onPlayerChange(e));
        }
    }

    private onPlayerChange(e: Event): void {
        const target = e.target as HTMLSelectElement;
        this.selectedPlayerId = target.value;

        if (this.selectedPlayerId) {
            // Request research data for selected player.
            const message: IWebViewMessage = {
                type: ViewResponse.PLAYER_SELECT,
                identifier: this.selectedPlayerId
            };
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

        // Build options HTML
        const options: string[] = [
            '<option value="">Select a player...</option>',
            ...players.map((playerId) => `<option value="${playerId}">${playerId}</option>`)
        ];

        selector.innerHTML = options.join("");
        selector.disabled = false;

        // Clear the research container
        this.container.innerHTML = '<div style="padding: 20px;">Select a player to view research tree</div>';
    }

    private refresh(): void {
        const message: IWebViewMessage = { type: ViewResponse.DATA_REQUEST };
        this.vscode.postMessage(message);
    }

    private render(data: ResearchNode[]): void {
        this.data = data;
        if (data.length === 0) {
            this.container.innerHTML = '<div style="padding: 20px;">No research data available</div>';
            return;
        }

        // Calculate grid dimensions.
        const maxColumn: number = Math.max(...data.map((column) => column.field_coord[0]));
        const maxRow: number = Math.max(...data.map((row) => row.field_coord[1]));

        const width: number = (maxColumn + 1) * this.CELL_WIDTH + this.PADDING * 2;
        const height: number = (maxRow + 1) * this.CELL_HEIGHT + this.PADDING * 2;

        // Create the SVG container.
        const svg: string = `
            <svg width="${width}" height="${height}" style="display: block;">
                ${this.renderConnections(data)}
                ${this.renderNodes(data)}
            </svg>
        `;

        this.container.innerHTML = svg;
    }

    private renderConnections(data: ResearchNode[]): string {
        const connections: string[] = [];
        const nodeMap: Map<string, ResearchNode> = new Map(data.map((nodeEntry) => [nodeEntry.id, nodeEntry]));

        for (const node of data) {
            if (!node.prerequisites || node.prerequisites.length === 0) {
                continue;
            }

            const [toColumn, toRow]: [number, number] = node.field_coord;
            const toX: number = toColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
            const toY: number = toRow * this.CELL_HEIGHT + this.PADDING + this.CELL_HEIGHT / 2;

            // Prerequisites are in OR groups (outer array is AND, inner array is OR).
            for (const prerequisite_group of node.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    const prerequisite_node = nodeMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        continue;
                    }

                    const [fromColumn, fromRow]: [number, number] = prerequisite_node.field_coord;
                    const fromX: number = fromColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
                    const fromY: number = fromRow * this.CELL_HEIGHT + this.PADDING + this.CELL_HEIGHT / 2;

                    // Draw line with arrow.
                    const line: string = `
                        <line
                            x1="${fromX}"
                            y1="${fromY}"
                            x2="${toX}"
                            y2="${toY}"
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

    private renderNodes(data: ResearchNode[]): string {
        const nodes: string[] = data.map((node) => this.renderNode(node));
        return nodes.join("");
    }

    private renderNode(node: ResearchNode): string {
        const [column, row]: [number, number] = node.field_coord;
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
}
