import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class MissionsUniforms extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["missions.uniforms"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath, "mission-uniforms-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
