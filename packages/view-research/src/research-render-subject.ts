import { IResearchSubject, Coordinate } from "@soase/shared";
import { IField } from "./research-render-field";
import { Layout } from "./layout";
import { Dimension, Point } from "./shared";
import { SVG } from "./dom/svg";

export class ResearchSubject {
    public static readonly SUBJECT_NODE_CLASS: string = "research-node";
    private static readonly SIZE_OFFSET: number = 20;

    /**
     * Renders research nodes for a specific field group.
     */
    public static create_each(field: IField, offsetY: number): SVGForeignObjectElement[] {
        const nodes: SVGForeignObjectElement[] = [];
        for (const subject of field.subjects) {
            nodes.push(ResearchSubject.create(field, offsetY, subject));
        }
        return nodes;
    }

    /**
     * Renders a single research node at its tier-relative position.
     */
    private static create(field: IField, offsetY: number, subject: IResearchSubject): SVGForeignObjectElement {
        const [column, row]: Coordinate = subject.field_coord;

        const position: Point = {
            x: column * Layout.CELL_WIDTH + Layout.PADDING,
            y: row * Layout.CELL_HEIGHT + offsetY
        };

        const size: Dimension = {
            width: Layout.CELL_WIDTH - ResearchSubject.SIZE_OFFSET,
            height: Layout.CELL_HEIGHT - ResearchSubject.SIZE_OFFSET
        };

        const paddedSize: Dimension = {
            width: size.width - ResearchSubject.SIZE_OFFSET,
            height: size.height - ResearchSubject.SIZE_OFFSET
        };

        const foreignObject: SVGForeignObjectElement = SVG.create("foreignObject");
        foreignObject.setAttribute("x", position.x.toString());
        foreignObject.setAttribute("y", position.y.toString());
        foreignObject.setAttribute("width", size.width.toString());
        foreignObject.setAttribute("height", size.height.toString());
        {
            const content: HTMLDivElement = document.createElement("div");
            content.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
            content.setAttribute("data-id", subject.id);
            content.className = ResearchSubject.SUBJECT_NODE_CLASS;
            content.style.width = `${paddedSize.width}px`;
            content.style.height = `${paddedSize.height}px`;
            content.style.padding = "10px";

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
