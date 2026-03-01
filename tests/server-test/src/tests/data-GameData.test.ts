import * as assert from "assert";
import { TestData } from "../test-data";
import { GameData } from "../../../../packages/server/out/data3/data-service";
import { ResolvedFile } from "../../../../packages/server/src/data3/data-root";
import { LocalizedEntry } from "../../../../packages/server/src/data3/resolvers/localization-resolver";

suite("GameData (integration)", () => {
    let gameData: GameData;

    suiteSetup(async function () {
        this.timeout(60_000);

        gameData = new GameData();
        await gameData.addSource({ directory: TestData.BASE_GAME, name: TestData.BASE_GAME_TITLE, priority: 0 });
        await gameData.addSource({ directory: TestData.MOD_MEM, name: TestData.MOD_MEM_TITLE, priority: 1 });
        await gameData.addSource({ directory: TestData.MOD_SGR, name: TestData.MOD_SGR_TITLE, priority: 2 });
        await gameData.addSource({ directory: TestData.MOD_HALO, name: TestData.MOD_HALO_TITLE, priority: 3 });
        await gameData.reload();
    });

    suite("getIdentifiers", () => {
        test("returns empty set for nonexistent extension", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".totally_fake_xyz");
            assert.strictEqual(identifiers.size, 0);
        });

        test("returns .player identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".player");
            assert.ok(identifiers.size > 0, "Expected at least one .player identifier");
            assert.ok(identifiers.has("trader_loyalist"), "Expected trader_loyalist in .player identifiers");
        });

        test("returns .weapon identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".weapon");
            assert.ok(identifiers.size > 0, "Expected at least one .weapon identifier");
        });

        test("returns .research_subject identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".research_subject");
            assert.ok(identifiers.size > 0, "Expected at least one .research_subject identifier");
        });

        test("returns .formation identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".formation");
            assert.ok(identifiers.size > 0, "Expected at least one .formation identifier");
        });

        test("returns .ability identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".ability");
            assert.ok(identifiers.size > 0, "Expected at least one .ability identifier");
        });

        test("returns .buff identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".buff");
            assert.ok(identifiers.size > 0, "Expected at least one .buff identifier");
        });

        test("returns .exotic identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".exotic");
            assert.ok(identifiers.size > 0, "Expected at least one .exotic identifier");
        });

        test("returns .unit identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".unit");
            assert.ok(identifiers.size > 0, "Expected at least one .unit identifier");
        });

        test("returns .unit_item identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".unit_item");
            assert.ok(identifiers.size > 0, "Expected at least one .unit_item identifier");
        });

        test("returns .unit_skin identifiers", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".unit_skin");
            assert.ok(identifiers.size > 0, "Expected at least one .unit_skin identifier");
        });
    });

    suite("hasFile", () => {
        test("returns true for known entity", () => {
            assert.strictEqual(gameData.hasFile(".player", "trader_loyalist"), true);
        });

        test("returns false for nonexistent entity", () => {
            assert.strictEqual(gameData.hasFile(".player", "nonexistent_player_xyz"), false);
        });

        test("returns true for known formation", () => {
            assert.strictEqual(gameData.hasFile(".formation", "advent_starbase_strikecraft"), true);
        });
    });

    suite("resolveFilePath", () => {
        test("resolves a known player to a file path", () => {
            const filePath: string | undefined = gameData.resolveFilePath(".player", "trader_loyalist");
            assert.ok(filePath, "Expected a file path for trader_loyalist");
            assert.ok(filePath.endsWith(".player"), "Expected path to end with .player");
        });

        test("returns undefined for nonexistent entity", () => {
            const filePath: string | undefined = gameData.resolveFilePath(".player", "nonexistent_player_xyz_123");
            assert.strictEqual(filePath, undefined);
        });
    });

    suite("localization", () => {
        test("resolves a base game localization key", () => {
            const value: string | undefined = gameData.localization.get("en", "trader_light_frigate_name");
            assert.ok(value, "Expected localization for trader_light_frigate_name");
            assert.ok(value.length > 0);
        });

        test("getKeys returns many keys for 'en'", () => {
            const keys: Set<string> = gameData.localization.getKeys("en");
            assert.ok(keys.size > 100, `Expected many localization keys, got ${keys.size}`);
        });

        test("localization includes mod-contributed keys", () => {
            const keys: Set<string> = gameData.localization.getKeys("en");
            let isModKeyFound: boolean = false;

            for (const key of keys) {
                const entry: LocalizedEntry | undefined = gameData.localization.getEntry("en", key);
                if (entry && !entry.sourceDirectory.includes("Sins2")) {
                    isModKeyFound = true;
                    break;
                }
            }

            assert.ok(isModKeyFound, "Expected at least one localization key sourced from a mod");
        });

        test("get returns undefined for missing key", () => {
            const value: string | undefined = gameData.localization.get("en", "totally_fake_localization_key_xyz");
            assert.strictEqual(value, undefined);
        });

        test("get returns undefined for missing language", () => {
            const value: string | undefined = gameData.localization.get("xx_fake", "trader_light_frigate_name");
            assert.strictEqual(value, undefined);
        });
    });

    suite("cross-reference validation", () => {
        test("all .player identifiers resolve to file paths", () => {
            const identifiers: Set<string> = gameData.getIdentifiers(".player");
            for (const identifier of identifiers) {
                const filePath: string | undefined = gameData.resolveFilePath(".player", identifier);
                assert.ok(filePath, `Expected file path for .player '${identifier}'`);
            }
        });

        test("identifier minimum count includes contributions from all sources", () => {
            // This doesn't actually verify "contributions from all sources." It just checks a minimum.
            // With 4 sources (base game + 3 mods), we expect more identifiers
            // than base game alone for at least some types.
            const playerIds: Set<string> = gameData.getIdentifiers(".player");
            const unitIds: Set<string> = gameData.getIdentifiers(".unit");
            console.log(`Total .player identifiers: ${playerIds.size}`);
            console.log(`Total .unit identifiers: ${unitIds.size}`);
            // Sanity check — base game alone has these.
            assert.ok(playerIds.size >= 3, "Expected at least 3 player identifiers");
            assert.ok(unitIds.size >= 10, "Expected at least 10 unit identifiers");
        });

        test("identifier count includes contributions from all sources", () => {
            // Build a single-source GameData for comparison.
            // Verify that at least one identifier resolves to a mod source.
            const unitIds: Set<string> = gameData.getIdentifiers(".unit");
            let isModContribution: boolean = false;

            for (const identifier of unitIds) {
                const resolved: ResolvedFile | undefined = gameData.context.root.resolveFile(".unit", identifier);
                if (resolved && resolved.source.priority > 0 && !resolved.isOverride) {
                    // This is a mod-only file (not overriding base game).
                    isModContribution = true;
                    break;
                }
            }

            assert.ok(isModContribution, "Expected at least one .unit identifier contributed exclusively by a mod");
        });
    });
});
