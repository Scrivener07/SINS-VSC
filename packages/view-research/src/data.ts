/**
 * Represents a research node in the research tree.
 */
export interface ResearchNode {
    id: string;
    name: string;
    prerequisites: string[][];
    field_coord: [number, number];
    tier: number;
    field: string;
}
