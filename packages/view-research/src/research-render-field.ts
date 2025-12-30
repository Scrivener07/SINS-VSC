import { IResearchSubject } from "@soase/shared";
import { Layout } from "./layout";
import { GridLayout, GridRenderer } from "./research-render-grid";
import { ResearchSubject } from "./research-render-subject";
import { Tier } from "./research-render-tier";

/**
 * Represents a field group of research subjects.
 */
export interface IFieldGroup {
    /** The research field name. (`Civilian_industry`) */
    name: string;

    /** The display name. (`Industry`) */
    nameDisplay: string;

    /** Research subjects in this research field. */
    subjects: IResearchSubject[];

    /** Maximum column coordinate in this research field. */
    maxColumn: number;

    /** Maximum row coordinate in this research field. */
    maxRow: number;

    /** Vertical offset for rendering. */
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

    // TODO: This should have side affects, but doesnt.
    /**
     * Calculates vertical offsets for each field group so they don't overlap.
     */
    public static calculateFieldOffsets(fields: IFieldGroup[]): void {
        // Calculate maximum rows needed across all fields.
        // Use the maximum to ensure consistent grid height.
        // Minimum 3 rows (0, 1, 2)
        // TODO: Reconsider using a row minimum after some testing.
        const maxRows: number = Math.max(...fields.map((group) => group.maxRow), 2) + 1;

        // Assign the vertical offsets.
        let offset: number = 0;
        for (const field of fields) {
            field.verticalOffset = offset;

            // Use consistent grid height for all fields
            const fieldHeight: number = maxRows * Layout.CELL_HEIGHT;

            // Next group starts after this group's height + label + spacing.
            offset += FieldLayout.FIELD_LABEL_HEIGHT + fieldHeight + FieldLayout.FIELD_SPACING;
        }
    }
}

export class FieldGrouping {
    /**
     * Groups research subjects by their research field.
     */
    public static groupByField(subjects: IResearchSubject[]): IFieldGroup[] {
        const fieldMap: Map<string, IResearchSubject[]> = new Map();

        // Group the subjects by their field.
        for (const subject of subjects) {
            const fieldName: string = subject.field || "unknown";
            if (!fieldMap.has(fieldName)) {
                fieldMap.set(fieldName, []);
            }
            fieldMap.get(fieldName)!.push(subject);
        }

        // Convert to IFieldGroup array.
        const fields: IFieldGroup[] = [];
        for (const [fieldName, subjects] of fieldMap.entries()) {
            // Find the maximum column and row for layout calculations.
            const maxColumn: number = Math.max(...subjects.map((subject) => subject.field_coord[0]));
            const maxRow: number = Math.max(...subjects.map((subject) => subject.field_coord[1]));

            const field: IFieldGroup = {
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
     * @param group This field group.
     * @param other The other field group.
     * @returns Negative if `group_a < group_b`, positive if `group_a > group_b`, zero if equal.
     */
    private static compareFieldTiers(group: IFieldGroup, other: IFieldGroup): number {
        const tierA: number = Math.min(...group.subjects.map((subject) => subject.tier));
        const tierB: number = Math.min(...other.subjects.map((subject) => subject.tier));
        return tierA - tierB;
    }

    /**
     * Extracts the display name from a field name.
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
    public static renderFieldGroups(fieldGroups: IFieldGroup[]): string {
        const html_fields: string[] = fieldGroups.map((group) => this.renderFieldGroup(group));
        return html_fields.join("");
    }

    private static renderFieldGroup(fieldGroup: IFieldGroup): string {
        const labelY: number = fieldGroup.verticalOffset + Layout.PADDING;
        const nodesY: number = labelY + FieldLayout.FIELD_LABEL_HEIGHT;

        const label_x: number = Layout.PADDING;
        const label_y: number = labelY + 25;

        const seperator_x1: number = Layout.PADDING;
        const seperator_y1: number = labelY + 30;
        const seperator_x2: number = GridLayout.MAX_COLUMN_COUNT * Layout.CELL_WIDTH + Layout.PADDING;
        const seperator_y2: number = labelY + 30;

        return `
        <g>
            <!-- Field Label -->
            <text
                x="${label_x}"
                y="${label_y}"
                font-size="18"
                font-weight="bold"
                fill="var(--vscode-foreground)"
            >
                ${fieldGroup.nameDisplay}
            </text>

            <!-- Field Separator Line -->
            <line
                x1="${seperator_x1}"
                y1="${seperator_y1}"
                x2="${seperator_x2}"
                y2="${seperator_y2}"
                stroke="var(--vscode-panel-border)"
                stroke-width="1"
            />

            <!-- Background Grid -->
            ${GridRenderer.renderFieldGrid(fieldGroup, fieldGroup.verticalOffset)}

            <!-- Tier Dividers -->
            ${Tier.renderTierDividers(fieldGroup, fieldGroup.verticalOffset)}

            <!-- Research Nodes (rendered on top) -->
            ${ResearchSubject.renderSubjects(fieldGroup, nodesY)}
        </g>
        `;
    }
}
