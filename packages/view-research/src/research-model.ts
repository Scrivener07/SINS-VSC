import { IResearchSubject } from "@soase/shared";
import { Log } from "./services/log";

export class ResearchModel {
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

    constructor() {
        this.players = [];
        this.playerSelection = null;
        this.domainSelection = ResearchDomain.CIVILIAN;
        this.subjects = [];
        this.subjectsFiltered = [];
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
}

export enum ResearchDomain {
    CIVILIAN = "civilian",
    MILITARY = "military"
}
