import { IResearchSubject } from "@soase/shared";
import { Log } from "./log";

export class DataController {
    /** The currently selected domain (civilian or military). */
    public domainSelection: string = "civilian";

    /** The full research data for the selected player. */
    public subjects: IResearchSubject[];

    /** The currently filtered research data to render. */
    public subjectsFiltered: IResearchSubject[];

    constructor() {
        this.subjects = [];
        this.subjectsFiltered = [];
    }

    /**
     * Filters the data by the selected domain.
     */
    public doFilter(): void {
        this.subjectsFiltered = this.subjects.filter(this.filterByDomain.bind(this));
        Log.info(`<DataController::doFilter> Filtered ${this.subjectsFiltered.length} nodes for domain: ${this.domainSelection}`);
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
