/** Utility class for creating SVG elements.
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG
 */
export class SVG {
    /** The XML namespace for SVG elements as a constant literal. */
    public static readonly NAMESPACE = "http://www.w3.org/2000/svg" as const;

    /**
     * Creates an SVG element with the given tag name.
     * @param tag The SVG tag name to create.
     * @returns The created SVG element.
     */
    public static create<TAG extends keyof SVGElementTagNameMap>(tag: TAG): SVGElementTagNameMap[TAG] {
        return document.createElementNS(SVG.NAMESPACE, tag);
    }
}
