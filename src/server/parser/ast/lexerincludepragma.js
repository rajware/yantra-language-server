/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const {
    ElementPattern,
    SemanticTokenType, SemanticTokenModifier
} = require('../enums');

class LexerIncludePragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #modeNameToken;

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
        if (!this.paramsToken) {
            state.addError(
                'The %lexer_include pragma requires a valid lexer mode name'
            );
            return;
        }

        const paramsMatch = this.paramsToken.lexeme.match(ElementPattern.LexerMode);
        if (!paramsMatch) {
            state.addError(
                'The %lexer_include pragma requires a valid lexer mode name'
            );
            return;
        }

        if (!this.validateTerminator(state, 'lexer_include')) {
            return;
        }

        this.#modeNameToken = state.lexicalTokenFromSubmatch(
            paramsMatch,
            1,
            this.paramsToken.range.start.character
        );

        const modeName = this.#modeNameToken.lexeme;

        // Check if the lexer mode exists
        if (!state.lookupReference({ type: 'lexermode', name: modeName })) {
            // Add forward reference - will be resolved when %lexer_mode is defined
            state.addForwardReference(
                modeName,
                'lexermode',
                this.#modeNameToken.range
            );
        }
        // If it exists, no action needed - just validation
    }

    /**
     * @param {Number} character 
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return this.getReferenceForToken(character, this.#modeNameToken, 'lexermode');
    }

    /**
     * @param {Reference} reference
     * @returns {LexicalToken[]}
     */
    getLexicalTokensFor(reference) {
        return this.getTokensForReference(reference, this.#modeNameToken, 'lexermode');
    }

    /**
     * @returns {string[]}
     */
    getFormattedLines() {
        const modeName = this.#modeNameToken?.lexeme ?? '';
        return [`%lexer_include ${modeName};`];
    }

    /**
     * @returns {SemanticToken[]}
     */
    getSemanticTokens() {
        const superToks = super.getSemanticTokens();
        superToks.push(...this.createSemanticTokensFor(
            [this.#modeNameToken],
            SemanticTokenType.Variable
        ));
        return superToks;
    }
}

module.exports = {
    LexerIncludePragmaNode
};
