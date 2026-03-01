import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class Weapon extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.weapon"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "weapon-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        const props: any = schema.properties;
        props.bombing_damage = _.number();

        this.getNodeMap(schema);
        this.setProperty("name", _.string(PointerType.localized_text));
        this.setProperty("tags", _.array({ items: _.string(PointerType.weapon_tag), uniqueItems: true }));
        this.setProperty("attack_target_type_groups", _.array({ items: _.string(PointerType.attack_target_type_group), uniqueItems: true }));

        this.setSchema(schema);
        return this.config;
    }
}
