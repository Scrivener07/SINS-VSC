import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import * as path from "path";
import { PointerType } from "../../pointers";

export class EntityManifest extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.entity_manifest"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "entity-manifest-schema.json"];

    public patch(pointer: PointerType): SchemaConfiguration {
        this.setUri(...[this.path[0], `${path.basename(this.path[1], ".json")}-${PointerType[pointer]}.json`]);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const props: any = schema.properties;

        props.ids = { ...props.ids, pointer: pointer };

        this.setSchema(schema);
        return this.config;
    }
}
