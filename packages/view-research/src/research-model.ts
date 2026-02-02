import { IResearchUniform, IResearchSubject } from "@soase/shared";
import { Log } from "./services/log";

export class ResearchModel extends EventTarget {
    public static readonly STATUS_CHANGED: string = "statusMessageChanged";

    /** The grid layout data derived from research uniforms. */
    public grid: GridLayoutModel;

    /** The available player identifiers. */
    public players: string[];

    /** The currently selected player ID. */
    public playerSelection: string | null;

    /** The currently selected domain (civilian or military). */
    public domainSelection: ResearchDomain;

    /** The full research data for the selected player. */
    public subjects: IResearchSubject[];

    /** The currently filtered research data to render. */
    public subjectsFiltered: IResearchSubject[];

    /** Determines if node connections are visibly enabled. */
    public nodeConnectionsEnabled: boolean;

    private _statusMessage: string | null;
    public get statusMessage(): string | null {
        return this._statusMessage;
    }

    constructor() {
        super();
        this.grid = new GridLayoutModel(null);
        this.players = [];
        this.playerSelection = null;
        this.domainSelection = ResearchDomain.Civilian;
        this.subjects = [];
        this.subjectsFiltered = [];
        this.nodeConnectionsEnabled = false;
        this._statusMessage = null;
    }

    public setUniforms(uniforms: IResearchUniform | null): void {
        this.grid = new GridLayoutModel(uniforms);
    }

    public setDomain(domain: ResearchDomain): void {
        this.domainSelection = domain;
        Log.info(`<ResearchModel::setDomain> Domain set to: ${this.domainSelection}`);
        this.doFilter();
    }

    public setSubjects(subjects: IResearchSubject[]): void {
        this.subjects = subjects;
        Log.info(`<ResearchModel::setSubjects> Loaded ${this.subjects.length} research subjects for player: ${this.playerSelection}`);
        this.doFilter();
    }

    /**
     * Filters the data by the selected domain.
     */
    private doFilter(): void {
        this.subjectsFiltered = this.subjects.filter(this.filterByDomain.bind(this));
        Log.info(`<ResearchModel::doFilter> Filtered ${this.subjectsFiltered.length} nodes for domain: ${this.domainSelection}`);
    }

    /**
     * Filters research subjects by the selected domain.
     * @param node The research subject node.
     * @returns True if the node matches the selected domain.
     */
    private filterByDomain(node: IResearchSubject): boolean {
        const nodeDomain: string = node.field?.toLowerCase() || "";
        return nodeDomain.includes(this.domainSelection);
    }

    public setStatusMessage(message: string | null): void {
        if (this._statusMessage !== message) {
            this._statusMessage = message;
            this.dispatchEvent(new CustomEvent<string | null>(ResearchModel.STATUS_CHANGED, { detail: message }));
        }
    }
}

/**
 * Represents a research domain.
 */
export enum ResearchDomain {
    Civilian = "civilian",
    Military = "military"
}

/**
 * Represents a view model for the research uniform data from `research.uniforms`.
 */
export class GridLayoutModel {
    /** The research uniform data. */
    private readonly uniforms: IResearchUniform | null;

    /** The name labels of each tier. */
    public get tier_names(): string[] {
        return this.uniforms?.tier_names || [];
    }

    /** The maximum number of tiers in the research grid. */
    public get tier_count(): number {
        return this.uniforms?.max_tier_count || 0;
    }

    /** The number of columns per tier. */
    public get column_per_tier_count(): number {
        return this.uniforms?.per_tier_column_count || 0;
    }

    /** Gets the total number of columns in the research grid. */
    public get column_count(): number {
        return this.tier_count * this.column_per_tier_count;
    }

    /** Determines whether to use tier names or numeric labels. */
    public useTierName: boolean;

    /**
     * Constructs a new grid layout view model.
     * @param uniforms The research uniform data to use.
     */
    constructor(uniforms: IResearchUniform | null) {
        this.uniforms = uniforms;
        this.useTierName = true;
    }

    public getTierLabelFor(tier: number) {
        if (this.useTierName) {
            return this.tier_names[tier];
        } else {
            return `Tier ${tier}`;
        }
    }
}
