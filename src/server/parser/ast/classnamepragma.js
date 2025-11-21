/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 */

const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const { ElementPattern, SemanticTokenType, SemanticTokenModifier } = require('../enums');

class ClassNamePragmaNode extends PragmaNode {

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);
    }

    /**
     * @type {NodeParser}
     */
    parse(state) {
        // Check if class pragma has already appeared
        if (state.className) {
            state.addError(
                'A %class pragma has already been specified'
            );
            return;
        }

        // Check for parameter validity
        const paramsToken = this.paramsToken;
        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;
        if (!paramMatch) {
            state.addError(
                'The %class pragma expects a single valid C++ class name as parameter'
            );
            return;
        }

        // Check for terminator
        if (!this.terminatorToken) {
            state.addError('A %class pragma should end with a semicolon');
            return;
        }

        state.className = paramMatch[1];
    }

    getFormattedLines() {
        return [`%class ${this.paramsToken?.lexeme.trim()};`];
    }
}

module.exports = {
    ClassNamePragmaNode
};
