import { Log } from "./log";
import { IResearchSubject, Point } from "@soase/shared";
import { IFieldGroup } from "./research-field";
import { Layout } from "./dom-layout";

export class ConnectionRenderer {
    /**
     * Renders prerequisite connections between nodes, accounting for field offsets.
     */
    public static renderConnections(subjects: IResearchSubject[], fields: IFieldGroup[], enabled: boolean): string {
        if (!enabled) {
            return "";
        }

        const connections: string[] = [];
        const subjectMap: Map<string, IResearchSubject> = new Map(subjects.map((subject) => [subject.id, subject]));

        // Build a map of subject ID to field offset.
        const fieldOffsetMap: Map<string, number> = new Map();
        const FIELD_LABEL_HEIGHT: number = 40;

        for (const field of fields) {
            const offsetY: number = field.verticalOffset + Layout.PADDING + FIELD_LABEL_HEIGHT;
            for (const subject of field.subjects) {
                fieldOffsetMap.set(subject.id, offsetY);
            }
        }

        const nodeWidth: number = Layout.CELL_WIDTH - 20;
        const nodeHeight: number = Layout.CELL_HEIGHT - 20;

        for (const subject of subjects) {
            if (!subject.prerequisites || subject.prerequisites.length === 0) {
                continue;
            }

            const [toColumn, toRow]: Point = subject.field_coord;
            const toOffsetY: number = fieldOffsetMap.get(subject.id) || 0;
            const toCenterX: number = toColumn * Layout.CELL_WIDTH + Layout.PADDING + Layout.CELL_WIDTH / 2;
            const toCenterY: number = toRow * Layout.CELL_HEIGHT + toOffsetY + Layout.CELL_HEIGHT / 2;

            for (const prerequisite_group of subject.prerequisites) {
                for (const prerequisite_id of prerequisite_group) {
                    const prerequisite_node: IResearchSubject | undefined = subjectMap.get(prerequisite_id);
                    if (!prerequisite_node) {
                        Log.warn(`<ResearchRenderer::renderConnections> Prerequisite node not found: ${prerequisite_id}`);
                        continue;
                    }

                    const [fromColumn, fromRow]: Point = prerequisite_node.field_coord;
                    const fromOffsetY: number = fieldOffsetMap.get(prerequisite_id) || 0;
                    const fromCenterX: number = fromColumn * Layout.CELL_WIDTH + Layout.PADDING + Layout.CELL_WIDTH / 2;
                    const fromCenterY: number = fromRow * Layout.CELL_HEIGHT + fromOffsetY + Layout.CELL_HEIGHT / 2;

                    // Calculate the distance-delta and angle.
                    const distanceX: number = toCenterX - fromCenterX;
                    const distanceY: number = toCenterY - fromCenterY;
                    const angle: number = Math.atan2(distanceY, distanceX);

                    const fromEdge = Connection.getRectangleEdgePoint(fromCenterX, fromCenterY, nodeWidth - 20, nodeHeight - 20, angle);
                    const toEdge = Connection.getRectangleEdgePoint(toCenterX, toCenterY, nodeWidth - 20, nodeHeight - 20, angle + Math.PI);

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
}

class Connection {
    /**
     * Calculates the point where a line at the given angle intersects the edge of a rectangle.
     * @param centerX The X coordinate of the rectangle center.
     * @param centerY The Y coordinate of the rectangle center.
     * @param width The width of the rectangle.
     * @param height The height of the rectangle.
     * @param angle The angle of the line in radians.
     * @returns The intersection point {x, y}.
     */
    public static getRectangleEdgePoint(centerX: number, centerY: number, width: number, height: number, angle: number): { x: number; y: number } {
        const halfWidth: number = width / 2;
        const halfHeight: number = height / 2;

        // Calculate the absolute angle components.
        const directionX: number = Math.cos(angle);
        const directionY: number = Math.sin(angle);

        // Determine which edge the line intersects.
        const distanceToEdge_Vertical_X: number = halfWidth / Math.abs(directionX);
        const distanceToEdge_Horizontal_Y: number = halfHeight / Math.abs(directionY);

        // Use the smaller distance value (closer intersection).
        const distanceToEdge: number = Math.min(distanceToEdge_Vertical_X, distanceToEdge_Horizontal_Y);

        return {
            x: centerX + distanceToEdge * directionX,
            y: centerY + distanceToEdge * directionY
        };
    }
}
