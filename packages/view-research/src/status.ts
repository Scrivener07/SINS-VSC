export class StatusText {
    public static create(text: string): HTMLDivElement {
        const division: HTMLDivElement = document.createElement("div");
        division.style.padding = "20px";
        division.textContent = text;
        return division;
    }
}
