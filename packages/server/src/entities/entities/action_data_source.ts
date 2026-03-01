import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _, SchemaNode } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class ActionDataSource extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.action_data_source"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "action-data-source-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);
        this.setProperty("sounds", _.array({ items: _.string(PointerType.sound), uniqueItems: true }));
        this.setProperty("particle_effect", _.string(PointerType.particle_effect));
        this.setProperty("beam", _.string(PointerType.beam_effect));
        this.setProperty("buff", _.string(PointerType.buff));
        this.setProperty("mutation", _.string(PointerType.mutation));
        this.setProperty("target_filters", _.array({ items: _.string(PointerType.target_filter_id), uniqueItems: true }));
        this.setSchema(schema);
        return this.config;
    }
}
