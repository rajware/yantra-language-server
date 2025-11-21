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
    SemanticTokenType, SemanticTokenModifier,
    ErrorSeverity
} = require('../enums');

class LexerModePragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #modeNameToken;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);
    }


    get name() {
        return this.#modeNameToken?.lexeme ?? '';
    }

    get type() {
        return 'lexermode';
    }
    /**
     * @type {NodeParser}
     */
    parse(state) {
        if (!this.paramsToken) {
            state.addError(
                'The %lexer_mode pragma requires a valid lexer mode name'
            );
            return;
        }

        const paramsMatch = this.paramsToken.lexeme.match(ElementPattern.LexerMode);
        if (!paramsMatch) {
            state.addError(
                'The %lexer_mode pragma requires a valid lexer mode name'
            );
            return;
        }

        if (!this.terminatorToken) {
            state.addError('A token definition should end with a semicolon');
            return;
        }

        this.#modeNameToken = state.lexicalTokenFromSubmatch(
            paramsMatch,
            1,
            this.paramsToken.range.start.character
        );

        // Push definition
        state.addDefinition(this);

        // Remove any forward references for this token
        state.removeForwardReference(this.name, this.type);
    }

    /**
     * 
     * @param {Number} character 
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (this.#modeNameToken?.isCharacterInside(character)) {
            return { name: this.name, type: 'lexermode' };
        }

        return null;
    }

    /**
     * @param {Reference} reference
     * @returns {LexicalToken[]}
     */
    getLexicalTokensFor(reference) {
        /** @type {LexicalToken[]} */
        const toks = [];
        if (!this.#modeNameToken) return toks;

        if (reference.type === this.type && reference.name === this.name) {
            toks.push(this.#modeNameToken);
        }

        return toks;
    }

    /**
     * @returns {string[]}
     */
    getFormattedLines() {
        return [`%lexer_mode ${this.name};`];
    }

    /**
     * @returns {SemanticToken[]}
     */
    getSemanticTokens() {
        const superToks = super.getSemanticTokens();
        if (this.#modeNameToken) {
            superToks.push({
                range: this.#modeNameToken.range,
                tokenType: SemanticTokenType.Variable,
                tokenModifiers: [SemanticTokenModifier.Definition, SemanticTokenModifier.ReadOnly]
            });
        }
        return superToks;
    }
}

module.exports = {
    LexerModePragmaNode
};