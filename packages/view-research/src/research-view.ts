import { IResearchSubject } from "@soase/shared";
import { Layout, MessageText } from "./layout";
import { ConnectionRenderer } from "./research-render-connection";
import { IFieldGroup, FieldLayout, FieldGrouping, Field } from "./research-render-field";
import { GridLayout } from "./research-render-grid";
import { ZoomController } from "./zoom";
import { ResearchModel } from "./research-model";
import { SVG } from "./dom/svg";

/** The main container element for the research tree. */
export class ResearchView extends HTMLDivElement {
    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-viewer";

    private readonly model: ResearchModel;
    private readonly zoomController: ZoomController;

    private readonly viewport: SVGSVGElement;

    constructor(dataController: ResearchModel) {
        super();
        this.id = ResearchView.CONTAINER_ID;

        this.model = dataController;
        this.zoomController = new ZoomController(this);

        this.viewport = SVG.create("svg");
        this.appendChild(this.viewport);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("sins-research-viewer", ResearchView, options);
    }

    public render(data: IResearchSubject[]): void {
        if (data.length === 0) {
            this.viewport.innerHTML = "";
            this.model.setStatusMessage(`No ${this.model.domainSelection} research data available.`);
            return;
        } else {
            this.model.setStatusMessage(null);
        }

        // Group the research subjects by field.
        const fields: IFieldGroup[] = FieldGrouping.groupByField(data);

        // Calculate the vertical offsets for each field group.
        FieldLayout.calculateFieldOffsets(fields);

        // Use fixed width based on MAX_COLUMN_COUNT.
        const maxWidth: number = GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH;

        // Calculate the base dimensions needed for the SVG.
        const maxRows: number = Math.max(...fields.map((group) => group.maxRow), 2) + 1;
        const totalHeight: number = fields.length * (FieldLayout.FIELD_LABEL_HEIGHT + maxRows * Layout.CELL_HEIGHT + FieldLayout.FIELD_SPACING);

        // Caculate the final SVG dimensions after padding.
        const width: number = maxWidth + Layout.PADDING * 2;
        const height: number = totalHeight + Layout.PADDING * 2;

        // Update viewport dimensions.
        this.viewport.setAttribute("width", width.toString());
        this.viewport.setAttribute("height", height.toString());
        this.viewport.style.display = "block";

        // Generate the SVG content.
        const content: string = `
            ${Field.renderFieldGroups(fields)}
            ${ConnectionRenderer.renderConnections(data, fields, this.model.nodeConnectionsEnabled)}
        `;

        // Update viewport content
        this.viewport.innerHTML = content;

        // Reapply zoom level after rendering.
        this.zoomController.setZoom(this.zoomController.zoomLevel);
    }
}
