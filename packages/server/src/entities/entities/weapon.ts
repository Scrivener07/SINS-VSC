import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class Weapon extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.weapon"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "weapon-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;
        props.name = { ...props.name, pointer: PointerType.localized_text };
        props.tags = { ...props.tags, pointer: PointerType.weapon_tag, uniqueItems: true };
        props.bombing_damage = { type: "number" };

        this.setSchema(schema);
        return this.config;
    }
}
