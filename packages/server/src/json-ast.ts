import { ASTNode, PropertyASTNode } from "vscode-json-languageservice";

/**
 * Provides utility methods for working with JSON AST nodes.
 */
export class JsonAST {

	/** An index for the AST node key. */
	public static readonly NODE_KEY: number = 0;

	/** An index for the AST node value. */
	public static readonly NODE_VALUE: number = 1;

	public static isWithinSchemaNode(offset: number, node: ASTNode): boolean {
		return offset >= node.offset && offset <= node.offset + node.length;
	}

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
	 * Determines if the given AST node is a value node.
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

}
