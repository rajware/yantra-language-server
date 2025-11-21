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
        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %default_walker pragma expects a single valid walker name as parameter'
            );
            return;
        }

        if (!this.terminatorToken) {
            state.addError('A %default_walker pragma should end with a semicolon');
            return;
        }

        const walkerNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            1,
            this.paramsToken.range.start.character
        );
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
        if (this.#walkerReferenceToken?.isCharacterInside(character)) {
            return { type: 'walker', name: this.#walkerReferenceToken.lexeme };
        }

        return null;
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const refs = [];
        if (noderef.type !== 'walker') return refs;
        if(!this.#walkerReferenceToken) return refs;
        if (this.#walkerReferenceToken.lexeme !== noderef.name) return refs;

        refs.push(this.#walkerReferenceToken);

        return refs;
    }

    getFormattedLines() {
        if(!this.#walkerReferenceToken) return [''];

        return [`%default_walker ${this.#walkerReferenceToken.lexeme.trim()};`];
    }

    /** @returns {SemanticToken[]} */
    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        const pragmaToks = super.getSemanticTokens();
        semToks.push(...pragmaToks);

        // As far as possible, ignore errors while returning
        // semantic tokens.
        if (this.#walkerReferenceToken) {
            semToks.push({
                range: this.#walkerReferenceToken.range,
                tokenType: SemanticTokenType.Class,
                tokenModifiers: []
            });
        }

        return semToks;
    }
}

module.exports = {
    DefaultWalkerPragmaNode
}