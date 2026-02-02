/**
 * Represents the research uniform data from `research.uniforms`.
 */
export interface IResearchUniform {
    /** The maximum number of tiers in the research grid. */
    max_tier_count: number;

    /** The number of columns per tier. */
    per_tier_column_count: number;

    /** The name labels of each tier. */
    tier_names: string[];
}

/**
 * Represents a research subject entity.
 *
 * NOTE: This uses an `I` prefix to avoid collision with the `server` package's `ResearchSubject` class.
 */
export interface IResearchSubject {
    id: string;
    name: string;
    field: string;
    field_coord: Coordinate;
    tier: number;
    prerequisites: Prerequisites;
}

/**
 * Represents a 2D point with X and Y coordinates.
 */
export type Coordinate = [number, number];

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
