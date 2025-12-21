import { SchemaConfiguration } from "vscode-json-languageservice";
import { SchemaManager } from "../managers";
import { pathToFileURL } from "url";
import * as path from "path";
import { PointerType } from "../pointers";

export abstract class Entity {
    abstract path: string[];
    abstract config: SchemaConfiguration;
    protected schemaManager: SchemaManager;

    constructor(schemaManager: SchemaManager) {
        this.schemaManager = schemaManager;
    }

    protected setUri(...uri: string[]): void {
        this.config.uri = pathToFileURL(path.join(...uri)).toString();
    }

    protected setSchema(schema: any): void {
        this.config.schema = schema;
    }

    abstract patch(pointer?: PointerType): SchemaConfiguration;
}
