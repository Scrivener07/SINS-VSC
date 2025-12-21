import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";

export class FlightPattern extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["*.flight_pattern"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath, "flight-pattern-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
