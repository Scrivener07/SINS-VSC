import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _ } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class Ability extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.ability"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "ability-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty("target_filters", _.array({ items: _.string(PointerType.target_filter_id), uniqueItems: true }));
        this.setProperty("unit_level_for_has_unit_level_constraint_value", _.string(PointerType.action_value_id));
        this.setProperty("buff_on_agent", _.string(PointerType.buff));
        this.setSchema(schema);
        return this.config;
    }
}
