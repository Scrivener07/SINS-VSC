import * as assert from "assert";
import * as path from "path";
import { JSONSchema, SchemaConfiguration } from "vscode-json-languageservice";
import { SchemaManager } from "../../../../packages/server/out/managers/schema";

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..", "..", "..");
const RESOURCES_ROOT: string = path.join(PROJECT_ROOT, "dist", "resources");

suite("SchemaManager", function () {
    let schemaManager: SchemaManager;

    setup(function () {
        schemaManager = new SchemaManager();
        schemaManager.schemasPath = path.join(RESOURCES_ROOT, "schemas");
        schemaManager.schemasPath_dev = path.join(RESOURCES_ROOT, "schemas-dev");
        schemaManager.unknown_schema = path.join(RESOURCES_ROOT, "schemas-dev", "unknown-schema.json");
    });

    test("configure() returns a non-empty array of schema configurations", function () {
        const configurations: SchemaConfiguration[] = schemaManager.configure();
        assert.ok(Array.isArray(configurations), "Expected configurations to be an array.");
        assert.ok(configurations.length > 0, "Expected at least one schema configuration.");
    });

    test("each configuration has a fileMatch and uri", function () {
        const configurations: SchemaConfiguration[] = schemaManager.configure();
        for (const config of configurations) {
            assert.ok(config.fileMatch, `Expected fileMatch to be defined, got: ${JSON.stringify(config)}`);
            assert.ok(config.uri, `Expected uri to be defined, got: ${JSON.stringify(config)}`);
        }
    });

    test("parseSchema() returns a valid JSON schema object", function () {
        const schema: JSONSchema = schemaManager.parseSchema(schemaManager.schemasPath, "player-schema.json");
        assert.ok(schema, "Expected a non-null schema object.");
        assert.ok(typeof schema === "object", "Expected schema to be an object.");
    });

    test("parseSchema() returns an object with schema properties", function () {
        const schema: JSONSchema = schemaManager.parseSchema(schemaManager.schemasPath, "player-schema.json");
        assert.ok("$defs" in schema || "properties" in schema || "type" in schema, "Expected schema to have $defs, properties, or type.");
    });
});
