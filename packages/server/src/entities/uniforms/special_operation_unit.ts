import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { PointerType } from "../../pointers";

export class SpecialOperationUnitUniforms extends Entity {
	public config: SchemaConfiguration = { fileMatch: ["special_operation_unit.uniforms"], uri: "" };
	public path: string[] = [this.schemaManager.schemasPath, "special-operation-unit-uniforms-schema.json"];

	public patch(): SchemaConfiguration {
		this.setUri(...this.path);
		const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);

		this.setSchema(schema);
		return this.config;
	}
}
