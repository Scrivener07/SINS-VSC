import { IResearchSubject, Point } from "@soase/shared";
import { IFieldGroup } from "./research-field";
import { Layout } from "./dom-layout";

export class ResearchSubject {
    public static readonly SUBJECT_NODE_CLASS: string = "research-node";
    private static readonly SIZE_OFFSET: number = 20;

    /**
     * Renders research nodes for a specific field group.
     */
    public static renderSubjects(field: IFieldGroup, offsetY: number): string {
        const subjects: string[] = field.subjects.map((subject) => ResearchSubject.renderSubject(subject, offsetY, field));
        return subjects.join("");
    }

    /**
     * Renders a single research node at its tier-relative position.
     */
    private static renderSubject(node: IResearchSubject, tierOffsetY: number, group: IFieldGroup): string {
        const [column, row]: Point = node.field_coord;
        const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;
        const y: number = row * Layout.CELL_HEIGHT + tierOffsetY;

        const nodeWidth: number = Layout.CELL_WIDTH - ResearchSubject.SIZE_OFFSET;
        const nodeHeight: number = Layout.CELL_HEIGHT - ResearchSubject.SIZE_OFFSET;

        return `
        <foreignObject x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}">
            <div
                xmlns="http://www.w3.org/1999/xhtml"
                class="${ResearchSubject.SUBJECT_NODE_CLASS}"
                data-id="${node.id}"
                style="
                    width: ${nodeWidth - ResearchSubject.SIZE_OFFSET}px;
                    height: ${nodeHeight - ResearchSubject.SIZE_OFFSET}px;
                    padding: 10px;
                "
            >
                <div class="research-tier">Tier ${node.tier}</div>
                <div class="research-name">${node.name}</div>
                <div class="research-field">${group.nameDisplay} [${column}, ${row}]</div>
            </div>
        </foreignObject>
        `;
    }
}
