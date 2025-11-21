/**
 * @typedef {import('../lexicaltoken').LexicalToken} LexicalToken
 * @typedef {import('../types').range} range
 * @typedef {import('../types').YantraDefinition} YantraDefinition
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').SemanticToken} SemanticToken
 */

/**
 * @implements {YantraDefinition}
 */
class ASTNode {
    /** @type {string} */
    #type;
    /** @type {range} */
    #range;

    /** 
     * @param {string} type
     * @param {range} range
     */
    constructor(type, range) {
        this.#type = type;
        this.#range = range;
    }

    /**
     * The type of node
     * @type {string}
     */
    get type() {
        return this.#type;
    }

    /**
     * The name of the node, if any
     * @type {string}
     */
    get name() {
        return '';
    }

    /**
     * The range of the node.
     */
    get range() {
        return this.#range;
    }

    /**
     * Parses the node.
     * @type {NodeParser}
     */
    parse(state) {

    }

    /**
     * Gets a reference to another node from the elements
     * in this node, at or around the specified character
     * position. If no reference can be found, returns
     * null.
     * Reminder: A Reference is {type:'', name:'' }
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return null;
    }

    /**
     * Gets a reference to another node or to the current
     * node, based on the specified character position. 
     * If no reference can be found, returns null.
     * Reminder: A Reference is {type:'', name:'' }
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        return this.getReferenceAt(character);
    }

    /**
     * Finds tokens in the current node that reference
     * another node. 
     * Reminder: Return lexical tokens.
     * @param {Reference} reference - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(reference) {
        return [];
    }

    /**
     * Returns a pretty-printed string representation of a
     * node.
     * @returns {string[]}
     */
    getFormattedLines() {
        return [];
    }

    /**
     * Returns any semantic tokens that a node wants to 
     * expose. They should be in ascending order of 
     * range.
     * @returns {SemanticToken[]}
     */
    getSemanticTokens() {
        return [];
    }

    toString() {
        return `AST Node Type: ${this.type}, Name: ${this.name}`;
    }
}

class MultilineASTNode extends ASTNode {
    /**
     * Called at the end of a multi-line node.
     * Returns this node.
     * @param {IParseState} state 
     * @returns {ASTNode}
     */
    end(state) {
        return this;
    }
}

module.exports = {
    ASTNode,
    MultilineASTNode
}