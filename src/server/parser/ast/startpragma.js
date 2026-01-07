/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 */


const { LexicalToken } = require('../lexicaltoken');
const { PragmaNode } = require('./pragmacore');
const { ElementPattern, ErrorSeverity, SemanticTokenType } = require('../enums');

class StartPragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #ruleNameToken;

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
            ? paramsToken.lexeme.match(ElementPattern.RuleName)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %start pragma expects a single valid rule name as parameter'
            );
            return;
        }

        if (!this.validateTerminator(state, 'start')) {
            return;
        }

        const ruleNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            0,
            paramsToken.range.start.character
        );

        if(!ruleNameToken) {
            state.addError(
                'The %start pragma expects a single valid rule name as parameter'
            );
            return;
        }

        this.#ruleNameToken = ruleNameToken;

        const ruleName = ruleNameToken.lexeme;
        state.setStartRuleName(ruleName);
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return this.getReferenceForToken(character, this.#ruleNameToken, 'rule');
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        return this.getTokensForReference(noderef, this.#ruleNameToken, 'rule');
    }

    getFormattedLines() {
        if (!this.#ruleNameToken) return [''];

        return [`%start ${this.#ruleNameToken.lexeme.trim()};`];
    }

    /** @returns {SemanticToken[]} */
    getSemanticTokens() {
        const semToks = super.getSemanticTokens();
        semToks.push(...this.createSemanticTokensFor(
            [this.#ruleNameToken],
            SemanticTokenType.Function
        ));
        return semToks;
    }
}

module.exports = {
    StartPragmaNode
};