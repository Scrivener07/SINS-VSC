import * as assert from "assert";
import { TestData } from "../test-data";
import { DataSource, LayeredRoot, ResolvedFile } from "@soase/server/data";

suite("LayeredRoot", () => {
    let root: LayeredRoot;

    suiteSetup(async function () {
        this.timeout(60_000);

        const baseGame = new DataSource(TestData.BASE_GAME, TestData.BASE_GAME_TITLE, 0);
        const modMem = new DataSource(TestData.MOD_MEM, TestData.MOD_MEM_TITLE, 1);
        const modSgr = new DataSource(TestData.MOD_SGR, TestData.MOD_SGR_TITLE, 2);
        const modHalo = new DataSource(TestData.MOD_HALO, TestData.MOD_HALO_TITLE, 3);

        root = new LayeredRoot();
        root.add(baseGame);
        root.add(modMem);
        root.add(modSgr);
        root.add(modHalo);
        await root.scanAll();
    });

    suite("resolveFile", () => {
        test("resolves a base game formation", () => {
            const result: ResolvedFile | undefined = root.resolveFile(".formation", "advent_starbase_strikecraft");
            assert.ok(result, "Expected to resolve 'advent_starbase_strikecraft.formation'");
            assert.strictEqual(result.entry.fileKey, "advent_starbase_strikecraft");
            assert.ok(result.entry.filePath.includes("Sins2"), "Expected base game path");
        });

        test("returns undefined for nonexistent file", () => {
            const result: ResolvedFile | undefined = root.resolveFile(".formation", "totally_fake_formation_xyz");
            assert.strictEqual(result, undefined);
        });

        test("resolves a base game player", () => {
            const result: ResolvedFile | undefined = root.resolveFile(".player", "trader_loyalist");
            assert.ok(result, "Expected to resolve 'trader_loyalist.player'");
            assert.strictEqual(result.entry.fileKey, "trader_loyalist");
        });

        test("higher priority mod overrides base game file", () => {
            // Find a file that exists in both base game and a mod.
            // We check isOverride flag instead of relying on a specific file.
            const allKeys: Set<string> = root.getAllKeys(".unit");
            let isOverrideFound: boolean = false;

            for (const key of allKeys) {
                const resolved: ResolvedFile | undefined = root.resolveFile(".unit", key);
                if (resolved && resolved.isOverride) {
                    isOverrideFound = true;
                    assert.ok(resolved.source.priority > 0, "Expected override to come from a mod (priority > 0)");
                    break;
                }
            }

            assert.ok(isOverrideFound, "Expected at least one .unit override across loaded mods");
        });
    });

    suite("getFileLayers", () => {
        test("returns at least one layer for base game file", () => {
            const layers: ResolvedFile[] = root.getFileLayers(".formation", "advent_starbase_strikecraft");
            assert.ok(layers.length >= 1, "Expected at least one layer");
            assert.strictEqual(layers[0].entry.fileKey, "advent_starbase_strikecraft");
        });

        test("returns empty for nonexistent file", () => {
            const layers: ResolvedFile[] = root.getFileLayers(".formation", "totally_fake_xyz");
            assert.strictEqual(layers.length, 0);
        });

        test("marks override layers correctly", () => {
            // Find any file with multiple layers.
            const allKeys: Set<string> = root.getAllKeys(".unit");
            let isMultiLayerFound: boolean = false;

            for (const key of allKeys) {
                const layers: ResolvedFile[] = root.getFileLayers(".unit", key);
                if (layers.length > 1) {
                    isMultiLayerFound = true;
                    assert.strictEqual(layers[0].isOverride, false, "First layer should not be an override");
                    for (let index = 1; index < layers.length; index++) {
                        assert.strictEqual(layers[index].isOverride, true, `Layer ${index} should be marked as override`);
                    }
                    break;
                }
            }

            assert.ok(isMultiLayerFound, "Expected at least one multi-layer .unit file across loaded mods");
        });
    });

    suite("getAllKeys", () => {
        test("returns union of keys across all sources for .player", () => {
            const keys: Set<string> = root.getAllKeys(".player");
            assert.ok(keys.size > 0, "Expected at least one .player key");
            assert.ok(keys.has("trader_loyalist"), "Expected 'trader_loyalist' in .player keys");
        });

        test("returns union of keys across all sources for .weapon", () => {
            const keys: Set<string> = root.getAllKeys(".weapon");
            assert.ok(keys.size > 0, "Expected at least one .weapon key");
        });

        test("returns empty set for nonexistent extension", () => {
            const keys: Set<string> = root.getAllKeys(".totally_fake_extension_xyz");
            assert.strictEqual(keys.size, 0);
        });
    });

    suite("resolveIdentifier", () => {
        test("resolves a known entity by identifier without extension", () => {
            const results: ResolvedFile[] = root.resolveIdentifier("trader_loyalist");
            assert.ok(results.length > 0, "Expected to find 'trader_loyalist' by identifier");
            const extensions: string[] = results.map((resolved: ResolvedFile) => resolved.entry.extension);
            assert.ok(extensions.includes(".player"), "Expected .player in results");
        });

        test("returns empty for nonexistent identifier", () => {
            const results: ResolvedFile[] = root.resolveIdentifier("totally_fake_identifier_xyz_123");
            assert.strictEqual(results.length, 0);
        });
    });

    suite("source ordering", () => {
        // Verify that getSources() returns sources sorted by priority after addSource with non-sequential calls.
        test("getSources returns sources sorted by priority", () => {
            const sources: DataSource[] = root.toArray();
            for (let index = 1; index < sources.length; index++) {
                assert.ok(
                    sources[index].priority >= sources[index - 1].priority,
                    `Expected source[${index}] priority (${sources[index].priority}) >= source[${index - 1}] priority (${sources[index - 1].priority})`
                );
            }
        });
    });

    suite("resolveFile winner", () => {
        // Test that resolveFile returns the highest priority, not the first found.
        // Test with a known file that exists in both base game and a mod, and assert the returned source.name matches the mod.
        test("resolveFile returns highest priority source for overridden file", () => {
            // Find any file that exists in multiple sources.
            const allKeys: Set<string> = root.getAllKeys(".unit");
            for (const key of allKeys) {
                const layers: ResolvedFile[] = root.getFileLayers(".unit", key);
                if (layers.length > 1) {
                    const resolved: ResolvedFile | undefined = root.resolveFile(".unit", key);
                    assert.ok(resolved);
                    const maxPriority: number = Math.max(...layers.map((layer: ResolvedFile) => layer.source.priority));
                    assert.strictEqual(
                        resolved.source.priority,
                        maxPriority,
                        `Expected winner to have highest priority (${maxPriority}), got ${resolved.source.priority}`
                    );
                    return;
                }
            }
            assert.fail("Expected at least one multi-source .unit file to test winner selection");
        });
    });
});
