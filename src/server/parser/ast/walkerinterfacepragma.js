/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const { ElementPattern, ErrorSeverity, SemanticTokenType, SemanticTokenModifier } = require('../enums');

class WalkerInterfacePragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #walkerNameToken;
    /** @type {LexicalToken|undefined} */
    #baseClassNameToken;

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
        const paramsToken = this.paramsToken;
        if (!paramsToken) return;

        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.WalkerInterfaceDefinition)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %walker_interface pragma expects a valid walker name followed by a valid C++ classname'
            );
            return;
        }

        const walkerNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            1,
            paramsToken.range.start.character
        );

        this.#walkerNameToken = walkerNameToken;

        this.#baseClassNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            2,
            paramsToken.range.start.character
        );

        const walkerName = walkerNameToken.lexeme;
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        /** @type {Reference} */
        const walkerReference = { name: walkerName, type: 'walker' };

        // Add an error if the walker has not been defined
        if (!state.lookupReference(walkerReference)) {
            state.addError(
                `A walker called '${walkerName}' has not been defined`,
                ErrorSeverity.Error,
                startColumn,
                endColumn
            );
            return;
        }

        // Check for semicolon
        if (!this.validateTerminator(state, 'walker_interface')) {
            return;
        }

    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return this.getReferenceForToken(character, this.#walkerNameToken, 'walker');
    }

    /**
 * @param {Reference} noderef - The reference to be queried in the current Node
 * @returns {LexicalToken[]} - The lexical token(s) which match the reference
 */
    getLexicalTokensFor(noderef) {
        return this.getTokensForReference(noderef, this.#walkerNameToken, 'walker');
    }

    getFormattedLines() {
        if (!this.#walkerNameToken || !this.#baseClassNameToken) return [''];

        return [`%walker_interface ${this.#walkerNameToken.lexeme.trim()} ${this.#baseClassNameToken.lexeme.trim()};`];
    }

    /** @returns {SemanticToken[]} */
    getSemanticTokens() {
        const semToks = super.getSemanticTokens();
        semToks.push(...this.createSemanticTokensFor(
            [this.#walkerNameToken, this.#baseClassNameToken],
            SemanticTokenType.Class
        ));
        return semToks;
    }
}

module.exports = {
    WalkerInterfacePragmaNode
};