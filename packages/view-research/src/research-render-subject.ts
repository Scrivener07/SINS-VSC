import { IResearchSubject, Coordinate } from "@soase/shared";
import { SVG } from "./dom/svg";
import { IField } from "./field";
import { Layout } from "./layout";
import { Point, Dimension } from "./shared";

export class SubjectNode {
    public static readonly SUBJECT_NODE_CLASS: string = "research-node";

    /**
     * Renders research nodes for a specific field group.
     */
    public static create_each(field: IField): SVGForeignObjectElement[] {
        const nodes: SVGForeignObjectElement[] = [];
        for (const subject of field.subjects) {
            nodes.push(SubjectNode.create(field, subject));
        }
        return nodes;
    }

    /**
     * Renders a single research node at its tier-relative position.
     */
    private static create(field: IField, subject: IResearchSubject): SVGForeignObjectElement {
        const [column, row]: Coordinate = subject.field_coord;

        const position: Point = {
            x: column * Layout.CELL_WIDTH + Layout.PADDING,
            y: row * Layout.CELL_HEIGHT
        };

        const size: Dimension = {
            width: Layout.CELL_WIDTH - Layout.PADDING,
            height: Layout.CELL_HEIGHT - Layout.PADDING
        };

        const foreignObject: SVGForeignObjectElement = SVG.create("foreignObject");
        foreignObject.setAttribute("x", position.x.toString());
        foreignObject.setAttribute("y", position.y.toString());
        foreignObject.setAttribute("width", size.width.toString());
        foreignObject.setAttribute("height", size.height.toString());
        foreignObject.style.overflow = "visible";
        {
            const content: HTMLDivElement = document.createElement("div");
            content.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            content.setAttribute("data-id", subject.id);
            content.className = SubjectNode.SUBJECT_NODE_CLASS;
            content.style.width = `${size.width}px`;
            content.style.height = `${size.height}px`;

            const researchTier: HTMLDivElement = document.createElement("div");
            researchTier.className = "research-tier";
            researchTier.textContent = `Tier ${subject.tier}`;
            content.appendChild(researchTier);

            const researchName: HTMLDivElement = document.createElement("div");
            researchName.className = "research-name";
            researchName.textContent = subject.name;
            content.appendChild(researchName);

            const researchField: HTMLDivElement = document.createElement("div");
            researchField.className = "research-field";
            researchField.textContent = `${field.nameDisplay} [${column}, ${row}]`;
            content.appendChild(researchField);

            foreignObject.appendChild(content);
        }

        return foreignObject;
    }
}
