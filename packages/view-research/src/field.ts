import { IResearchSubject } from "@soase/shared";
import { Dimension } from "./shared";

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
    lastColumn: number;

    /** Maximum row coordinate in this research field. This is zero-based. */
    lastRow: number;

    /** Vertical origin offset for rendering. */
    verticalOffset: number;
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
            const dimensions: Dimension = FieldGrouping.getDimension(subjects);

            const field: IField = {
                name: fieldName,
                nameDisplay: FieldGrouping.extractFieldDisplayName(fieldName),
                subjects: subjects,
                lastColumn: dimensions.width,
                lastRow: dimensions.height,
                verticalOffset: 0 // This will be calculated later.
            };
            fields.push(field);
        }

        // Sort a field's research subjects by tier number.
        fields.sort(FieldGrouping.compareFieldTiers);
        return fields;
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

    private static getDimension(subjects: IResearchSubject[]): Dimension {
        return {
            width: Math.max(...subjects.map((subject) => subject.field_coord[0])),
            height: Math.max(...subjects.map((subject) => subject.field_coord[1]))
        };
    }
}
