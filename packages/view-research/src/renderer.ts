import { VSCode } from "./vscode";
import { Log } from "./log";
import { IWebViewMessage, ViewRequest, ViewResponse, IResearchSubject, Point } from "@soase/shared";

/* Features:
- Research tree visualizer with tier grouping.
- Zoom controls (mouse wheel, buttons, keyboard).
- Domain filtering (Civilian/Military tabs).
- Prerequisite connections (toggleable).
- VS Code theme integration.
- Scalable architecture ready for images and more features.
*/

/* TODO:
- Add research subject icons/images.
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

    /** The current zoom level.*/
    private zoomLevel: number = ResearchRenderer.ZOOM_RESET;

    /** The ID of the zoom level display element. */
    private static readonly ZOOM_LEVEL_ID: string = "zoom-level";

    /** Default zoom level. (1.0 = 100%) */
    private static readonly ZOOM_RESET: number = 1.0;

    /** Minimum zoom level. */
    private static readonly ZOOM_MIN: number = 0.25;

    /** Maximum zoom level. */
    private static readonly ZOOM_MAX: number = 2.0;

    /** Zoom step per button click. */
    private static readonly ZOOM_STEP: number = 0.05;

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
        this.setupZoomControls();
    }

    private setupPlayerSelector(): void {
        const select: HTMLSelectElement | null = document.getElementById(ResearchRenderer.PLAYER_SELECTOR_ID) as HTMLSelectElement;
        if (select) {
            select.addEventListener("change", (e) => this.player_OnChange(e));
        }
    }

    private setupDomainTabs(): void {
        const tabs: NodeListOf<Element> = document.querySelectorAll(".domain-tab");
        for (const tab of tabs) {
            tab.addEventListener("click", (e) => this.domainTab_OnClick(e));
        }
    }

    private setupNodeConnectionSelector(): void {
        const select: HTMLSelectElement | null = document.getElementById(ResearchRenderer.NODE_CONNECTION_SELECTOR_ID) as HTMLSelectElement;
        if (select) {
            select.addEventListener("change", (e) => this.nodeConnection_OnChange(e));
        }
    }

    private setupZoomControls(): void {
        const zoomInButton: HTMLElement | null = document.getElementById("zoom-in");
        const zoomOutButton: HTMLElement | null = document.getElementById("zoom-out");
        const zoomResetButton: HTMLElement | null = document.getElementById("zoom-reset");

        if (zoomInButton) {
            zoomInButton.addEventListener("click", () => this.zoomIn());
        }
        if (zoomOutButton) {
            zoomOutButton.addEventListener("click", () => this.zoomOut());
        }
        if (zoomResetButton) {
            zoomResetButton.addEventListener("click", () => this.zoomReset());
        }

        const wheelOptions: AddEventListenerOptions = { passive: false };
        this.container.addEventListener("wheel", (e) => this.container_OnWheel(e), wheelOptions);
        document.addEventListener("keydown", (e) => this.document_OnKeyDown(e));
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
            default:
                Log.warn(`<ResearchRenderer::onMessage> Unhandled message type: ${message.type}`);
        }
    }

    private container_OnWheel(e: WheelEvent): void {
        // Check for the Ctrl key (Cmd on Mac).
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }

        e.preventDefault();

        // Determine the zoom direction.
        let delta: number;
        if (e.deltaY > 0) {
            delta = -ResearchRenderer.ZOOM_STEP;
        } else {
            delta = ResearchRenderer.ZOOM_STEP;
        }
        this.setZoom(this.zoomLevel + delta);
    }

    private document_OnKeyDown(e: KeyboardEvent): void {
        // Check for the Ctrl/Cmd key.
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }

        switch (e.key) {
            case "+":
            case "=":
                e.preventDefault();
                this.zoomIn();
                break;
            case "-":
                e.preventDefault();
                this.zoomOut();
                break;
            case "0":
                e.preventDefault();
                this.zoomReset();
                break;
        }
    }

    private zoomIn(): void {
        this.setZoom(this.zoomLevel + ResearchRenderer.ZOOM_STEP);
    }

    private zoomOut(): void {
        this.setZoom(this.zoomLevel - ResearchRenderer.ZOOM_STEP);
    }

    private zoomReset(): void {
        this.setZoom(ResearchRenderer.ZOOM_RESET);
    }

    private setZoom(level: number): void {
        // Clamp the zoom level.
        this.zoomLevel = Math.max(ResearchRenderer.ZOOM_MIN, Math.min(ResearchRenderer.ZOOM_MAX, level));

        // Apply the zoom transform to the SVG element.
        const svg: SVGElement | null = this.container.querySelector("svg");
        if (svg) {
            svg.style.transform = `scale(${this.zoomLevel})`;
        }

        // Update the zoom level display.
        const zoomDisplay: HTMLElement | null = document.getElementById(ResearchRenderer.ZOOM_LEVEL_ID);
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }

        Log.info(`<ResearchRenderer::setZoom> Zoom level: ${zoomDisplay.textContent}`);
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

        // Update the active tab styling.
        const tabs: NodeListOf<Element> = document.querySelectorAll(".domain-tab");
        for (const tab of tabs) {
            tab.classList.remove("active");
        }
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

        // Build the player options HTML.
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
        // Use bind() to capture `this` context.
        this.dataFiltered = this.data.filter(this.filterByDomain.bind(this));
        console.log(`<ResearchRenderer::filterAndRender> Rendering ${this.dataFiltered.length} nodes for domain: ${this.domainSelection}`);
        this.render(this.dataFiltered);
    }

    /**
     * Filters research subjects by the selected domain.
     * @param node The research subject node.
     * @returns True if the node matches the selected domain.
     */
    private filterByDomain(node: IResearchSubject): boolean {
        const nodeDomain: string = node.field?.toLowerCase() || "";
        return nodeDomain.includes(this.domainSelection);
    }

    private render(data: IResearchSubject[]): void {
        if (data.length === 0) {
            this.container.innerHTML = `<div style="padding: 20px;">No ${this.domainSelection} research data available</div>`;
            return;
        }

        // Group the research subjects by tier.
        const tierGroups: ITierGroup[] = this.groupByTier(data);

        // Calculate the vertical offsets for each tier group.
        this.calculateTierOffsets(tierGroups);

        // Calculate the total dimensions needed for the SVG.
        const maxWidth: number = Math.max(...tierGroups.map((group) => (group.maxColumn + 1) * this.CELL_WIDTH));
        const totalHeight: number =
            tierGroups[tierGroups.length - 1].verticalOffset + (tierGroups[tierGroups.length - 1].maxRow + 1) * this.CELL_HEIGHT;

        // Add extra vertical space for labels.
        const heightExtra: number = tierGroups.length * 60;

        // Caculate the final SVG dimensions.
        const width: number = maxWidth + this.PADDING * 2;
        const height: number = totalHeight + this.PADDING * 2 + heightExtra;

        // Create SVG with tier groups and connections.
        const svg: string = `
            <svg width="${width}" height="${height}" style="display: block;">
                ${this.renderTierGroups(tierGroups)}
                ${this.renderConnections(data, tierGroups, this.nodeConnectionsEnabled)}
            </svg>
        `;

        this.container.innerHTML = svg;
        this.setZoom(this.zoomLevel);
    }

    /**
     * Groups research subjects by their tier field.
     */
    private groupByTier(data: IResearchSubject[]): ITierGroup[] {
        const tierMap: Map<string, IResearchSubject[]> = new Map();

        // Group the subjects by tier.
        for (const subject of data) {
            const tierName: string = subject.field || "unknown";
            if (!tierMap.has(tierName)) {
                tierMap.set(tierName, []);
            }
            tierMap.get(tierName)!.push(subject);
        }

        // Convert to ITierGroup array.
        const groups: ITierGroup[] = [];
        for (const [tierName, subjects] of tierMap.entries()) {
            // Find the maximum column and row for layout calculations.
            const maxColumn: number = Math.max(...subjects.map((subject) => subject.field_coord[0]));
            const maxRow: number = Math.max(...subjects.map((subject) => subject.field_coord[1]));

            const tierGroup: ITierGroup = {
                tierName: tierName,
                displayName: ResearchRenderer.extractTierDisplayName(tierName),
                subjects: subjects,
                maxColumn: maxColumn,
                maxRow: maxRow,
                verticalOffset: 0 // This will be calculated later.
            };
            groups.push(tierGroup);
        }

        // Sort by tier number extracted from research subjects.
        groups.sort(this.compareTierGroups.bind(this));
        return groups;
    }

    /**
     * Compares two tier groups by their minimum tier number.
     * @param group This tier group.
     * @param other The other tier group.
     * @returns Negative if `group_a < group_b`, positive if `group_a > group_b`, zero if equal.
     */
    private compareTierGroups(group: ITierGroup, other: ITierGroup): number {
        const tierA: number = Math.min(...group.subjects.map((subject) => subject.tier));
        const tierB: number = Math.min(...other.subjects.map((subject) => subject.tier));
        return tierA - tierB;
    }

    /**
     * Extracts the display name from a tier field name.
     * Example: "Civilian_industry" -> "Industry"
     *
     * TODO: This should be done by looking up the field name in a localization file.
     */
    private static extractTierDisplayName(tierName: string): string {
        // Remove domain prefix. (Civilian_ or Military_)
        const withoutPrefix: string = tierName.replace(/^(Civilian|Military)_/i, "");

        // Capitalize first letter.
        return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
    }

    /**
     * Calculates vertical offsets for each tier group so they don't overlap.
     */
    private calculateTierOffsets(tierGroups: ITierGroup[]): void {
        const TIER_LABEL_HEIGHT: number = 40;
        const TIER_SPACING: number = 40;

        let currentOffset: number = 0;

        for (const group of tierGroups) {
            group.verticalOffset = currentOffset;

            // Next group starts after this group's height + label + spacing.
            const groupHeight: number = (group.maxRow + 1) * this.CELL_HEIGHT;
            currentOffset += TIER_LABEL_HEIGHT + groupHeight + TIER_SPACING;
        }
    }

    /**
     * Renders all tier groups with labels and subjects.
     */
    private renderTierGroups(tierGroups: ITierGroup[]): string {
        const TIER_LABEL_HEIGHT: number = 40;

        const groupsHtml: string[] = tierGroups.map((group) => {
            const labelY: number = group.verticalOffset + this.PADDING;
            const nodesY: number = labelY + TIER_LABEL_HEIGHT;
            return `
                <!-- Tier Label -->
                <text
                    x="${this.PADDING}"
                    y="${labelY + 25}"
                    font-size="18"
                    font-weight="bold"
                    fill="var(--vscode-foreground)"
                >
                    ${group.displayName}
                </text>

                <!-- Tier Separator Line -->
                <line
                    x1="${this.PADDING}"
                    y1="${labelY + 30}"
                    x2="${(group.maxColumn + 1) * this.CELL_WIDTH + this.PADDING}"
                    y2="${labelY + 30}"
                    stroke="var(--vscode-panel-border)"
                    stroke-width="1"
                />

                <!-- Research Nodes -->
                ${this.renderNodesForTier(group, nodesY)}
            `;
        });

        return groupsHtml.join("");
    }

    /**
     * Renders research nodes for a specific tier group.
     */
    private renderNodesForTier(group: ITierGroup, offsetY: number): string {
        const nodes: string[] = group.subjects.map((node) => this.renderNode(node, offsetY, group));
        return nodes.join("");
    }

    /**
     * Renders prerequisite connections between nodes, accounting for tier offsets.
     */
    private renderConnections(data: IResearchSubject[], tierGroups: ITierGroup[], enabled: boolean): string {
        if (!enabled) {
            return "";
        }

        const connections: string[] = [];
        const nodeMap: Map<string, IResearchSubject> = new Map(data.map((subject) => [subject.id, subject]));

        // Build a map of node ID to tier offset
        const tierOffsetMap: Map<string, number> = new Map();
        const TIER_LABEL_HEIGHT: number = 40;

        for (const group of tierGroups) {
            const offsetY: number = group.verticalOffset + this.PADDING + TIER_LABEL_HEIGHT;
            for (const subject of group.subjects) {
                tierOffsetMap.set(subject.id, offsetY);
            }
        }

        const nodeWidth: number = this.CELL_WIDTH - 20;
        const nodeHeight: number = this.CELL_HEIGHT - 20;

        for (const node of data) {
            if (!node.prerequisites || node.prerequisites.length === 0) {
                continue;
            }

            const [toColumn, toRow]: Point = node.field_coord;
            const toOffsetY: number = tierOffsetMap.get(node.id) || 0;
            const toCenterX: number = toColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
            const toCenterY: number = toRow * this.CELL_HEIGHT + toOffsetY + this.CELL_HEIGHT / 2;

            for (const prerequisite_group of node.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    const prerequisite_node: IResearchSubject | undefined = nodeMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        Log.warn(`<ResearchRenderer::renderConnections> Prerequisite node not found: ${prerequisite_id}`);
                        continue;
                    }

                    const [fromColumn, fromRow]: Point = prerequisite_node.field_coord;
                    const fromOffsetY: number = tierOffsetMap.get(prerequisite_id) || 0;
                    const fromCenterX: number = fromColumn * this.CELL_WIDTH + this.PADDING + this.CELL_WIDTH / 2;
                    const fromCenterY: number = fromRow * this.CELL_HEIGHT + fromOffsetY + this.CELL_HEIGHT / 2;

                    // Calculate the distance-delta and angle.
                    const distanceX: number = toCenterX - fromCenterX;
                    const distanceY: number = toCenterY - fromCenterY;
                    const angle: number = Math.atan2(distanceY, distanceX);

                    const fromEdge = ResearchRenderer.getRectangleEdgePoint(fromCenterX, fromCenterY, nodeWidth - 20, nodeHeight - 20, angle);
                    const toEdge = ResearchRenderer.getRectangleEdgePoint(toCenterX, toCenterY, nodeWidth - 20, nodeHeight - 20, angle + Math.PI);

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

    // private renderNodes(data: IResearchSubject[]): string {
    //     const nodes: string[] = data.map((node) => this.renderNode(node));
    //     return nodes.join("");
    // }

    /**
     * Renders a single research node at its tier-relative position.
     */
    private renderNode(node: IResearchSubject, tierOffsetY: number, group: ITierGroup): string {
        const [column, row]: Point = node.field_coord;
        const x: number = column * this.CELL_WIDTH + this.PADDING;
        const y: number = row * this.CELL_HEIGHT + tierOffsetY;

        const nodeWidth: number = this.CELL_WIDTH - 20;
        const nodeHeight: number = this.CELL_HEIGHT - 20;

        // TODO: Posibly use this instead of group.displayName
        // const fieldDisplayName: string = ResearchRenderer.extractTierDisplayName(node.field || "unknown");

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
                <div class="research-field">${group.displayName}</div>
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

/**
 * Represents a grouped tier of research subjects.
 */
interface ITierGroup {
    /** The tier field name. (`Civilian_industry`) */
    tierName: string;

    /** The display name. (`Industry`) */
    displayName: string;

    /** Research subjects in this tier. */
    subjects: IResearchSubject[];

    /** Maximum column coordinate in this tier. */
    maxColumn: number;

    /** Maximum row coordinate in this tier. */
    maxRow: number;

    /** Vertical offset for rendering (calculated). */
    verticalOffset: number;
}
