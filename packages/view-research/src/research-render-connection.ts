import { Log } from "./services/log";
import { IResearchSubject, Coordinate } from "@soase/shared";
import { Layout } from "./layout";
import { IField } from "./research-render-field";
import { Angle, Dimension, Distance, Point, Vector } from "./shared";

export class ConnectionRenderer {
    /**
     * Renders prerequisite connections between nodes, accounting for field offsets.
     */
    public static renderConnections(subjects: IResearchSubject[], fields: IField[], enabled: boolean): string {
        if (!enabled) {
            return "";
        }

        // Build a map of subject ID to field offset.
        const fieldOffsetMap: Map<string, number> = ConnectionRenderer.getOffsets(fields);

        // Generate the connection lines.
        const connections: string[] = ConnectionRenderer.createLines(subjects, fieldOffsetMap);

        return `
			<defs>
				<marker
					id="arrowhead"
					markerWidth="10"
					markerHeight="7"
					refX="9"
					refY="3.5"
					orient="auto"
				>
					<polygon
						points="0 0, 10 3.5, 0 7"
						fill="var(--vscode-editorLineNumber-foreground)"
					/>
				</marker>
			</defs>
			${connections.join("")}
		`;
    }

    private static createLines(subjects: IResearchSubject[], fieldOffsetMap: Map<string, number>): string[] {
        const connections: string[] = [];
        const subjectMap: Map<string, IResearchSubject> = new Map(subjects.map((subject) => [subject.id, subject]));

        const PADDING: number = 20;
        const nodeWidth: number = Layout.CELL_WIDTH - PADDING;
        const nodeHeight: number = Layout.CELL_HEIGHT - PADDING;

        for (const subject of subjects) {
            if (!subject.prerequisites || subject.prerequisites.length === 0) {
                continue;
            }

            // Get the center point of the target node.
            const toCenter: Point = Connection.findCenter(subject, fieldOffsetMap);

            for (const prerequisite_group of subject.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    // Find the prerequisite node.
                    const prerequisite_node: IResearchSubject | undefined = subjectMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        Log.warn(`<ResearchRenderer::renderConnections> Prerequisite node not found: ${prerequisite_id}`);
                        continue;
                    }

                    // Get the center point of the prerequisite node.
                    const fromCenter: Point = Connection.findCenter(prerequisite_node, fieldOffsetMap);

                    // Calculate the distance-delta and angle.
                    const angle: number = Connection.findAngle(toCenter, fromCenter);

                    // Calculate the rectangle edge points for the line.
                    const dimension: Dimension = {
                        width: nodeWidth - PADDING,
                        height: nodeHeight - PADDING
                    };

                    const fromEdge: Point = Connection.findRectangleEdge(fromCenter, dimension, angle);
                    const toEdge: Point = Connection.findRectangleEdge(toCenter, dimension, angle + Math.PI);

                    const line: string = `
                    	<line
                    		x1="${fromEdge.x}"
                    		y1="${fromEdge.y}"
                    		x2="${toEdge.x}"
                    		y2="${toEdge.y}"
                    		stroke="var(--vscode-editorLineNumber-foreground)"
                    		stroke-width="2"
                    		marker-end="url(#arrowhead)"
                    	/>
                    `;
                    connections.push(line);
                }
            }
        }
        return connections;
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

class Connection {
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
    public static findAngle(toCenter: Point, fromCenter: Point): number {
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
