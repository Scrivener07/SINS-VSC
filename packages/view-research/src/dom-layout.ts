export class Layout {
    /** The width of each research node cell. */
    public static readonly CELL_WIDTH: number = 180;

    /** The height of each research node cell. */
    public static readonly CELL_HEIGHT: number = 120;

    /** The padding around the research tree. */
    public static readonly PADDING: number = 20;
}

export class MessageText {
    public static create(text: string): HTMLDivElement {
        const division: HTMLDivElement = document.createElement("div");
        division.style.padding = "20px";
        division.textContent = text;
        return division;
    }
}
