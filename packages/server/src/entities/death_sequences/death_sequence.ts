import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class DeathSequence extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["*.death_sequence"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath_dev, "death-sequence-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
