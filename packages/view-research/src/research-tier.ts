import { Layout } from "./dom-layout";
import { IFieldGroup, FieldLayout } from "./research-field";
import { GridLayout } from "./research-grid";

export class Tier {
    /**
     * Renders vertical tier divider lines and labels.
     * @param group The field group.
     * @param offsetY The vertical offset for this field.
     * @returns SVG markup for tier dividers.
     */
    public static renderTierDividers(group: IFieldGroup, offsetY: number): string {
        const dividers: string[] = [];
        const gridStartY: number = offsetY + FieldLayout.FIELD_LABEL_HEIGHT;
        const maxRows: number = Math.max(group.maxRow, 2) + 1;
        const gridHeight: number = maxRows * Layout.CELL_HEIGHT;

        // Render the divider for each tier.
        for (let tier: number = 0; tier <= GridLayout.MAX_TIER_COUNT; tier++) {
            const column: number = tier * GridLayout.PER_TIER_COLUMN_COUNT;
            const x: number = column * Layout.CELL_WIDTH + Layout.PADDING;

            // Create vertical divider line.
            const divider_x1: number = x - 10;
            const divider_y1: number = gridStartY;
            const divider_x2: number = x - 10;
            const divider_y2: number = gridStartY + gridHeight;
            const divider_color: string = "var(--vscode-input-foreground)";
            dividers.push(`
                <line
                    x1="${divider_x1}"
                    y1="${divider_y1}"
                    x2="${divider_x2}"
                    y2="${divider_y2}"
                    stroke="${divider_color}"
                    stroke-width="2"
                    opacity="0.6"
                />
            `);

            // Create tier label, skip the last divider.
            if (tier < GridLayout.MAX_TIER_COUNT) {
                const tierCenterX: number = x + (GridLayout.PER_TIER_COLUMN_COUNT * Layout.CELL_WIDTH) / 2;
                // TODO: Use localized tier names.
                const tierLabel: string = `Tier ${tier}`;
                const labelY: number = gridStartY - 10;
                dividers.push(`
                    <text
                        x="${tierCenterX}"
                        y="${labelY}"
                        text-anchor="middle"
                        font-size="12"
                        font-weight="bold"
                        fill="var(--vscode-descriptionForeground)"
                    >
                        ${tierLabel}
                    </text>
                `);
            }
        }

        return dividers.join("");
    }
}
