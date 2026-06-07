import { IDataSource } from "../data";
import { FileWatcherManager } from "./watcher-manager-2";

export class WatcherManagerTestDriver {
    public static async test(fileWatcherManager: FileWatcherManager, gameFolder: IDataSource, modFolders: Map<string, IDataSource>): Promise<void> {
        if (gameFolder) {
            await fileWatcherManager.watch(gameFolder.directory, (events) => {
                console.log(`Game::onWatch: Received ${events.length} file events.`);
                for (const event of events) {
                    console.log(`    ${event.uri} (${event.type})`);
                }
            });
        }

        for (const [key, value] of modFolders) {
            await fileWatcherManager.watch(value.directory, (events) => {
                console.log(`Mod::onWatch: Received ${events.length} file events.`);
                for (const event of events) {
                    console.log(`    ${event.uri} (${event.type})`);
                }
            });
        }
    }
}
