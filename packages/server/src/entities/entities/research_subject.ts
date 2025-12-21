import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class ResearchSubject extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.research_subject"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "research-subject-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        this.setSchema(schema);
        return this.config;
    }
}
