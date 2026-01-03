import { IResearchSubject, Coordinate } from "@soase/shared";
import { SVG } from "./dom/svg";
import { IField } from "./field";
import { GridLayout, Layout, FieldLayout } from "./layout";
import { Point, Dimension } from "./shared";

export class Grid {
    /**
     * Renders the background grid for a field group showing all possible cells.
     * @param field The field group to render grid for.
     * @returns SVG markup for the grid background.
     */
    public static create(field: IField): SVGGElement {
        const group: SVGGElement = SVG.create("g");

        // Calculate the grid dimensions.
        const rowCount: number = field.lastRow + 1;

        // Render the grid cells.
        for (let row: number = 0; row < rowCount; row++) {
            for (let column: number = 0; column < GridLayout.COLUMN_COUNT; column++) {
                // Check if this cell is occupied by any research node.
                const isOccupied: boolean = field.subjects.some((subject) => Grid.isCellOccupied(subject, column, row));

                // Set fill color based on cell occupancy.
                let fill: string;
                if (isOccupied) {
                    fill = "none";
                } else {
                    fill = "var(--vscode-editor-lineHighlightBackground)";
                }

                // Render the grid cell background.
                const position: Point = {
                    x: column * Layout.CELL_WIDTH + Layout.PADDING,
                    y: row * Layout.CELL_HEIGHT
                };

                const size: Dimension = {
                    width: Layout.CELL_WIDTH - Layout.PADDING,
                    height: Layout.CELL_HEIGHT - Layout.PADDING
                };

                const rectangle: SVGRectElement = SVG.create("rect");
                rectangle.setAttribute("x", position.x.toString());
                rectangle.setAttribute("y", position.y.toString());
                rectangle.setAttribute("width", size.width.toString());
                rectangle.setAttribute("height", size.height.toString());
                rectangle.setAttribute("fill", fill);
                rectangle.setAttribute("stroke", "var(--vscode-panel-border)");
                rectangle.setAttribute("stroke-width", "1");
                rectangle.setAttribute("opacity", "0.3");
                group.appendChild(rectangle);

                // Render the coordinates on ALL cells.
                const textPosition: Point = {
                    // Position for center of cell.
                    x: position.x + (Layout.CELL_WIDTH - Layout.PADDING) / 2,
                    y: position.y + (Layout.CELL_HEIGHT - Layout.PADDING) / 2
                };
                const text: SVGTextElement = SVG.create("text");
                text.setAttribute("x", textPosition.x.toString());
                text.setAttribute("y", textPosition.y.toString());
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.setAttribute("font-size", "10");
                text.setAttribute("fill", "var(--vscode-descriptionForeground)");
                text.setAttribute("opacity", "0.5");
                text.setAttribute("pointer-events", "none");
                text.textContent = `[${column},${row}]`;
                group.appendChild(text);
            }
        }

        return group;
    }

    /**
     * Checks if a grid cell is occupied by a research subject.
     * @param subject The research subject to check against.
     * @param column The column coordinate to check.
     * @param row The row coordinate to check.
     * @returns True if the subject occupies this cell.
     */
    private static isCellOccupied(subject: IResearchSubject, column: number, row: number): boolean {
        const [subjectColumn, subjectRow]: Coordinate = subject.field_coord;
        return subjectColumn === column && subjectRow === row;
    }
}

export class Tier {
    /**
     * Renders vertical tier divider lines and labels.
     * @param field The field group.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for tier dividers.
     */
    public static create(field: IField): SVGGElement {
        const dividers: SVGGElement = SVG.create("g");

        const gridHeight: number = (field.lastRow + 1) * Layout.CELL_HEIGHT;

        // Render the divider for each tier.
        for (let tier: number = 0; tier <= GridLayout.TIER_COUNT; tier++) {
            const column: number = tier * GridLayout.COLUMN_PER_TIER_COUNT;
            const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;

            // Create vertical divider line.
            {
                // Center point of the cell padding space.
                const HORIZONTAL_OFFSET_CENTER: number = Layout.PADDING / 2;

                const start: Point = {
                    x: x - HORIZONTAL_OFFSET_CENTER,
                    y: -Layout.PADDING
                };

                const end: Point = {
                    x: x - HORIZONTAL_OFFSET_CENTER,
                    y: gridHeight - Layout.PADDING
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
            if (tier < GridLayout.TIER_COUNT) {
                const tierCenterX: number = x + (GridLayout.COLUMN_PER_TIER_COUNT * Layout.CELL_WIDTH) / 2;
                const labelY: number = -(FieldLayout.FIELD_LABEL_HEIGHT / 2);

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
