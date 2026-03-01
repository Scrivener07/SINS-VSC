import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class MeshMaterial extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.mesh_material"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath_dev, "mesh-material-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const defs: any = schema.$defs;
        defs.file_texture_ptr = _.string(PointerType.texture);

        this.setSchema(schema);
        return this.config;
    }
}
