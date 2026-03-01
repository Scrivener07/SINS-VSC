import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class WeaponUniforms extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["weapon.uniforms"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "weapon-uniforms-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;

        props.weapon_tags.items.properties.localized_name = {
            ...props.weapon_tags.items.properties.localized_name,
            pointer: PointerType.localized_text
        };

        this.setSchema(schema);
        return this.config;
    }
}
