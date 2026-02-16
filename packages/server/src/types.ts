import { PointerType } from "./pointers";

/**
 * Represents the current entity being processed.
 * This interface wraps the `enum` value type so that it can be passed by reference and updated in place.
 */
export interface IEntityState {
    /** The current entity type being processed. */
    pointer: PointerType;
}

/**
 * Represents the current localization language settings.
 * This interface wraps the `string` value type so that it can be passed by reference and updated in place.
 */
export interface ILanguageState {
    /** The current language code ("en", "de", "fr"). */
    code: string;
}
