import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _ } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class UnitSkin extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.unit_skin"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-skin-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty(
            "neutral",
            _.array({
                items: _.string(PointerType.ogg)
            })
        );
        this.setProperty(
            "scared",
            _.array({
                items: _.string(PointerType.ogg)
            })
        );
        this.setProperty(
            "smug",
            _.array({
                items: _.string(PointerType.ogg)
            })
        );
        this.setProperty(
            "sounds",
            _.array({
                items: _.string(PointerType.sound)
            })
        );
        this.setProperty("beam", _.string(PointerType.beam_effect));
        this.setProperty("particle_effect", _.string(PointerType.particle_effect));
        this.setProperty("trail_effect", _.string(PointerType.exhaust_trail_effect), true);

        this.setSchema(schema);
        return this.config;
    }
}
