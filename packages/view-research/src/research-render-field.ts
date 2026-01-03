import { FieldLayout, GridLayout, Layout } from "./layout";
import { SVG } from "./dom/svg";
import { Point } from "./shared";
import { IField } from "./field";
import { Log } from "./services/log";
import { Grid, Tier } from "./research-render-grid";
import { SubjectNode } from "./research-render-subject";

export class Field {
    /**
     * Renders all field groups with labels and subjects.
     */
    public static create_each(fields: IField[]): SVGGElement[] {
        const groups: SVGGElement[] = [];
        for (const field of fields) {
            // The padded vertical origin for this field.
            const PADDED_VERTICAL: number = field.verticalOffset + Layout.PADDING;

            const group: SVGGElement = this.create(field);
            group.setAttribute("transform", `translate(${Layout.PADDING}, ${PADDED_VERTICAL})`);
            groups.push(group);
        }
        return groups;
    }

    private static create(field: IField): SVGGElement {
        // Create SVG group for the field.
        const group: SVGGElement = SVG.create("g");

        const position: Point = {
            x: 0,
            y: 0
        };

        // Create field label.
        {
            const text: SVGTextElement = SVG.create("text");
            text.setAttribute("dominant-baseline", "hanging");
            text.setAttribute("x", position.x.toString());
            text.setAttribute("y", position.y.toString());
            text.setAttribute("font-size", FieldLayout.FIELD_LABEL_HEIGHT.toString());
            text.setAttribute("font-weight", "bold");
            text.setAttribute("fill", "var(--vscode-foreground)");
            text.textContent = field.nameDisplay;
            group.appendChild(text);

            position.y += FieldLayout.FIELD_LABEL_HEIGHT;
        }

        // Create horizontal separator line.
        {
            const VERTICAL_PAD: number = 8;
            position.y += VERTICAL_PAD;

            const start: Point = {
                x: 0,
                y: position.y
            };

            const end: Point = {
                x: GridLayout.COLUMN_COUNT * Layout.CELL_WIDTH + Layout.PADDING,
                y: position.y
            };

            const separator: SVGLineElement = SVG.create("line");
            separator.setAttribute("x1", start.x.toString());
            separator.setAttribute("y1", start.y.toString());
            separator.setAttribute("x2", end.x.toString());
            separator.setAttribute("y2", end.y.toString());
            separator.setAttribute("stroke", "var(--vscode-panel-border)");
            separator.setAttribute("stroke-width", "2");
            group.appendChild(separator);
        }

        // Create grid and tier dividers.
        {
            const offsetY: number = position.y + FieldLayout.FIELD_LABEL_HEIGHT;

            const background_group: SVGGElement = SVG.create("g");
            background_group.setAttribute("transform", `translate(0, ${offsetY})`);
            group.appendChild(background_group);

            const grid: SVGGElement = Grid.create(field);
            background_group.appendChild(grid);

            const tiers: SVGGElement = Tier.create(field);
            background_group.appendChild(tiers);
        }

        // Create research subject nodes.
        {
            const offsetY: number = position.y + FieldLayout.FIELD_LABEL_HEIGHT;

            const subjects_group: SVGGElement = SVG.create("g");
            subjects_group.setAttribute("transform", `translate(0, ${offsetY})`);

            subjects_group.append(...SubjectNode.create_each(field));
            group.appendChild(subjects_group);
        }

        Log.info(`Created field for '${field.nameDisplay}'`);
        return group;
    }
}
