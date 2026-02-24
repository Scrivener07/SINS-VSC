import * as assert from "assert";
import { OrderedRoot } from "../../../packages/server/out/data/root-ordered";
import { IDataProvider, IDataValue, IMergeStrategy, IResolution } from "../../../packages/server/out/data/types";

/** A simple string value type for testing. */
interface TestValue extends IDataValue<string> {
    value: string;
    sourcePath: string;
}

/** A last-wins merge strategy for testing. */
class ReplaceMerge implements IMergeStrategy<TestValue> {
    merge(existing: TestValue, incoming: TestValue): TestValue {
        return incoming;
    }
}

/** A fake in-memory provider for testing. */
class MockProvider implements IDataProvider<TestValue> {
    public readonly identifier: string;
    public readonly name: string;
    public readonly priority: number;

    private data: Map<string, TestValue>;
    private listeners: Array<() => void> = [];

    constructor(identifier: string, name: string, priority: number, entries: [string, string][]) {
        this.identifier = identifier;
        this.name = name;
        this.priority = priority;
        this.data = new Map<string, TestValue>();
        for (const [key, value] of entries) {
            this.data.set(key, { value, sourcePath: `/${identifier}/${key}` });
        }
    }

    public async load(): Promise<void> {
        // No-op for tests.
    }

    public has(key: string): boolean {
        return this.data.has(key);
    }

    public get(key: string): TestValue | undefined {
        return this.data.get(key);
    }

    public getAll(): Iterable<[string, TestValue]> {
        return this.data.entries();
    }

    public onDidChange(listener: () => void): () => void {
        this.listeners.push(listener);
        return function () {
            // No-op unsubscribe for tests.
        };
    }

    /** Replace all data and notify listeners (simulates a file change). */
    public setData(entries: [string, string][]): void {
        this.data.clear();
        for (const [key, value] of entries) {
            this.data.set(key, { value, sourcePath: `/${this.identifier}/${key}` });
        }
    }
}

