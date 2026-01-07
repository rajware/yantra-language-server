/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 */


const { LexicalToken } = require('../lexicaltoken');
const { PragmaNode } = require('./pragmacore');
const { ElementPattern, ErrorSeverity, SemanticTokenType } = require('../enums');

class DefaultWalkerPragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #walkerReferenceToken;

    /**
     * 
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state)
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsToken = this.paramsToken;
        if (!paramsToken) return;

        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %default_walker pragma expects a single valid walker name as parameter'
            );
            return;
        }

        if (!this.validateTerminator(state, 'default_walker')) {
            return;
        }

        const walkerNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            1,
            paramsToken.range.start.character
        );

        if(!walkerNameToken) {
            state.addError(
                'The %default_walker pragma expects a single valid walker name as parameter'
            );
            return;
        }

        // Forgiving
        this.#walkerReferenceToken = walkerNameToken;

        //const walkerReferenceNode = new WalkerNode(walkerNameToken);


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

        // Set the default walker name
        state.defaultWalker = walkerName;
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return this.getReferenceForToken(character, this.#walkerReferenceToken, 'walker');
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        return this.getTokensForReference(noderef, this.#walkerReferenceToken, 'walker');
    }

    getFormattedLines() {
        if (!this.#walkerReferenceToken) return [''];

        return [`%default_walker ${this.#walkerReferenceToken.lexeme.trim()};`];
    }

    /** @returns {SemanticToken[]} */
    getSemanticTokens() {
        const semToks = super.getSemanticTokens();
        semToks.push(...this.createSemanticTokensFor(
            [this.#walkerReferenceToken],
            SemanticTokenType.Class
        ));
        return semToks;
    }
}

module.exports = {
    DefaultWalkerPragmaNode
}