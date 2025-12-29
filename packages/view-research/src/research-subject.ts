import { IResearchSubject, Point } from "@soase/shared";
import { IFieldGroup } from "./research-field";
import { Layout } from "./dom-layout";

export class ResearchSubject {
    /**
     * Renders a single research node at its tier-relative position.
     */
    public static renderSubject(node: IResearchSubject, tierOffsetY: number, group: IFieldGroup): string {
        const [column, row]: Point = node.field_coord;
        const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;
        const y: number = row * Layout.CELL_HEIGHT + tierOffsetY;

        const nodeWidth: number = Layout.CELL_WIDTH - 20;
        const nodeHeight: number = Layout.CELL_HEIGHT - 20;

        return `
        <foreignObject x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}">
            <div
                xmlns="http://www.w3.org/1999/xhtml"
                class="research-node"
                data-id="${node.id}"
                style="
                    width: ${nodeWidth - 20}px;
                    height: ${nodeHeight - 20}px;
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
