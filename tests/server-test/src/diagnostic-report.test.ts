import * as assert from "assert";
import { Report } from "../../../packages/server/out/providers/diagnostic";

suite("Report", () => {
    test("missingInFiles formats correctly", function () {
        const result: string = Report.missingInFiles("some_unit", "units");
        assert.strictEqual(result, `[units]: "some_unit" is missing.`);
    });

    test("missingInManifest formats correctly", function () {
        const result: string = Report.missingInManifest("some_unit", "units");
        assert.strictEqual(result, `[units]: "some_unit" is missing in units.entity_manifest`);
    });
});
