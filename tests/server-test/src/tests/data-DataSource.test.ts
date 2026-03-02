import * as assert from "assert";
import { TestData } from "../test-data";
import { DataSource, FileEntry } from "@soase/server/data";

suite("DataSource", () => {
    let source: DataSource;

    suiteSetup(async function () {
        this.timeout(30_000);
        source = new DataSource(TestData.BASE_GAME, TestData.BASE_GAME_TITLE, 0);
        await source.scan();
    });

    suite("scanning", () => {
        test("scan is idempotent", async function () {
            // What happens if `scan()` is called again? Does it duplicate entries or correctly clear and repopulate?
            this.timeout(30_000);
            const countBefore: number = source.getFilesByExtension(".player")?.size ?? 0;
            await source.scan();
            const countAfter: number = source.getFilesByExtension(".player")?.size ?? 0;
            assert.strictEqual(countAfter, countBefore, "Expected same count after re-scan");
        });

        test("scan populates .player files", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".player");
            assert.ok(bucket, "Expected .player bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .player file");
            assert.ok(bucket.size >= 6, `Expected at least 6 .player files (base game has ~6 factions), got ${bucket.size}`);
        });

        test("scan populates .research_subject files", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".research_subject");
            assert.ok(bucket, "Expected .research_subject bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .research_subject file");
        });

        test("scan populates .weapon files", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".weapon");
            assert.ok(bucket, "Expected .weapon bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .weapon file");
        });

        test("scan populates .formation files", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".formation");
            assert.ok(bucket, "Expected .formation bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .formation file");
        });

        test("scan populates .localized_text files", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".localized_text");
            assert.ok(bucket, "Expected .localized_text bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .localized_text file");
            assert.ok(bucket.has("en"), "Expected 'en' localized_text to exist");
        });

        test("scan populates texture files (.png)", () => {
            const bucket: Map<string, FileEntry> | undefined = source.getFilesByExtension(".png");
            assert.ok(bucket, "Expected .png bucket to exist");
            assert.ok(bucket.size > 0, "Expected at least one .png file");
        });
    });

    suite("getFile", () => {
        test("getFile returns a known formation", () => {
            const entry: FileEntry | undefined = source.getFile(".formation", "advent_starbase_strikecraft");
            assert.ok(entry, "Expected to find advent_starbase_strikecraft.formation");
            assert.strictEqual(entry.fileKey, "advent_starbase_strikecraft");
            assert.strictEqual(entry.extension, ".formation");
            assert.ok(entry.filePath.endsWith(".formation"), "Expected filePath to end with .formation");
        });

        test("getFile returns undefined for missing key", () => {
            const entry: FileEntry | undefined = source.getFile(".formation", "nonexistent_formation_xyz");
            assert.strictEqual(entry, undefined);
        });

        test("getFile is case-insensitive on fileKey", () => {
            const lower: FileEntry | undefined = source.getFile(".formation", "advent_starbase_strikecraft");
            const upper: FileEntry | undefined = source.getFile(".formation", "ADVENT_STARBASE_STRIKECRAFT");
            // Both should resolve since DataSource lowercases keys during scan.
            assert.ok(lower, "Expected lowercase lookup to succeed");
            assert.ok(upper, "Expected uppercase lookup to succeed");
            assert.strictEqual(lower!.filePath, upper!.filePath);
        });
    });

    suite("getExtensions", () => {
        test("getExtensions returns known extensions", () => {
            const extensions: Set<string> = new Set(source.getExtensions());
            assert.ok(extensions.has(".formation"), "Expected .formation extension");
            assert.ok(extensions.has(".player"), "Expected .player extension");
            assert.ok(extensions.has(".weapon"), "Expected .weapon extension");
            assert.ok(extensions.has(".unit"), "Expected .unit extension");
            assert.ok(extensions.has(".localized_text"), "Expected .localized_text extension");
        });
    });
});
