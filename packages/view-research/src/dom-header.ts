export class Header extends HTMLDivElement {
    public readonly player: PlayerSelect;
    public readonly domain: DomainSelect;
    private readonly zoomSection: ZoomControl;
    public readonly connections: ConnectionControl;

    constructor() {
        super();
        this.className = "header";

        this.player = new PlayerSelect();
        this.domain = new DomainSelect();
        this.zoomSection = new ZoomControl();
        this.connections = new ConnectionControl();

        this.appendChild(this.player);
        this.appendChild(this.domain);
        this.appendChild(this.zoomSection);
        this.appendChild(this.connections);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("research-header", Header, options);
    }
}

export class PlayerSelect extends HTMLDivElement {
    /** The ID of the player selector element. */
    private static readonly PLAYER_SELECTOR_ID: string = "player-selector";
    private readonly label: HTMLLabelElement;
    public readonly select: HTMLSelectElement;

    constructor() {
        super();
        this.label = document.createElement("label");
        this.label.htmlFor = PlayerSelect.PLAYER_SELECTOR_ID;
        this.label.className = "control-label";
        this.label.textContent = "Player:";

        this.select = document.createElement("select");
        this.select.id = PlayerSelect.PLAYER_SELECTOR_ID;
        this.select.className = "player-selector";

        const option: HTMLOptionElement = document.createElement("option");
        option.value = "";
        option.textContent = "Loading players...";

        this.select.appendChild(option);
        this.appendChild(this.label);
        this.appendChild(this.select);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("player-control", PlayerSelect, options);
    }

    public populate(players: string[]): boolean {
        this.select.disabled = true;
        this.select.innerHTML = "";

        if (players.length === 0) {
            const missingOption: HTMLOptionElement = document.createElement("option");
            missingOption.value = "";
            missingOption.textContent = "No players available";
            missingOption.disabled = true;
            missingOption.selected = true;
            this.select.add(missingOption);
            return false;
        } else {
            const default_option: HTMLOptionElement = document.createElement("option");
            default_option.value = "";
            default_option.textContent = "Select a player...";
            default_option.disabled = true;
            default_option.selected = true;
            this.select.add(default_option);
        }

        for (const player of players) {
            const option: HTMLOptionElement = document.createElement("option");
            option.value = player;
            option.textContent = player;
            this.select.add(option);
        }

        this.select.disabled = false;
        return true;
    }
}

export class DomainSelect extends HTMLDivElement {
    /** The ID of the domain tabs container. */
    public static readonly DOMAIN_TABS_ID: string = "domain-tabs";

    public readonly civilian: HTMLButtonElement;
    public readonly military: HTMLButtonElement;

    constructor() {
        super();
        this.id = DomainSelect.DOMAIN_TABS_ID;
        this.className = "domain-tabs";

        this.civilian = DomainSelect.createTabButton("tab-civilian", "civilian", "Civilian", true);
        this.military = DomainSelect.createTabButton("tab-military", "military", "Military", false);

        this.appendChild(this.civilian);
        this.appendChild(this.military);
    }

    private static createTabButton(id: string, domain: string, label: string, isActive: boolean): HTMLButtonElement {
        const button: HTMLButtonElement = document.createElement("button");
        button.id = id;
        button.className = isActive ? "domain-tab active" : "domain-tab";
        button.dataset.domain = domain;
        button.textContent = label;
        return button;
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("domain-control", DomainSelect, options);
    }
}

export class ZoomControl extends HTMLDivElement {
    constructor() {
        super();
        this.className = "zoom-controls";

        const zoomOut: HTMLButtonElement = ZoomControl.createZoomButton("zoom-out", "-", "Zoom Out (Ctrl+-)");
        const zoomLevel: HTMLSpanElement = document.createElement("span");
        zoomLevel.id = "zoom-level";
        zoomLevel.className = "zoom-level";
        zoomLevel.textContent = "100%";

        const zoomIn: HTMLButtonElement = ZoomControl.createZoomButton("zoom-in", "+", "Zoom In (Ctrl++)");
        const zoomReset: HTMLButtonElement = ZoomControl.createZoomButton("zoom-reset", "⊙", "Reset Zoom (Ctrl+0)");

        this.appendChild(zoomOut);
        this.appendChild(zoomLevel);
        this.appendChild(zoomIn);
        this.appendChild(zoomReset);
    }

    private static createZoomButton(id: string, text: string, title: string): HTMLButtonElement {
        const button: HTMLButtonElement = document.createElement("button");
        button.id = id;
        button.className = "zoom-button";
        button.title = title;
        button.textContent = text;
        return button;
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("zoom-control", ZoomControl, options);
    }
}

export class ConnectionControl extends HTMLDivElement {
    /** The ID of the node connection selector element. */
    public static readonly NODE_CONNECTION_SELECTOR_ID: string = "node-connection-selector";

    public readonly checkbox: HTMLInputElement;

    constructor() {
        super();

        const label: HTMLLabelElement = document.createElement("label");
        label.htmlFor = ConnectionControl.NODE_CONNECTION_SELECTOR_ID;
        label.className = "control-label";
        label.textContent = "Connections:";

        this.checkbox = document.createElement("input");
        this.checkbox.id = ConnectionControl.NODE_CONNECTION_SELECTOR_ID;
        this.checkbox.type = "checkbox";
        this.checkbox.className = "node-connection-selector";

        this.appendChild(label);
        this.appendChild(this.checkbox);
    }

    public static define(): void {
        const options: ElementDefinitionOptions = { extends: "div" };
        customElements.define("connection-control", ConnectionControl, options);
    }
}
