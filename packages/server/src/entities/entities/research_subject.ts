import { JSONSchema } from "vscode-json-languageservice";
import { SchemaConfiguration } from "vscode-json-languageservice";
import { Entity } from "../entity";
import { SchemaBuilder as _ } from "../../schema-builder";
import { PointerType } from "../../pointers";

export class ResearchSubject extends Entity {
    public config: SchemaConfiguration = { fileMatch: ["*.research_subject"], uri: "" };
    public path: string[] = [this.schemaManager.schemasPath, "research-subject-schema.json"];

    public patch(): SchemaConfiguration {
        this.setUri(...this.path);
        const schema: JSONSchema = this.schemaManager.parseSchema(...this.path);
        this.getNodeMap(schema);

        this.setProperty("extra_text_filter_strings", _.array({ items: _.string(PointerType.localized_text) }));
        this.setProperty(
            "build_kinds",
            _.array({
                items: _.string(PointerType.unit_build_kind)
            })
        );
        this.setProperty(
            "strikecraft_kinds",
            _.array({
                items: _.string(PointerType.strikecraft_type)
            })
        );
        this.setProperty("exotic_type", _.string(PointerType.exotic));
        this.setProperty("after_text", _.string(PointerType.localized_text));
        this.setProperty("before_after_heading", _.string(PointerType.localized_text));
        this.setProperty("heading", _.string(PointerType.localized_text));
        this.setProperty("unit_label", _.string(PointerType.localized_text));
        this.setProperty("unlock_label", _.string(PointerType.localized_text));
        this.setProperty("units_listing", _.array({ items: _.string(PointerType.unit), uniqueItems: true }));
        this.setProperty("upgrade_label", _.string(PointerType.localized_text));
        this.setSchema(schema);
        return this.config;
    }
}
