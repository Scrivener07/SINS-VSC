import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class LocalizedText extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.localized_text"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "localized-text-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.patternProperties;
        props[".*"] = _.string(PointerType.localized_text);

        this.setSchema(schema);

        return this.config;
    }
}
