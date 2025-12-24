import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class Exotic extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.exotic"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "exotic-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;

        props.name = { ...props.name, pointer: PointerType.localized_text };
        props.description = { ...props.description, pointer: PointerType.localized_text };
        props.tooltip_icon = { ...props.tooltip_icon, pointer: PointerType.brush };
        props.small_icon = { ...props.small_icon, pointer: PointerType.brush };
        props.large_icon = { ...props.large_icon, pointer: PointerType.brush };
        props.picture = { ...props.picture, pointer: PointerType.brush };

        this.setSchema(schema);
        return this.config;
    }
}
