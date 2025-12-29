import { IResearchSubject, Point } from "@soase/shared";
import { Layout } from "./dom-layout";
import { FieldLayout, IFieldGroup } from "./research-field";

export class GridLayout {
    /** The maximum number of tiers in the research grid from `research.uniforms`. */
    public static readonly MAX_TIER_COUNT: number = 5;

    /** The number of columns per tier from `research.uniforms`. */
    public static readonly PER_TIER_COLUMN_COUNT: number = 2;

    /** The total number of columns in the research grid. */
    public static readonly MAX_COLUMN_COUNT: number = GridLayout.MAX_TIER_COUNT * GridLayout.PER_TIER_COLUMN_COUNT;
}

export class GridRenderer {
    /**
     * Renders the background grid for a field group showing all possible cells.
     * @param group The field group to render grid for.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for the grid background.
     */
    public renderFieldGrid(group: IFieldGroup, offsetY: number): string {
        const gridElements: string[] = [];

        const gridStartY: number = offsetY + FieldLayout.FIELD_LABEL_HEIGHT;

        // Calculate the grid dimensions.
        // TODO: Ensure at least 3 rows?
        const maxRows: number = Math.max(group.maxRow, 2) + 1;
        const totalColumns: number = GridLayout.MAX_COLUMN_COUNT;

        // Render the grid cells.
        for (let row: number = 0; row < maxRows; row++) {
            for (let column: number = 0; column < totalColumns; column++) {
                const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;
                const y: number = row * Layout.CELL_HEIGHT + gridStartY;

                // Check if this cell is occupied by a research node.
                const isOccupied: boolean = group.subjects.some((subject) => GridRenderer.isCellOccupied(subject, column, row));

                // Set fill color based on cell occupancy.
                let fill: string;
                if (isOccupied) {
                    fill = "none";
                    // TODO: Play with the fill color for occupied cells.
                    // backgroundFill = "var(--vscode-editor-background)";
                } else {
                    fill = "var(--vscode-editor-lineHighlightBackground)";
                }

                // Render the grid cell background.
                const rectangleWidth: number = Layout.CELL_WIDTH - 20;
                const rectangleHeight: number = Layout.CELL_HEIGHT - 20;
                gridElements.push(`
                    <rect
                        x="${x}"
                        y="${y}"
                        width="${rectangleWidth}"
                        height="${rectangleHeight}"
                        fill="${fill}"
                        stroke="var(--vscode-panel-border)"
                        stroke-width="1"
                        opacity="0.3"
                    />
                `);

                // Render the coordinates on ALL cells.
                const textX: number = x + (Layout.CELL_WIDTH - 20) / 2;
                const textY: number = y + (Layout.CELL_HEIGHT - 20) / 2;
                gridElements.push(`
                    <text
                        x="${textX}"
                        y="${textY}"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="10"
                        fill="var(--vscode-descriptionForeground)"
                        opacity="0.5"
                        pointer-events="none"
                    >
                        [${column},${row}]
                    </text>
                `);
            }
        }

        return gridElements.join("");
    }

    /**
     * Checks if a grid cell is occupied by a research subject.
     * @param subject The research subject to check against.
     * @param column The column coordinate to check.
     * @param row The row coordinate to check.
     * @returns True if the subject occupies this cell.
     */
    private static isCellOccupied(subject: IResearchSubject, column: number, row: number): boolean {
        const [subjectColumn, subjectRow]: Point = subject.field_coord;
        return subjectColumn === column && subjectRow === row;
    }
}
