import { IResearchSubject } from "@soase/shared";

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
}
