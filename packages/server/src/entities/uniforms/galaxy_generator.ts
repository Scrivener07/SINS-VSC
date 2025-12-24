import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class GalaxyGenerator extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["galaxy_generator.uniforms"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "galaxy-generator-uniforms-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;

        props.fillings = { type: "object" };

        this.setSchema(schema);
        return this.config;
    }
}
