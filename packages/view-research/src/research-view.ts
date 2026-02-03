import { IResearchSubject } from "@soase/shared";
import { FieldLayout, Layout } from "./layout";
import { ZoomController } from "./zoom";
import { ResearchModel } from "./research-model";
import { SVG } from "./dom/svg";
import { Dimension } from "./shared";
import { FieldGrouping, IField } from "./field";
import { Connection } from "./render/research-connection";
import { Field } from "./render/research-field";

/** The main container element for the research viewport. */
export class ResearchView extends HTMLDivElement {
    /** The ID of the main container element. */
    private static readonly CONTAINER_ID: string = "research-viewer";

    /** The research data model. */
    private readonly model: ResearchModel;

    /** A controller for handling zoom interactions. */
    private readonly zoom: ZoomController;

    /** The primary SVG viewport element. */
    private readonly viewport: SVGSVGElement;

    /** The SVG definitions element for reusable components. */
    private readonly definitions: SVGDefsElement;

    /** The top-level content group for the SVG viewport. */
    private readonly content: SVGGElement;

    constructor(model: ResearchModel) {
        super();
        this.id = ResearchView.CONTAINER_ID;

        this.model = model;
        this.zoom = new ZoomController(this);

        // Create the SVG viewport.
        this.viewport = SVG.create("svg");
        this.viewport.style.display = "block";

        // Create the shared definitions element.
        this.definitions = SVG.create("defs");
        this.viewport.appendChild(this.definitions);

        // Create content group.
        this.content = SVG.create("g");
        this.viewport.appendChild(this.content);

        // Append the viewport to the main DOM.
        this.appendChild(this.viewport);

        // Add reusable definitions for connections.
        this.definitions.append(...Connection.definitions());
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("sins-research-viewer", ResearchView, options);
    }

    public render(subjects: IResearchSubject[]): void {
        if (subjects.length === 0) {
            this.content.innerHTML = "";
            this.model.setStatusMessage(`No ${this.model.domainSelection} research data available.`);
            return;
        } else {
            this.model.setStatusMessage(null);
        }

        // TODO: Clears the viewport content entirely for now. Optimize to reuse existing elements.
        this.content.innerHTML = "";

        // Group the research subjects by field.
        const fields: IField[] = FieldGrouping.groupByField(subjects);

        // Calculate the vertical offsets for each field group.
        FieldLayout.verticalOffsets(fields);

        // Determine and update the SVG viewport dimensions.
        const dimension: Dimension = Layout.getDimensions(this.model, fields);
        this.viewport.setAttribute("width", dimension.width.toString());
        this.viewport.setAttribute("height", dimension.height.toString());

        // Generate the SVG field content.
        const fieldElements: SVGGElement[] = Field.create_each(this.model, fields);
        this.content.append(...fieldElements);

        // Generate the SVG connection overlay content.
        const connectionGroup: SVGGElement = Connection.create(subjects, fields, this.model.nodeConnectionsEnabled);
        this.content.append(connectionGroup);

        // Reapply zoom level after rendering.
        this.zoom.setZoom(this.zoom.zoomLevel);
    }
}
