import * as assert from "assert";
import * as vscode from "vscode";
import { GameDirectory } from "../../../packages/client/out/environment";

suite("GameDirectory", function () {
    test("isValid() returns true for a valid game directory", async function () {
        const directory: vscode.Uri = vscode.Uri.file("C:/Program Files (x86)/Steam/steamapps/common/Sins2");
        const result: boolean = await GameDirectory.isValid(directory);
        assert.strictEqual(result, true, "Expected the game directory to be valid.");
    });

    test("isValid() returns false for a non-existent directory", async function () {
        const directory: vscode.Uri = vscode.Uri.file("C:/this/does/not/exist");
        const result: boolean = await GameDirectory.isValid(directory);
        assert.strictEqual(result, false);
    });

    test("get() always returns a non-empty path", async function () {
        const result: vscode.Uri = await GameDirectory.get();
        assert.ok(result.fsPath.length > 0, "Expected a non-empty file path.");
    });

    test("get() returns a path ending with 'Sins2' when falling back to default", async function () {
        const result: vscode.Uri = await GameDirectory.get();
        assert.ok(result.fsPath.endsWith("Sins2"), `Expected path to end with 'Sins2', got: ${result.fsPath}`);
    });
});
