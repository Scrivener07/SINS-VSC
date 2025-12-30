import "./styles.css";
import { ViewResponse } from "@soase/shared";
import { VSCode, acquireVsCodeApi } from "./services/vscode";
import { Log } from "./services/log";
import { ResearchPresenter } from "./research-presenter";
import { ToolbarView, ConnectionControl, DomainSelect, PlayerSelect, ZoomControl } from "./toolbar-view";
import { ResearchView } from "./research-view";

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
        ToolbarView.define();
        ResearchView.define();
        PlayerSelect.define();
        DomainSelect.define();
        ZoomControl.define();
        ConnectionControl.define();
    }

    /**
     * Handles message events from the extension host.
     * Delegates all message events to the presenter.
     * @param event The message event.
     */
    private onMessage(event: MessageEvent<any>): void {
        this.presenter.onMessage(event.data);
    }
}

/**
 * The main entry point for the research visualizer webview.
 * Instantiate the application instance.
 */
void new Application();
