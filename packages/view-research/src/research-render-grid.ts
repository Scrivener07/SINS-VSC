import { IResearchSubject, Coordinate } from "@soase/shared";
import { Layout } from "./layout";
import { FieldLayout, IField } from "./research-render-field";
import { Dimension, Point } from "./shared";
import { SVG } from "./dom/svg";

export class GridLayout {
    /** The maximum number of tiers in the research grid from `research.uniforms`. */
    public static readonly MAX_TIER_COUNT: number = 5;

    /** The number of columns per tier from `research.uniforms`. */
    public static readonly PER_TIER_COLUMN_COUNT: number = 2;

    /** The total number of columns in the research grid. */
    public static readonly MAX_COLUMN_COUNT: number = GridLayout.MAX_TIER_COUNT * GridLayout.PER_TIER_COLUMN_COUNT;
}

export class Grid {
    /**
     * Renders the background grid for a field group showing all possible cells.
     * @param field The field group to render grid for.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for the grid background.
     */
    public static create(field: IField): SVGGElement {
        const group: SVGGElement = SVG.create("g");

        const gridStartY: number = field.verticalOffset + FieldLayout.FIELD_LABEL_HEIGHT;

        // Calculate the grid dimensions.
        const maxRows: number = Math.max(field.maxRow + 1, 3);

        // Render the grid cells.
        for (let row: number = 0; row < maxRows; row++) {
            for (let column: number = 0; column < GridLayout.MAX_COLUMN_COUNT; column++) {
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
                    y: row * Layout.CELL_HEIGHT + gridStartY
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
