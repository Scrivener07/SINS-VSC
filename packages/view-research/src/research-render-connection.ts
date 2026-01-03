import { Log } from "./services/log";
import { IResearchSubject, Coordinate } from "@soase/shared";
import { Layout } from "./layout";
import { Angle, Dimension, Distance, Point, Vector } from "./shared";
import { SVG } from "./dom/svg";
import { IField } from "./field";

/**
 * Renders prerequisite connections between research subject nodes.
 */
export class Connection {
    /**
     * Creates the reusable SVG definition elements needed for connections.
     * @returns An array of SVG elements.
     */
    public static definitions(): SVGElement[] {
        const arrowhead: SVGMarkerElement = SVG.create("marker");
        {
            arrowhead.setAttribute("id", "arrowhead");
            arrowhead.setAttribute("markerWidth", "10");
            arrowhead.setAttribute("markerHeight", "7");
            arrowhead.setAttribute("refX", "9");
            arrowhead.setAttribute("refY", "3.5");
            arrowhead.setAttribute("orient", "auto");

            const arrow: SVGPolygonElement = SVG.create("polygon");
            arrow.setAttribute("points", "0 0, 10 3.5, 0 7");
            arrow.setAttribute("fill", "var(--vscode-editorLineNumber-foreground)");
            arrowhead.appendChild(arrow);
        }
        return [arrowhead];
    }

    /**
     * Renders prerequisite connections between nodes, accounting for field offsets.
     * @param subjects The array of research subjects.
     * @param fields The array of research fields.
     * @param enabled Determines if connections are enabled.
     * @returns An SVG group element containing the connection lines.
     */
    public static create(subjects: IResearchSubject[], fields: IField[], enabled: boolean): SVGGElement {
        const group: SVGGElement = SVG.create("g");
        if (!enabled) {
            return group;
        }

        // Build a map of subject ID to field offset.
        const fieldOffsetMap: Map<string, number> = Connection.getOffsets(fields);

        // Generate the connection lines.
        const connections: SVGLineElement[] = Connection.createLines(subjects, fieldOffsetMap);
        group.append(...connections);
        return group;
    }

    private static createLines(subjects: IResearchSubject[], fieldOffsetMap: Map<string, number>): SVGLineElement[] {
        const connections: SVGLineElement[] = [];
        const subjectMap: Map<string, IResearchSubject> = new Map(subjects.map((subject) => [subject.id, subject]));

        const PADDING: number = 20;
        const nodeSize: Dimension = {
            width: Layout.CELL_WIDTH - PADDING,
            height: Layout.CELL_HEIGHT - PADDING
        };

        for (const subject of subjects) {
            if (!subject.prerequisites || subject.prerequisites.length === 0) {
                continue;
            }

            // Get the center point of the target node.
            const toCenter: Point = Connect.findCenter(subject, fieldOffsetMap);

            for (const prerequisite_group of subject.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    // Find the prerequisite node.
                    const prerequisite_node: IResearchSubject | undefined = subjectMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        Log.warn(`<ResearchRenderer::renderConnections> Prerequisite node not found: ${prerequisite_id}`);
                        continue;
                    }

                    // Get the center point of the prerequisite node.
                    const fromCenter: Point = Connect.findCenter(prerequisite_node, fieldOffsetMap);

                    // Calculate the distance-delta and angle.
                    const angle: Angle = Connect.findAngle(toCenter, fromCenter);

                    // Calculate the rectangle edge points for the line.
                    const dimension: Dimension = {
                        width: nodeSize.width - PADDING,
                        height: nodeSize.height - PADDING
                    };

                    // Calculate the edge points.
                    const fromEdge: Point = Connect.findRectangleEdge(fromCenter, dimension, angle);
                    const toEdge: Point = Connect.findRectangleEdge(toCenter, dimension, angle + Math.PI);

                    // Create the SVG line element.
                    const line: SVGLineElement = Connection.createLine(fromEdge, toEdge);
                    connections.push(line);
                }
            }
        }
        return connections;
    }

    /**
     * Creates an SVG line element between two edge points.
     * @param fromEdge The starting point of the line.
     * @param toEdge The ending point of the line.
     * @returns An SVG line element.
     */
    private static createLine(fromEdge: Point, toEdge: Point): SVGLineElement {
        const line: SVGLineElement = SVG.create("line");
        line.setAttribute("x1", fromEdge.x.toString());
        line.setAttribute("y1", fromEdge.y.toString());
        line.setAttribute("x2", toEdge.x.toString());
        line.setAttribute("y2", toEdge.y.toString());
        line.setAttribute("stroke", "var(--vscode-editorLineNumber-foreground)");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("marker-end", "url(#arrowhead)");
        return line;
    }

    /**
     * Builds a map of subject ID to field vertical offset Y positions.
     * @param fields The array of field groups.
     * @returns The map of subject ID to field offset Y.
     */
    private static getOffsets(fields: IField[]): Map<string, number> {
        const FIELD_LABEL_HEIGHT: number = 40;
        const offsets: Map<string, number> = new Map();
        for (const field of fields) {
            const offsetY: number = field.verticalOffset + Layout.PADDING + FIELD_LABEL_HEIGHT;
            for (const subject of field.subjects) {
                offsets.set(subject.id, offsetY);
            }
        }
        return offsets;
    }
}

/**
 * An internal helper class for connection geometry calculations.
 */
class Connect {
    /**
     * Calculates the center point of a research subject node.
     * @param subject The research subject.
     * @param fieldOffsets A map of subject ID to field vertical offset Y positions.
     * @returns The center point of the subject node.
     */
    public static findCenter(subject: IResearchSubject, fieldOffsets: Map<string, number>): Point {
        const [column, row]: Coordinate = subject.field_coord;
        const offsetY: number = fieldOffsets.get(subject.id) || 0;
        const center: Point = {
            x: column * Layout.CELL_WIDTH + Layout.PADDING + Layout.CELL_WIDTH / 2,
            y: row * Layout.CELL_HEIGHT + offsetY + Layout.CELL_HEIGHT / 2
        };
        return center;
    }

    /**
     * Calculates the angle from one point to another.
     * @param toCenter The target point.
     * @param fromCenter The origin point.
     * @returns The angle in radians.
     */
    public static findAngle(toCenter: Point, fromCenter: Point): Angle {
        const distanceX: number = toCenter.x - fromCenter.x;
        const distanceY: number = toCenter.y - fromCenter.y;
        const angle: Angle = Math.atan2(distanceY, distanceX);
        return angle;
    }

    /**
     * Calculates the point where a line at the given angle intersects the edge of a rectangle.
     * @param center The center point of the rectangle.
     * @param dimension The dimensions of the rectangle.
     * @param angle The angle of the line in radians.
     * @returns The intersection point {x, y}.
     */
    public static findRectangleEdge(center: Point, dimension: Dimension, angle: Angle): Point {
        // Calculate half-dimensions for edge distance calculations.
        const half: Dimension = {
            width: dimension.width / 2,
            height: dimension.height / 2
        };

        // Get the direction vector from the angle.
        const direction: Vector = {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };

        // Calculate distance along the ray to each edge type.
        const toVerticalEdge: Distance = half.width / Math.abs(direction.x);
        const toHorizontalEdge: Distance = half.height / Math.abs(direction.y);

        // Use the shorter distance (first intersection).
        const distanceToEdge: Distance = Math.min(toVerticalEdge, toHorizontalEdge);

        return {
            x: center.x + distanceToEdge * direction.x,
            y: center.y + distanceToEdge * direction.y
        };
    }
}
