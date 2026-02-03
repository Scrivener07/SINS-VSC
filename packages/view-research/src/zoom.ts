import { Log } from "./services/log";

export class ZoomController {
    /** The main container element for the research tree. */
    private container: HTMLElement;

    /** The current zoom level.*/
    public zoomLevel: number = ZoomController.ZOOM_RESET;

    /** The ID of the zoom level display element. */
    private static readonly ZOOM_LEVEL_ID: string = "zoom-level";

    /** Default zoom level. (1.0 = 100%) */
    private static readonly ZOOM_RESET: number = 1.0;

    /** Minimum zoom level. */
    private static readonly ZOOM_MIN: number = 0.25;

    /** Maximum zoom level. */
    private static readonly ZOOM_MAX: number = 2.0;

    /** Zoom step per button click. */
    private static readonly ZOOM_STEP: number = 0.05;

    constructor(container: HTMLElement) {
        this.container = container;
        this.setupZoomControls();
    }

    private setupZoomControls(): void {
        const zoomInButton: HTMLElement | null = document.getElementById("zoom-in");
        const zoomOutButton: HTMLElement | null = document.getElementById("zoom-out");
        const zoomResetButton: HTMLElement | null = document.getElementById("zoom-reset");

        if (zoomInButton) {
            zoomInButton.addEventListener("click", () => this.zoomIn());
        }
        if (zoomOutButton) {
            zoomOutButton.addEventListener("click", () => this.zoomOut());
        }
        if (zoomResetButton) {
            zoomResetButton.addEventListener("click", () => this.zoomReset());
        }

        const wheelOptions: AddEventListenerOptions = { passive: false };
        this.container.addEventListener("wheel", (e) => this.container_OnWheel(e), wheelOptions);
        document.addEventListener("keydown", (e) => this.document_OnKeyDown(e));
    }

    private zoomIn(): void {
        this.setZoom(this.zoomLevel + ZoomController.ZOOM_STEP);
    }

    private zoomOut(): void {
        this.setZoom(this.zoomLevel - ZoomController.ZOOM_STEP);
    }

    private zoomReset(): void {
        this.setZoom(ZoomController.ZOOM_RESET);
    }

    private container_OnWheel(e: WheelEvent): void {
        // Check for the Ctrl key (Cmd on Mac).
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }

        e.preventDefault();

        // Determine the zoom direction.
        let delta: number;
        if (e.deltaY > 0) {
            delta = -ZoomController.ZOOM_STEP;
        } else {
            delta = ZoomController.ZOOM_STEP;
        }
        this.setZoom(this.zoomLevel + delta);
    }

    private document_OnKeyDown(e: KeyboardEvent): void {
        // Check for the Ctrl/Cmd key.
        if (!e.ctrlKey && !e.metaKey) {
            return;
        }

        switch (e.key) {
            case "+":
            case "=":
                e.preventDefault();
                this.zoomIn();
                break;
            case "-":
                e.preventDefault();
                this.zoomOut();
                break;
            case "0":
                e.preventDefault();
                this.zoomReset();
                break;
        }
    }

    public setZoom(level: number): void {
        // Clamp the zoom level.
        this.zoomLevel = Math.max(ZoomController.ZOOM_MIN, Math.min(ZoomController.ZOOM_MAX, level));

        // Apply the zoom transform to the SVG element.
        const svg: SVGElement | null = this.container.querySelector("svg");
        if (svg) {
            svg.style.transform = `scale(${this.zoomLevel})`;
        }

        // Update the zoom level display.
        const zoomDisplay: HTMLElement | null = document.getElementById(ZoomController.ZOOM_LEVEL_ID);
        if (zoomDisplay) {
            zoomDisplay.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }

        Log.info(`<ZoomController::setZoom> Zoom level: ${zoomDisplay.textContent}`);
    }
}
