/**
 * A directed acyclic graph of data source dependencies.
 *
 * Each node is identified by its directory (the same key used by DataSource).
 * Edges point from a dependent to its dependency:
 * If SGR depends on MEM, the graph has an edge from SGR → MEM.
 *
 * The graph makes no assumptions about how dependencies are declared.
 * It is populated externally which MAY be from workspace settings, a future mod_meta_data field,
 * a `.dependencies` file, or some other mechanism.
 */
export class DependencyGraph {
    /** directory → set of directories this source depends on (direct only). */
    private readonly edges = new Map<string, Set<string>>();

    /**
     * Declares that `dependent` depends on `dependency`.
     * Both are identified by their root directory path.
     */
    public addEdge(dependent: string, dependency: string): void {
        let dependencies: Set<string> | undefined = this.edges.get(dependent);
        if (!dependencies) {
            dependencies = new Set();
            this.edges.set(dependent, dependencies);
        }
        dependencies.add(dependency);
    }

    /**
     * Removes all edges for a given source (when it's removed from the workspace).
     */
    public removeNode(directory: string): void {
        this.edges.delete(directory);
        for (const dependencies of this.edges.values()) {
            dependencies.delete(directory);
        }
    }

    /**
     * Replaces all dependency declarations.
     * Used when workspace configuration changes.
     */
    public rebuild(declarations: ReadonlyArray<{ dependent: string; dependencies: string[] }>): void {
        this.edges.clear();
        for (const declaration of declarations) {
            for (const dependency of declaration.dependencies) {
                this.addEdge(declaration.dependent, dependency);
            }
        }
    }

    /**
     * Returns the transitive closure of dependencies for a source,
     * INCLUDING the source itself. Ordered from lowest dependency to the source itself
     * (topological order suitable for last-wins resolution).
     *
     * Example: getClosure("SGR") → ["Game", "MEM", "SGR"]
     */
    public getClosure(directory: string): string[] {
        const visited = new Set<string>();
        const order: string[] = [];

        // Recursive. Depth-first, dependencies before dependents.
        const visit = (node: string): void => {
            if (visited.has(node)) {
                return;
            }
            visited.add(node);

            // Visit dependencies first (depth-first, dependencies before dependents).
            const dependencies = this.edges.get(node);
            if (dependencies) {
                for (const dependency of dependencies) {
                    visit(dependency);
                }
            }

            order.push(node);
        };

        visit(directory);
        return order;
    }

    /**
     * Returns the direct dependencies of a source.
     */
    public getDirectDependencies(directory: string): ReadonlySet<string> {
        return this.edges.get(directory) ?? new Set();
    }

    /**
     * Returns all sources that directly depend on the given source.
     * Useful for invalidation: if base game changes, which contexts need rebuilding?
     */
    public getDependents(directory: string): string[] {
        const result: string[] = [];
        for (const [dependent, dependencies] of this.edges) {
            if (dependencies.has(directory)) {
                result.push(dependent);
            }
        }
        return result;
    }
}
