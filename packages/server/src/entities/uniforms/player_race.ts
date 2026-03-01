import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class PlayerRaceUniforms extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["player_race.uniforms"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath, "player-race-uniforms-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
