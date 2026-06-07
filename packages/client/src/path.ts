import * as path from "path";

export class Path {
    /**
     * Normalizes a file path by resolving `.` and `..` segments and removing any trailing slashes or backslashes.
     * @remarks For non-key usage (display/logging/io). Keeps root paths intact.
     * @param value The file path to normalize.
     * @returns The normalized file path.
     */
    public static normalize(value: string): string {
        value = path.normalize(value);
        return Path.trim(value);
    }

    /**
     * Converts a file path to a key by normalizing it and converting it to lowercase.
     * @remarks Canonical dictionary key for file system paths. Case-insensitive for Windows.
     * @param value The file path to convert to a key.
     * @returns The key corresponding to the given file path.
     */
    public static toKey(value: string): string {
        value = Path.normalize(value);
        if (process.platform === "win32") {
            return value.toLowerCase();
        } else {
            return value;
        }
    }

    /**
     * Trims trailing slashes or backslashes from a file path, except for the root path.
     * @param value The file path to trim.
     * @returns The trimmed file path.
     */
    private static trim(value: string): string {
        const root: string = path.parse(value).root;
        if (value === root) {
            return value;
        } else {
            return value.replace(/[\\/]+$/, "");
        }
    }
}
