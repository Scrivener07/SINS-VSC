import { IResearchSubject } from "@soase/shared";
import { Layout } from "./layout";
import { ConnectionRenderer } from "./research-render-connection";
import { IField, FieldLayout, FieldGrouping, Field } from "./research-render-field";
import { GridLayout } from "./research-render-grid";
import { ZoomController } from "./zoom";
import { ResearchModel } from "./research-model";
import { SVG } from "./dom/svg";
import { Dimension } from "./shared";

/** The main container element for the research tree. */
export class ResearchView extends HTMLDivElement {
    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-viewer";

    private readonly model: ResearchModel;
    private readonly zoom: ZoomController;

    private readonly viewport: SVGSVGElement;

    constructor(model: ResearchModel) {
        super();
        this.id = ResearchView.CONTAINER_ID;

        this.model = model;
        this.zoom = new ZoomController(this);

        this.viewport = SVG.create("svg");
        this.viewport.style.display = "block";
        this.appendChild(this.viewport);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("sins-research-viewer", ResearchView, options);
    }

    public render(subjects: IResearchSubject[]): void {
        if (subjects.length === 0) {
            this.viewport.innerHTML = "";
            this.model.setStatusMessage(`No ${this.model.domainSelection} research data available.`);
            return;
        } else {
            this.model.setStatusMessage(null);
        }

        // TODO: Clears the viewport entirely for now. Optimize to reuse existing elements.
        this.viewport.innerHTML = "";

        // Group the research subjects by field.
        const fields: IField[] = FieldGrouping.groupByField(subjects);

        // Calculate the vertical offsets for each field group.
        FieldLayout.verticalOffsets(fields);

        // Determine and update the SVG viewport dimensions.
        const dimension: Dimension = ResearchView.getDimensions(fields);
        this.viewport.setAttribute("width", dimension.width.toString());
        this.viewport.setAttribute("height", dimension.height.toString());

        // Generate the SVG field content.
        const fieldElements: SVGGElement[] = Field.create_each(fields);
        this.viewport.append(...fieldElements);

        // Generate the SVG connections content. (still using innerHTML for now)
        this.viewport.innerHTML += ConnectionRenderer.renderConnections(subjects, fields, this.model.nodeConnectionsEnabled);

        // Reapply zoom level after rendering.
        this.zoom.setZoom(this.zoom.zoomLevel);
    }

    private static getDimensions(fields: IField[]): Dimension {
        // Use fixed width based on the grid maximum columns.
        const maxWidth: number = GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH;

        // Calculate the base dimensions needed for the SVG.
        // TODO: See `FieldLayout.verticalOffsets` for potential DRY violation.
        const maxRows: number = Math.max(...fields.map((field) => field.maxRow), 2) + 1;
        const totalHeight: number = fields.length * (FieldLayout.FIELD_LABEL_HEIGHT + maxRows * Layout.CELL_HEIGHT + FieldLayout.FIELD_SPACING);

        // Caculate the final SVG dimensions after padding.
        const width: number = maxWidth + Layout.PADDING * 2;
        const height: number = totalHeight + Layout.PADDING * 2;
        return { width, height };
    }
}
