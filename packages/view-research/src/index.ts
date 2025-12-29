import "./styles.css";
import { VSCode, acquireVsCodeApi } from "./vscode";
import { Log } from "./log";
import { ViewResponse } from "@soase/shared";
import { ResearchPresenter } from "./renderer";
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
    private readonly presenter: ResearchPresenter;

    /**
     * A constructor that instantiates a new application instance.
     */
    constructor() {
        Log.initialize(this.vscode);
        Application.defines();

        // Instantiate the renderer.
        this.presenter = new ResearchPresenter(this.vscode);

        // Listen for messages from extension
        window.addEventListener("message", (event) => this.onMessage(event));

        // Signal ready state to the extension.
        this.vscode.postMessage({ type: ViewResponse.READY });
    }

    /**
     * Defines all custom elements used in the application.
     */
    private static defines(): void {
        Header.define();
        ResearchView.define();
        PlayerSelect.define();
        DomainSelect.define();
        ZoomControl.define();
        ConnectionControl.define();
    }

    /**
     * Handles message events from the extension host.
     * @param event The message event.
     */
    private onMessage(event: MessageEvent<any>): void {
        // Delegate message events to the renderer.
        this.presenter.onMessage(event.data);
    }
}

/**
 * The main entry point for the research visualizer webview.
 * Instantiate the application instance.
 */
void new Application();
