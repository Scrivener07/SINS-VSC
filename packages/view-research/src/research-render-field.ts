import { IResearchSubject } from "@soase/shared";
import { Layout } from "./layout";
import { GridLayout, Grid } from "./research-render-grid";
import { ResearchSubject } from "./research-render-subject";
import { Tier } from "./research-render-tier";
import { SVG } from "./dom/svg";
import { Point } from "./shared";

/**
 * Represents a field group of research subjects.
 */
export interface IField {
    /** The research field name. (`Civilian_industry`) */
    name: string;

    /** The display name. (`Industry`) */
    nameDisplay: string;

    /** Research subjects in this research field. */
    subjects: IResearchSubject[];

    /** Maximum column coordinate in this research field. This is zero-based. */
    maxColumn: number;

    /** Maximum row coordinate in this research field. This is zero-based. */
    maxRow: number;

    /** Vertical origin offset for rendering. */
    verticalOffset: number;
}

/**
 * Layout constants for research fields.
 */
export class FieldLayout {
    /** Height of the field label area. */
    public static readonly FIELD_LABEL_HEIGHT: number = 40;

    /** Spacing between fields. */
    public static readonly FIELD_SPACING: number = 60;

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
            const rowCount: number = field.maxRow + 1;
            const rowCountMin: number = 3; // Minimum 3 rows

            // Use this field's row count to calculate its height.
            const fieldRows: number = Math.max(rowCount, rowCountMin);
            const fieldHeight: number = fieldRows * Layout.CELL_HEIGHT;

            // Update offset for use by the next iteration.
            offset += FieldLayout.FIELD_LABEL_HEIGHT + fieldHeight + FieldLayout.FIELD_SPACING;
        }
    }
}

export class FieldGrouping {
    /**
     * Groups research subjects by their research field.
     */
    public static groupByField(subjects: IResearchSubject[]): IField[] {
        const fieldMap: Map<string, IResearchSubject[]> = new Map();

        // Group the subjects by their field.
        for (const subject of subjects) {
            const fieldName: string = subject.field || "unknown";
            if (!fieldMap.has(fieldName)) {
                fieldMap.set(fieldName, []);
            }
            fieldMap.get(fieldName)!.push(subject);
        }

        // Convert to field array.
        const fields: IField[] = [];
        for (const [fieldName, subjects] of fieldMap.entries()) {
            // Find the maximum column and row for layout calculations.
            const maxColumn: number = Math.max(...subjects.map((subject) => subject.field_coord[0]));
            const maxRow: number = Math.max(...subjects.map((subject) => subject.field_coord[1]));

            const field: IField = {
                name: fieldName,
                nameDisplay: FieldGrouping.extractFieldDisplayName(fieldName),
                subjects: subjects,
                maxColumn: maxColumn,
                maxRow: maxRow,
                verticalOffset: 0 // This will be calculated later.
            };
            fields.push(field);
        }

        // Sort a field's research subjects by tier number.
        fields.sort(FieldGrouping.compareFieldTiers);
        return fields;
    }

    /**
     * Compares two field groups by their minimum tier number.
     * @param field This field group.
     * @param other The other field group.
     * @returns Negative if `group_a < group_b`, positive if `group_a > group_b`, zero if equal.
     */
    private static compareFieldTiers(field: IField, other: IField): number {
        const tierA: number = Math.min(...field.subjects.map((subject) => subject.tier));
        const tierB: number = Math.min(...other.subjects.map((subject) => subject.tier));
        return tierA - tierB;
    }

    /**
     * Extracts the display name from a field name key.
     * Example: "Civilian_industry" -> "Industry"
     *
     * TODO: This should be done by looking up the field name in a localization file.
     */
    private static extractFieldDisplayName(fieldName: string): string {
        // Remove domain prefix. (Civilian_ or Military_)
        const withoutPrefix: string = fieldName.replace(/^(Civilian|Military)_/i, "");

        // Capitalize first letter.
        return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
    }
}

export class Field {
    /**
     * Renders all field groups with labels and subjects.
     */
    public static create_each(fields: IField[]): SVGGElement[] {
        const groups: SVGGElement[] = [];
        for (const field of fields) {
            const group: SVGGElement = this.create(field);
            groups.push(group);
        }
        return groups;
    }

    private static create(field: IField): SVGGElement {
        // The padded vertical origin for this field.
        const PADDED_VERTICAL: number = field.verticalOffset + Layout.PADDING;

        // Create SVG group for the field.
        const group: SVGGElement = SVG.create("g");

        // Create field label.
        {
            const position: Point = {
                x: Layout.PADDING,
                y: PADDED_VERTICAL
            };

            const text: SVGTextElement = SVG.create("text");
            text.setAttribute("x", position.x.toString());
            text.setAttribute("y", position.y.toString());
            text.setAttribute("font-size", "18");
            text.setAttribute("font-weight", "bold");
            text.setAttribute("fill", "var(--vscode-foreground)");
            text.textContent = field.nameDisplay;
            group.appendChild(text);
        }

        // Create horizontal separator line.
        {
            const VERTICAL: number = 15;

            const start: Point = {
                x: Layout.PADDING,
                y: PADDED_VERTICAL + VERTICAL
            };

            const end: Point = {
                x: GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH, // + Layout.PADDING,
                y: PADDED_VERTICAL + VERTICAL
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
            group.appendChild(Grid.create(field));
            group.appendChild(Tier.create(field));
        }

        // Create research subject nodes.
        {
            const offsetY: number = PADDED_VERTICAL + FieldLayout.FIELD_LABEL_HEIGHT;
            group.append(...ResearchSubject.create_each(field, offsetY));
        }

        return group;
    }
}
