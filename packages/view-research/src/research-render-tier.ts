import { SVG } from "./dom/svg";
import { Layout } from "./layout";
import { IField, FieldLayout } from "./research-render-field";
import { GridLayout } from "./research-render-grid";
import { Point } from "./shared";

export class Tier {
    /**
     * Renders vertical tier divider lines and labels.
     * @param field The field group.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for tier dividers.
     */
    public static create(field: IField): SVGGElement {
        const dividers: SVGGElement = SVG.create("g");

        const gridStartY: number = field.verticalOffset + FieldLayout.FIELD_LABEL_HEIGHT;
        const maxRows: number = Math.max(field.maxRow + 1, 3);
        const gridHeight: number = maxRows * Layout.CELL_HEIGHT;

        // Render the divider for each tier.
        for (let tier: number = 0; tier <= GridLayout.MAX_TIER_COUNT; tier++) {
            const column: number = tier * GridLayout.PER_TIER_COLUMN_COUNT;
            const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;

            // Create vertical divider line.
            {
                const start: Point = {
                    x: x - 10,
                    y: gridStartY
                };

                const end: Point = {
                    x: x - 10,
                    y: gridStartY + gridHeight
                };

                const line = SVG.create("line");
                line.setAttribute("x1", start.x.toString());
                line.setAttribute("y1", start.y.toString());
                line.setAttribute("x2", end.x.toString());
                line.setAttribute("y2", end.y.toString());
                line.setAttribute("stroke", "var(--vscode-input-foreground)");
                line.setAttribute("stroke-width", "2");
                line.setAttribute("opacity", "0.6");
                dividers.appendChild(line);
            }

            // Create tier label, skip the last divider.
            if (tier < GridLayout.MAX_TIER_COUNT) {
                const tierCenterX: number = x + (GridLayout.PER_TIER_COLUMN_COUNT * Layout.CELL_WIDTH) / 2;
                const labelY: number = gridStartY - 10;

                const label: SVGTextElement = SVG.create("text");
                label.setAttribute("x", tierCenterX.toString());
                label.setAttribute("y", labelY.toString());
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("font-size", "12");
                label.setAttribute("font-weight", "bold");
                label.setAttribute("fill", "var(--vscode-descriptionForeground)");
                label.textContent = `Tier ${tier}`;
                dividers.appendChild(label);
            }
        }

        return dividers;
    }
}
