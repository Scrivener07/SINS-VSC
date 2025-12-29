import { IResearchSubject } from "@soase/shared";
import { DataController } from "./data";
import { Layout } from "./dom-layout";
import { ConnectionRenderer } from "./research-connection";
import { IFieldGroup, FieldLayout } from "./research-field";
import { GridRenderer, GridLayout } from "./research-grid";
import { ResearchSubject } from "./research-subject";
import { ZoomController } from "./zoom";

/** The main container element for the research tree. */
export class ResearchContainer extends HTMLDivElement {
    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-tree-container";

    public readonly view: ResearchView;

    constructor(dataController: DataController) {
        super();
        this.id = ResearchContainer.CONTAINER_ID;

        this.view = new ResearchView(this, dataController);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("research-container", ResearchContainer, options);
    }
}

export class ResearchView {
    /** The main container element for the research tree. */
    private readonly container: ResearchContainer;

    private readonly dataController: DataController;

    private readonly zoomController: ZoomController;
    private readonly connectionRenderer: ConnectionRenderer;
    private readonly gridRenderer: GridRenderer;

    public nodeConnectionsEnabled: boolean = false;

    constructor(container: ResearchContainer, dataController: DataController) {
        this.container = container;
        this.dataController = dataController;
        this.zoomController = new ZoomController(this.container);
        this.gridRenderer = new GridRenderer();
        this.connectionRenderer = new ConnectionRenderer();
    }

    public render(data: IResearchSubject[]): void {
        if (data.length === 0) {
            this.container.innerHTML = `<div style="padding: 20px;">No ${this.dataController.domainSelection} research data available</div>`;
            return;
        }

        // Group the research subjects by field.
        const fields: IFieldGroup[] = ResearchView.groupByField(data);

        // Calculate the vertical offsets for each field group.
        // TODO: This should have side affects, but doesnt.
        ResearchView.calculateFieldOffsets(fields);

        // Use fixed width based on MAX_COLUMN_COUNT
        const maxWidth: number = GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH;

        // Calculate the base dimensions needed for the SVG.
        const maxRows: number = Math.max(...fields.map((group) => group.maxRow), 2) + 1;
        const totalHeight: number = fields.length * (FieldLayout.FIELD_LABEL_HEIGHT + maxRows * Layout.CELL_HEIGHT + FieldLayout.FIELD_SPACING);

        // Caculate the final SVG dimensions after padding.
        const width: number = maxWidth + Layout.PADDING * 2;
        const height: number = totalHeight + Layout.PADDING * 2;

        // Create SVG with field groups and connections.
        const svg: string = `
            <svg width="${width}" height="${height}" style="display: block;">
                ${this.renderFieldGroups(fields)}
                ${this.connectionRenderer.renderConnections(data, fields, this.nodeConnectionsEnabled)}
            </svg>
        `;

        this.container.innerHTML = svg;
        this.zoomController.setZoom(this.zoomController.zoomLevel);
    }

    /**
     * Renders all field groups with labels and subjects.
     */
    private renderFieldGroups(fieldGroups: IFieldGroup[]): string {
        const html_fields: string[] = fieldGroups.map((group) => this.renderFieldGroup(group));
        return html_fields.join("");
    }

    private renderFieldGroup(fieldGroup: IFieldGroup): string {
        const labelY: number = fieldGroup.verticalOffset + Layout.PADDING;
        const nodesY: number = labelY + FieldLayout.FIELD_LABEL_HEIGHT;

        const label_x: number = Layout.PADDING;
        const label_y: number = labelY + 25;

        const seperator_x1: number = Layout.PADDING;
        const seperator_y1: number = labelY + 30;
        const seperator_x2: number = GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH + Layout.PADDING;
        const seperator_y2: number = labelY + 30;

        return `
        <g>
            <!-- Field Label -->
            <text
                x="${label_x}"
                y="${label_y}"
                font-size="18"
                font-weight="bold"
                fill="var(--vscode-foreground)"
            >
                ${fieldGroup.nameDisplay}
            </text>

            <!-- Field Separator Line -->
            <line
                x1="${seperator_x1}"
                y1="${seperator_y1}"
                x2="${seperator_x2}"
                y2="${seperator_y2}"
                stroke="var(--vscode-panel-border)"
                stroke-width="1"
            />

            <!-- Background Grid -->
            ${this.gridRenderer.renderFieldGrid(fieldGroup, fieldGroup.verticalOffset)}

            <!-- Tier Dividers -->
            ${ResearchView.renderTierDividers(fieldGroup, fieldGroup.verticalOffset)}

            <!-- Research Nodes (rendered on top) -->
            ${ResearchView.renderFieldSubjects(fieldGroup, nodesY)}
        </g>
        `;
    }

