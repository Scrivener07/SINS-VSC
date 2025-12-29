import { IResearchSubject } from "@soase/shared";
import { DataController } from "./data";
import { Layout, MessageText } from "./dom-layout";
import { ConnectionRenderer } from "./research-connection";
import { IFieldGroup, FieldLayout, FieldGrouping, Field } from "./research-field";
import { GridLayout } from "./research-grid";
import { ZoomController } from "./zoom";

/** The main container element for the research tree. */
export class ResearchView extends HTMLDivElement {
    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-viewer";

    private readonly dataController: DataController;
    private readonly zoomController: ZoomController;

    public nodeConnectionsEnabled: boolean = false;

    constructor(dataController: DataController) {
        super();
        this.id = ResearchView.CONTAINER_ID;

        this.dataController = dataController;
        this.zoomController = new ZoomController(this);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("sins-research-viewer", ResearchView, options);
    }

    public render(data: IResearchSubject[]): void {
        if (data.length === 0) {
            this.replaceChildren(MessageText.create(`No ${this.dataController.domainSelection} research data available`));
            return;
        }

        // Group the research subjects by field.
        const fields: IFieldGroup[] = FieldGrouping.groupByField(data);

        // Calculate the vertical offsets for each field group.
        FieldLayout.calculateFieldOffsets(fields);

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
                ${Field.renderFieldGroups(fields)}
                ${ConnectionRenderer.renderConnections(data, fields, this.nodeConnectionsEnabled)}
            </svg>
        `;

        this.innerHTML = svg;
        this.zoomController.setZoom(this.zoomController.zoomLevel);
    }
}
