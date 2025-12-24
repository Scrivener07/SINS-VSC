import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class Player extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.player"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "player-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: any = this.schemaManager.parseSchema(...this.path);

        schema.properties.buildable_units = { ...schema.properties.buildable_units, pointer: PointerType.unit };

        this.setSchema(schema);
        return this.config;
    }
}
