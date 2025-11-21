/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 */

const { ASTNode } = require('./astcore');
const { LexicalToken } = require('../lexicaltoken');
const { SemanticTokenType, SemanticTokenModifier } = require('../enums');

class TokenNode extends ASTNode {
    #nameToken;
    #assignmentOperatorToken;
    #valueToken;
    #negatorToken;
    #lexerModeToken;
    #terminatorToken;

    /**
     * @param {IParseState} state
     */
    constructor(state) {
        super('token', state.fullLineRange());

        // The tokendef regexp returns:
        // - [1] token name
        // - [2] assignment operator
        // - [3] token value
        // - [4] "!' if present
        // - [5] lexermode if present
        // - [6] semicolon if present
        this.#nameToken = state.lexicalTokenFromMatch(1);
        this.#assignmentOperatorToken = state.lexicalTokenFromMatch(2);
        this.#valueToken = state.lexicalTokenFromMatch(3);
        this.#negatorToken = state.lexicalTokenFromMatch(4);
        this.#lexerModeToken = state.lexicalTokenFromMatch(5);
        this.#terminatorToken = state.lexicalTokenFromMatch(6);
    }

    get name() {
        return this.#nameToken.lexeme;
    }

    /** @type {NodeParser} */
    parse(state) {
        if (!this.#terminatorToken) {
            state.addError('A token definition should end with a semicolon');
            return;
        }

        // Push definition
        state.addDefinition(this);

        // Remove any forward references for this token
        state.removeForwardReference(this.name, this.type);

        // Add forward reference for lexer mode token, if any
        if (this.#lexerModeToken && this.#lexerModeToken.lexeme !== '^') {
            state.addForwardReference(
                this.#lexerModeToken.lexeme,
                'lexermode',
                this.#lexerModeToken.range
            );
        }
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (
            this.#lexerModeToken &&
            this.#lexerModeToken.lexeme !== '^' &&
            this.#lexerModeToken.isCharacterInside(character)
        ) {
            return {
                name: this.#lexerModeToken.lexeme,
                type: 'lexermode'
            };
        }

        return null;
    }

    /**
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        if (this.#nameToken.isCharacterInside(character)) {
            return this;
        }

        return this.getReferenceAt(character);
    }

    /**
     * @param {Reference} ref - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(ref) {
        const toks = [];

        if (
            ref.type === 'token' &&
            ref.name === this.name
        ) {
            toks.push(this.#nameToken);
        }

        if (
            ref.type === 'lexermode' &&
            ref.name === this.#lexerModeToken?.lexeme
        ) {
            toks.push(this.#lexerModeToken);
        }

        return toks;
    }

    getFormattedLines() {
        return [`${this.name} := ${this.#valueToken.lexeme}${this.#negatorToken?.lexeme ?? ''}${this.#lexerModeToken ? ' [' + this.#lexerModeToken.lexeme + ']' : ''};`]
    }

    /** @returns {SemanticToken[]} */
    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [
            {
                range: this.#nameToken.range,
                tokenType: SemanticTokenType.Variable,
                tokenModifiers: [SemanticTokenModifier.Declaration]
            },
            {
                range: this.#assignmentOperatorToken.range,
                tokenType: SemanticTokenType.Operator,
                tokenModifiers: []
            },
            {
                range: this.#valueToken.range,
                tokenType: SemanticTokenType.String,
                tokenModifiers: [SemanticTokenModifier.ReadOnly]
            }
        ];

        if (this.#negatorToken) {
            semToks.push({
                range: this.#negatorToken.range,
                tokenType: SemanticTokenType.Operator,
                tokenModifiers: []
            });
        }

        if (this.#lexerModeToken) {
            semToks.push({
                range: this.#lexerModeToken.range,
                tokenType: SemanticTokenType.Parameter,
                tokenModifiers: []
            });
        }

        return semToks;
    }
}

module.exports = {
    TokenNode
};