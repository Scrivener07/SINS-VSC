import { ASTNode, PropertyASTNode } from "vscode-json-languageservice";

/**
 * Provides utility methods for working with JSON AST nodes.
 */
export class JsonAST {

	/** An index for the AST node key. */
	public static readonly NODE_KEY: number = 0;

	/** An index for the AST node value. */
	public static readonly NODE_VALUE: number = 1;


	/**
	 * Determines if the given offset is within the bounds of the specified AST node.
	 * @param offset The offset to check.
	 * @param node The AST node to check against.
	 * @returns True if the offset is within the node, false otherwise.
	 */
	public static isWithinSchemaNode(offset: number, node: ASTNode): boolean {
		return offset >= node.offset && offset <= node.offset + node.length;
	}


	/**
	 * Finds all property nodes with the specified key within the given AST node.
	 * @param node The AST node to search within.
	 * @param key The node key to search for.
	 * @param nodes An array to accumulate found nodes (same as the return value).
	 * @returns An array of property nodes with the specified key.
	 */
	public static findNodes(
		node: PropertyASTNode | ASTNode | undefined,
		key: string,
		nodes: PropertyASTNode[] = []
	): PropertyASTNode[] {
		if (!node) {
			return nodes;
		}

		if (node.type === "property" && node.keyNode.value === key) {
			nodes.push(node);
		}

		if (node.type === "array" && node.items) {
			node.items.forEach(child => this.findNodes(child, key, nodes));
		} else if (node.children) {
			node.children.forEach(child => this.findNodes(child, key, nodes));
		}

		return nodes;
	}


	/**
	 * Determines if the given AST node is a JSON value node.
	 * @param node The JSON AST node to check.
	 * @returns True if the node is a value node, false otherwise.
	 */
	public static isNodeValue(node: ASTNode | undefined): boolean {
		if (!node) {
			return false;
		}
		else if (node.parent?.type === "property" && node.parent.children?.[JsonAST.NODE_VALUE] === node) {
			// Its a value in an object property (Key: Value)
			return true;
		}
		else if (node.parent?.type === "array") {
			// Its an item in an array
			return true;
		}
		else if (!node.parent) {
			// Its the root node (rare, but valid)
			return true;
		}
		else {
			return false;
		}
	}


	/**
	 * Builds a schema property path array from the JSON document structure by traversing parent nodes.
	 * @param node The JSON AST node.
	 * @returns An array of property names from root to the given node.
	 */
	public static getNodePath(node: ASTNode): string[] {
		let current: ASTNode | undefined = node;
		const path: string[] = [];

		while (current) {
			if (current.type === "property" && current.keyNode) {
				const key: string = current.keyNode.value as string;
				path.unshift(key);
			}
			current = current.parent;
		}

		return path;
	}


}
