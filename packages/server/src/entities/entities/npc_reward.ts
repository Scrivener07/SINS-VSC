import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _ } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class NpcReward extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.npc_reward"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "npc-reward-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty("exotic_type", _.string(PointerType.exotic));
        this.setProperty("exotics", _.array({ items: _.string(PointerType.exotic) }));

        this.setSchema(schema);
        return this.config;
    }
}
