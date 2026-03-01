import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import * as path from "path";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class EntityManifest extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.entity_manifest"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "entity-manifest-schema.json"];

    public patch(pointer: PointerType): SchemaConfiguration {
        this.setUri(...[this.path[0], `${path.basename(this.path[1], ".json")}-${PointerType[pointer]}.json`]);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);
        this.setProperty("ids", _.array({ items: _.string(pointer) }));

        this.setSchema(schema);
        return this.config;
    }
}
