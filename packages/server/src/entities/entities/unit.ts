import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class Unit extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.unit"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "unit-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

        const defs: any = schema.$defs;
        defs.unit_skin_definition_group.items.properties.skins = {
            ...defs.unit_skin_definition_group.items.properties.skins,
            pointer: PointerType.unit_skin,
            uniqueItems: true
        };
        defs.unit_weapons_definition.properties.weapons.items.properties.weapon = {
            ...defs.unit_weapons_definition.properties.weapons.items.properties.weapon,
            pointer: PointerType.weapon
        };

        this.setSchema(schema);
        return this.config;
    }
}
