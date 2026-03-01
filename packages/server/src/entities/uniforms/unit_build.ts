import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class UnitBuildUniforms extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["unit_build.uniforms"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-build-uniforms-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;
        props.build_kinds.items.properties.localized_name = _.string(PointerType.localized_text);

        this.setSchema(schema);
        return this.config;
    }
}
