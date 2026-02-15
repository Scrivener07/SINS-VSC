import { IDataProvider, KeyType, ValueString } from "./types";

// implements IDataProvider<TKey>
// export abstract class ProviderBase<TKey, TValue> {
//     public identifier: string;
//     public name: string;
//     public priority: number;

//     protected cache = new Map<TKey, TValue>();
//     private listeners: Array<() => void> = [];

//     constructor(identifier: string, name: string, priority: number, entries: Array<[TKey, TValue]>) {
//         this.identifier = identifier;
//         this.name = name;
//         this.priority = priority;

//         for (const [key, entry] of entries) {
//             this.cache.set(key, entry);
//         }
//     }

//     public async load(): Promise<void> {
//         throw new Error("Load method must be implemented by subclass");
//     }

//     public has(key: TKey): boolean {
//         return this.cache.has(key);
//     }

//     public get(key: TKey): TValue | undefined {
//         return this.cache.get(key);
//     }

//     public getAll(): Iterable<[TKey, TValue]> {
//         return this.cache.entries();
//     }

//     public onDidChange(listener: () => void): () => void {
//         this.listeners.push(listener);
//         return () => {
//             this.listeners = this.listeners.filter((listened) => listened !== listener);
//         };
//     }
// }
