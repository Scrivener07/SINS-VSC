import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class Unit extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.unit"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty(
            "skins",
            _.array({
                items: _.string(PointerType.unit_skin),
                uniqueItems: true
            })
        );
        this.setProperty("prerequisites", _.array({ items: _.array({ items: _.string(PointerType.research_subject) }) }), true);
        this.setProperty("weapon", _.string(PointerType.weapon));
        this.setProperty("mesh_alias_name", _.string(PointerType.unit_child_mesh_alias_name));
        this.setProperty("planet_type", _.string(PointerType.planet_type));
        this.setProperty("abilities", _.array({ items: _.string(PointerType.ability) }));
        this.setSchema(schema);
        return this.config;
    }
}
