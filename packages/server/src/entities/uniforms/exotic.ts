import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";
import { SchemaBuilder as _ } from "../../schema-builder";

export class ExoticUniforms extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["exotic.uniforms"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath, "exotic-uniforms-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		const defs: any = schema.$defs;
		defs.exotic_type_uniform_data.properties.entity = _.string(PointerType.exotic);

		this.setSchema(schema);
		return this.config;
	}
}
