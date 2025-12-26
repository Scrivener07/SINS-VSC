/**
 * Represents a research subject entity.
 *
 * NOTE: This uses an `I` prefix to avoid collision with the `server` package's `ResearchSubject` class.
 */
export interface IResearchSubject {
    id: string;
    name: string;
    field: string;
    field_coord: Point;
    tier: number;
    prerequisites: Prerequisites;
}

/**
 * Represents a 2D point with X and Y coordinates.
 */
export type Point = [number, number];

/**
 * Array of prerequisite groups. Each inner array represents an AND group.
 * Multiple groups represent OR conditions.
 *
 * Example: means "(tech_a AND tech_b) OR (tech_c)"
 * ```
 * "prerequisites": [
 *     ["tech_a", "tech_b"],
 *     ["tech_c"]
 * ]
 * ```
 */
export type Prerequisites = string[][];
