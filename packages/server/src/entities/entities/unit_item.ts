import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _ } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class UnitItem extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.unit_item"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-item-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: any = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty(
            "planet_types",
            _.array({
                items: _.string(PointerType.planet_type),
                uniqueItems: true
            }),
            true
        );

        this.setProperty("ability", _.string(PointerType.ability));
        this.setProperty("arbitary_pre_details_label", _.string(PointerType.localized_text));
        this.setProperty("unit_mutations", _.array({ items: _.string(PointerType.mutation), uniqueItems: true }));
        this.setProperty("exotic_type", _.string(PointerType.exotic));
        this.setProperty("tags", _.array({ items: _.string(PointerType.weapon_tag), uniqueItems: true, maxItems: 32 }));
        this.setProperty("weapon_tag", _.string(PointerType.weapon_tag));

        this.setSchema(schema);
        return this.config;
    }
}