suite("OrderedRoot", function () {
    let root: OrderedRoot<TestValue>;
    let strategy: ReplaceMerge;

    setup(function () {
        strategy = new ReplaceMerge();
        root = new OrderedRoot<TestValue>(strategy);
    });

    suite("empty state", function () {
        test("has() returns false for any key", function () {
            assert.strictEqual(root.has("anything"), false);
        });

        test("get() returns undefined for any key", function () {
            assert.strictEqual(root.get("anything"), undefined);
        });

        test("getLayers() returns an empty array for any key", function () {
            const layers: IResolution<TestValue>[] = root.getLayers("anything");
            assert.strictEqual(layers.length, 0);
        });
    });

    suite("single provider", function () {
        let provider: MockProvider;

        setup(async function () {
            provider = new MockProvider("game", "Game", 0, [
                ["unit_a", "Unit Alpha"],
                ["unit_b", "Unit Bravo"]
            ]);
            root.addProvider(provider);
            await root.reloadAll();
        });

        test("has() returns true for existing keys", function () {
            assert.strictEqual(root.has("unit_a"), true);
            assert.strictEqual(root.has("unit_b"), true);
        });

        test("has() returns false for missing keys", function () {
            assert.strictEqual(root.has("unit_c"), false);
        });

        test("get() returns the correct value", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution, "Expected a resolution for 'unit_a'.");
            assert.strictEqual(resolution.item.value, "Unit Alpha");
            assert.strictEqual(resolution.key, "unit_a");
        });

        test("get() includes correct provider id", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.providerId, "game");
        });

        test("get() marks single-provider entries as not overridden", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.isOverride, false);
        });

        test("getLayers() returns one layer per key", function () {
            const layers: IResolution<TestValue>[] = root.getLayers("unit_a");
            assert.strictEqual(layers.length, 1);
            assert.strictEqual(layers[0].providerId, "game");
        });
    });

    suite("multiple providers with priority", function () {
        let gameProvider: MockProvider;
        let modProvider: MockProvider;

        setup(async function () {
            gameProvider = new MockProvider("game", "Game", 0, [
                ["unit_a", "Game Unit Alpha"],
                ["unit_b", "Game Unit Bravo"]
            ]);
            modProvider = new MockProvider("mod", "Mod", 10, [
                ["unit_a", "Mod Unit Alpha"],
                ["unit_c", "Mod Unit Charlie"]
            ]);
            root.addProvider(gameProvider);
            root.addProvider(modProvider);
            await root.reloadAll();
        });

        test("higher priority provider wins on conflict", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Mod Unit Alpha");
            assert.strictEqual(resolution.providerId, "mod");
        });

        test("conflicting key is marked as overridden", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.isOverride, true);
        });

        test("non-conflicting key from low priority provider is preserved", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_b");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Game Unit Bravo");
            assert.strictEqual(resolution.providerId, "game");
            assert.strictEqual(resolution.isOverride, false);
        });

        test("non-conflicting key from high priority provider is preserved", function () {
            const resolution: IResolution<TestValue> | undefined = root.get("unit_c");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Mod Unit Charlie");
            assert.strictEqual(resolution.providerId, "mod");
            assert.strictEqual(resolution.isOverride, false);
        });

        test("getLayers() returns both providers for conflicting key in priority order", function () {
            const layers: IResolution<TestValue>[] = root.getLayers("unit_a");
            assert.strictEqual(layers.length, 2);
            assert.strictEqual(layers[0].providerId, "game");
            assert.strictEqual(layers[0].isOverride, false);
            assert.strictEqual(layers[1].providerId, "mod");
            assert.strictEqual(layers[1].isOverride, true);
        });
    });

    suite("removeProvider", function () {
        let gameProvider: MockProvider;
        let modProvider: MockProvider;

        setup(async function () {
            gameProvider = new MockProvider("game", "Game", 0, [["unit_a", "Game Unit Alpha"]]);
            modProvider = new MockProvider("mod", "Mod", 10, [["unit_a", "Mod Unit Alpha"]]);
            root.addProvider(gameProvider);
            root.addProvider(modProvider);
            await root.reloadAll();
        });

        test("removing the winning provider reverts to the lower priority value", function () {
            root.removeProvider("mod");
            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Game Unit Alpha");
            assert.strictEqual(resolution.providerId, "game");
            assert.strictEqual(resolution.isOverride, false);
        });

        test("removing a provider makes its unique keys disappear", async function () {
            const soloMod = new MockProvider("mod2", "Mod2", 20, [["unit_z", "Mod2 Unit Zulu"]]);
            root.addProvider(soloMod);
            await root.reloadAll();

            assert.strictEqual(root.has("unit_z"), true);
            root.removeProvider("mod2");
            assert.strictEqual(root.has("unit_z"), false);
        });
    });

    suite("incremental reload", function () {
        let gameProvider: MockProvider;
        let modProvider: MockProvider;

        setup(async function () {
            gameProvider = new MockProvider("game", "Game", 0, [["unit_a", "Game Original"]]);
            modProvider = new MockProvider("mod", "Mod", 10, [["unit_a", "Mod Original"]]);
            root.addProvider(gameProvider);
            root.addProvider(modProvider);
            await root.reloadAll();
        });

        test("reloading a provider picks up new data", async function () {
            modProvider.setData([["unit_a", "Mod Updated"]]);
            await root.reloadProvider("mod");

            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Mod Updated");
        });

        test("reloading a provider that removes a key falls back to lower priority", async function () {
            modProvider.setData([]);
            await root.reloadProvider("mod");

            const resolution: IResolution<TestValue> | undefined = root.get("unit_a");
            assert.ok(resolution);
            assert.strictEqual(resolution.item.value, "Game Original");
            assert.strictEqual(resolution.providerId, "game");
        });

        test("reloading a non-existent provider does nothing", async function () {
            await root.reloadProvider("nonexistent");
            assert.strictEqual(root.has("unit_a"), true);
        });
    });
});
