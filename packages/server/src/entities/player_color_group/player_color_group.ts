import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class PlayerColorGroup extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["*.player_color_group"], uri: "" };
	public path: string[] = [this.schemaManager.unknown_schema];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
