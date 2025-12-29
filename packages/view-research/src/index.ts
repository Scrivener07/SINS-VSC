import "./styles.css";
import { VSCode, acquireVsCodeApi } from "./vscode";
import { Log } from "./log";
import { ResearchRenderer } from "./renderer";
import * as shared from "@soase/shared";
import { ConnectionControl, DomainSelect, Header, PlayerSelect, ZoomControl } from "./dom-header";
import { ResearchView } from "./dom-container";

/**
 * The main application class for the research visualizer.
 */
class Application {
    /**
     * The aquired VSCode API object.
     */
    private readonly vscode: VSCode = acquireVsCodeApi();

    /**
     * The main renderer for the research visualizer.
     */
    private readonly renderer: ResearchRenderer;

    /**
     * A constructor that instantiates a new application instance.
     */
    constructor() {
        Log.initialize(this.vscode);
        Header.define();
        ResearchView.define();
        PlayerSelect.define();
        DomainSelect.define();
        ZoomControl.define();
        ConnectionControl.define();

        // Instantiate the renderer.
        this.renderer = new ResearchRenderer(this.vscode);

        // Listen for messages from extension
        window.addEventListener("message", (event) => this.onMessage(event));

        // Signal ready state to the extension.
        this.vscode.postMessage({ type: shared.ViewResponse.READY });
    }

    /**
     * Handles message events from the extension host.
     * @param event The message event.
     */
    private onMessage(event: MessageEvent<any>) {
        // Delegate message events to the renderer.
        this.renderer.onMessage(event.data);
    }
}

/**
 * The main entry point for the research visualizer webview.
 * Instantiate the application instance.
 */
void new Application();