    /**
     * Calculates vertical offsets for each field group so they don't overlap.
     */
    private static calculateFieldOffsets(fields: IFieldGroup[]): void {
        // Calculate maximum rows needed across all fields.
        // Use the maximum to ensure consistent grid height.
        // Minimum 3 rows (0, 1, 2)
        // TODO: Reconsider using a row minimum after some testing.
        const maxRows: number = Math.max(...fields.map((group) => group.maxRow), 2) + 1;

        // Assign the vertical offsets.
        let offset: number = 0;
        for (const field of fields) {
            field.verticalOffset = offset;

            // Use consistent grid height for all fields
            const fieldHeight: number = maxRows * Layout.CELL_HEIGHT;

            // Next group starts after this group's height + label + spacing.
            offset += FieldLayout.FIELD_LABEL_HEIGHT + fieldHeight + FieldLayout.FIELD_SPACING;
        }
    }

    /**
     * Renders research nodes for a specific field group.
     */
    private static renderFieldSubjects(field: IFieldGroup, offsetY: number): string {
        const subjects: string[] = field.subjects.map((subject) => ResearchSubject.renderSubject(subject, offsetY, field));
        return subjects.join("");
    }

    /**
     * Renders vertical tier divider lines and labels.
     * @param group The field group.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for tier dividers.
     */
    private static renderTierDividers(group: IFieldGroup, offsetY: number): string {
        const dividers: string[] = [];
        const gridStartY: number = offsetY + FieldLayout.FIELD_LABEL_HEIGHT;
        const maxRows: number = Math.max(group.maxRow, 2) + 1;
        const gridHeight: number = maxRows * Layout.CELL_HEIGHT;

        // Render the divider for each tier.
        for (let tier: number = 0; tier <= GridLayout.MAX_TIER_COUNT; tier++) {
            const column: number = tier * GridLayout.PER_TIER_COLUMN_COUNT;
            const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;

            // Create vertical divider line.
            const divider_x1: number = x - 10;
            const divider_y1: number = gridStartY;
            const divider_x2: number = x - 10;
            const divider_y2: number = gridStartY + gridHeight;
            const divider_color: string = "var(--vscode-input-foreground)";
            dividers.push(`
                <line
                    x1="${divider_x1}"
                    y1="${divider_y1}"
                    x2="${divider_x2}"
                    y2="${divider_y2}"
                    stroke="${divider_color}"
                    stroke-width="2"
                    opacity="0.6"
                />
            `);

            // Create tier label, skip the last divider.
            if (tier < GridLayout.MAX_TIER_COUNT) {
                const tierCenterX: number = x + (GridLayout.PER_TIER_COLUMN_COUNT * Layout.CELL_WIDTH) / 2;
                // TODO: Use localized tier names.
                const tierLabel: string = `Tier ${tier}`;
                const labelY: number = gridStartY - 10;
                dividers.push(`
                    <text
                        x="${tierCenterX}"
                        y="${labelY}"
                        text-anchor="middle"
                        font-size="12"
                        font-weight="bold"
                        fill="var(--vscode-descriptionForeground)"
                    >
                        ${tierLabel}
                    </text>
                `);
            }
        }

        return dividers.join("");
    }

    /**
     * Groups research subjects by their research field.
     */
    private static groupByField(subjects: IResearchSubject[]): IFieldGroup[] {
        const fieldMap: Map<string, IResearchSubject[]> = new Map();

        // Group the subjects by their field.
        for (const subject of subjects) {
            const fieldName: string = subject.field || "unknown";
            if (!fieldMap.has(fieldName)) {
                fieldMap.set(fieldName, []);
            }
            fieldMap.get(fieldName)!.push(subject);
        }

        // Convert to IFieldGroup array.
        const fields: IFieldGroup[] = [];
        for (const [fieldName, subjects] of fieldMap.entries()) {
            // Find the maximum column and row for layout calculations.
            const maxColumn: number = Math.max(...subjects.map((subject) => subject.field_coord[0]));
            const maxRow: number = Math.max(...subjects.map((subject) => subject.field_coord[1]));

            const field: IFieldGroup = {
                name: fieldName,
                nameDisplay: ResearchView.extractFieldDisplayName(fieldName),
                subjects: subjects,
                maxColumn: maxColumn,
                maxRow: maxRow,
                verticalOffset: 0 // This will be calculated later.
            };
            fields.push(field);
        }

        // Sort a field's research subjects by tier number.
        fields.sort(ResearchView.compareFieldTiers);
        return fields;
    }

    /**
     * Compares two field groups by their minimum tier number.
     * @param group This field group.
     * @param other The other field group.
     * @returns Negative if `group_a < group_b`, positive if `group_a > group_b`, zero if equal.
     */
    private static compareFieldTiers(group: IFieldGroup, other: IFieldGroup): number {
        const tierA: number = Math.min(...group.subjects.map((subject) => subject.tier));
        const tierB: number = Math.min(...other.subjects.map((subject) => subject.tier));
        return tierA - tierB;
    }

    /**
     * Extracts the display name from a field name.
     * Example: "Civilian_industry" -> "Industry"
     *
     * TODO: This should be done by looking up the field name in a localization file.
     */
    private static extractFieldDisplayName(fieldName: string): string {
        // Remove domain prefix. (Civilian_ or Military_)
        const withoutPrefix: string = fieldName.replace(/^(Civilian|Military)_/i, "");

        // Capitalize first letter.
        return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
    }
}
