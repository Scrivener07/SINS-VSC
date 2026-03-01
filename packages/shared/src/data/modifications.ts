/**
 * Represents the meta data information of a Sins of a Solar Empire modification.
 * Uses the file name `.mod_meta_data` with a JSON file format.
 */
export interface ModMetaData {
    /**
     * The game compatibility version must match the current game version for the modification to be considered compatible.
     */
    compatibility_version: number;

    /**
     * Optional and unverified property.
     *
     * TODO: Verify the specification of this property and consider enforcing it.
     * It was observed on the MEM and SGR mods but is not documented anywhere.
     */
    target_game_version?: number | undefined;

    /**
     * The name of this modification that is displayed to users.
     */
    display_name: string;

    /**
     * The version of this modification that is displayed to users.
     */
    display_version: string;

    /**
     * A brief description of this modification.
     */
    short_description: string;

    /**
     * A detailed description of this modification.
     */
    long_description: string;

    /**
     * The logos for this modification which are relative to this modification's root directory.
     */
    logos: {
        /**
         * A file path to the large logo of this modification.
         */
        large_logo: string;

        /**
         * A file path to the small logo of this modification.
         */
        small_logo: string;
    };
}
