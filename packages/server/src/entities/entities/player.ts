import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class Player extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.player"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "player-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: any = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty("buildable_units", _.array({ items: _.string(PointerType.unit) }));
        this.setProperty("structures", _.array({ items: _.string(PointerType.unit) }));

        this.setSchema(schema);
        return this.config;
    }
}
