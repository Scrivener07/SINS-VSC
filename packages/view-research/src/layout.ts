import { IField } from "./field";
import { ResearchModel } from "./research-model";
import { Dimension } from "./shared";

export class Layout {
    /** The width of each research node cell. */
    public static readonly CELL_WIDTH: number = 180;

    /** The height of each research node cell. */
    public static readonly CELL_HEIGHT: number = 120;

    /** The padding around the research tree. */
    public static readonly PADDING: number = 20;

    /**
     * Calculates the overall SVG dimensions based on the field layouts.
     * @param fields The array of field groups.
     * @returns The SVG dimensions.
     */
    public static getDimensions(model: ResearchModel, fields: IField[]): Dimension {
        // Use fixed width based on the grid maximum columns.
        const maxWidth: number = model.grid.column_count * Layout.CELL_WIDTH;

        // Calculate the base dimensions needed for the SVG.
        // TODO: See `FieldLayout.verticalOffsets` for potential DRY violation.
        const maxRows: number = Math.max(...fields.map((field) => field.lastRow + 1), 3);
        const totalHeight: number = fields.length * (FieldLayout.FIELD_LABEL_HEIGHT + maxRows * Layout.CELL_HEIGHT + FieldLayout.FIELD_SPACING);

        // Caculate the final SVG dimensions after padding.
        return {
            width: maxWidth + Layout.PADDING * 2,
            height: totalHeight + Layout.PADDING * 2
        };
    }
}

/**
 * Layout constants for research fields.
 */
export class FieldLayout {
    /** Height of the field label area. */
    public static readonly FIELD_LABEL_HEIGHT: number = 40;

    /** Spacing between fields. */
    public static readonly FIELD_SPACING: number = 64;

    /**
     * Calculates vertical offsets for each field group so they don't overlap.
     *
     * Each field's `verticalOffset` property is updated in place.
     *
     * @param fields The array of field groups to calculate offsets for.
     */
    public static verticalOffsets(fields: IField[]): void {
        let offset: number = 0;
        for (const field of fields) {
            // Assign the offset from the last iteration.
            field.verticalOffset = offset;

            // Calculate the number of rows in this field.
            const rowCount: number = field.lastRow + 1;

            // Use this field's row count to calculate its height.
            const fieldHeight: number = rowCount * Layout.CELL_HEIGHT;

            // Update offset for use by the next iteration.
            offset += FieldLayout.FIELD_LABEL_HEIGHT + fieldHeight + FieldLayout.FIELD_SPACING;
        }
    }

    private static getDimension(field: IField): Dimension {
        return {
            width: field.lastColumn * (Layout.CELL_WIDTH + FieldLayout.FIELD_SPACING),
            height: field.lastRow * (Layout.CELL_HEIGHT + Layout.PADDING)
        };
    }
}

// export class GridLayout {
//     /** The maximum number of tiers in the research grid from `research.uniforms`. */
//     public static readonly TIER_COUNT: number = 5;

//     /** The number of columns per tier from `research.uniforms`. */
//     public static readonly COLUMN_PER_TIER_COUNT: number = 2;

//     /** The total number of columns in the research grid. */
//     public static readonly COLUMN_COUNT: number = GridLayout.TIER_COUNT * GridLayout.COLUMN_PER_TIER_COUNT;
// }
