import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class UnitMutationUniforms extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["unit_mutation.uniforms"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-mutation-uniforms-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        this.getNodeMap(schema);
        this.setProperty("localized_name", _.string(PointerType.localized_text));

        this.setSchema(schema);
        return this.config;
    }
}
