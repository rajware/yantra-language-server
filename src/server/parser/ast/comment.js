/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { ASTNode } = require('./astcore');
const { LexicalToken } = require('../lexicaltoken');
const { RepeatedElementPattern, SemanticTokenType, ErrorSeverity } = require('../enums');


class CommentNode extends ASTNode {
    /** @type {string|undefined} */
    #lineText;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super('comment', state.fullLineRange());
    }

    /** @type {NodeParser} */
    parse(state) {
        this.#lineText = state.lineText;
    }

    /**
     * Preseve spaces before //, but ensure one space after it, unless 
     * immediately followed by a hash.
     * @returns {string[]}
     */
    getFormattedLines() {
        if(!this.#lineText) return [''];
        return [this.#lineText.replace(/^(\s*?)\/\/([^\s#])/, "$1// $2")];
    }

    getSemanticTokens() {
        return [
            {
                range: this.range,
                tokenType: SemanticTokenType.Comment,
                tokenModifiers: []
            }
        ];
    }
}

module.exports = {
    CommentNode
}