import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class Font extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.font"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "font-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const defs: any = schema.$defs;

        defs.ttf_ptr = { ...defs.ttf_ptr, pointer: PointerType.ttf };

        this.setSchema(schema);
        return this.config;
    }
}
