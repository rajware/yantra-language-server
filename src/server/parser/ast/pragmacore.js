/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { ASTNode } = require('./astcore');
const { LexicalToken } = require('../lexicaltoken');
const { SemanticTokenType, SemanticTokenModifier } = require('../enums');

class PragmaNode extends ASTNode {
    #name
    #params
    #terminator

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super('pragma', state.fullLineRange());

        this.#name = state.lexicalTokenFromMatch(1);
        this.#params = state.lexicalTokenFromMatch(2);
        this.#terminator = state.lexicalTokenFromMatch(3);
    }

    get name() {
        return this.#name.lexeme
    }

    get nameToken() {
        return this.#name;
    }

    get paramsToken() {
        return this.#params
    }

    get terminatorToken() {
        return this.#terminator
    }

    // /**
    //  * Checks if the parameters of a pragma are a repeated pattern only
    //  * @param {RegExp} repeatingPattern 
    //  * @returns {RegExpMatchArray[]|undefined}
    //  */
    // _matchRepeatingPattern(repeatingPattern) {
    //     const paramsToken = this.#params;
    //     return !paramsToken
    //         ? undefined
    //         : ensureOnly(repeatingPattern).test(paramsToken.lexeme)
    //             ? Array.from(paramsToken.lexeme.matchAll(repeatingPattern))
    //             : undefined
    // }

    /**
     * Marks the pragma name as a keyword.
     * If overriden, should call super.getSemanticTokens() and push these
     * tokens first.
     * @returns {SemanticToken[]}
     */
    getSemanticTokens() {
        /** @type {SemanticToken} */
        const pragmaNameTok = {
            range: this.#name.range,
            tokenType: SemanticTokenType.Keyword,
            tokenModifiers: []
        };

        pragmaNameTok.range.start.character--;

        return [pragmaNameTok];
    }

    /**
     * Validates that the pragma ends with a semicolon.
     * @param {IParseState} state
     * @param {string} pragmaName
     * @returns {boolean}
     */
    validateTerminator(state, pragmaName) {
        if (!this.#terminator) {
            state.addError(`A %${pragmaName} pragma should end with a semicolon`);
            return false;
        }
        return true;
    }

    /**
     * Creates a reference if the character position is inside a token.
     * Helper method to reduce duplication in getReferenceAt() implementations.
     * @param {number} character - Character position to check
     * @param {LexicalToken|undefined} token - Token to check
     * @param {"function" | "rule" | "token" | "walker" | "lexermode"} type - Reference type (e.g., 'walker', 'token', 'rule')
     * @returns {Reference|null}
     */
    getReferenceForToken(character, token, type) {
        if (token?.isCharacterInside(character)) {
            return { type, name: token.lexeme };
        }
        return null;
    }

    /**
     * Gets lexical tokens for a reference if it matches the expected type and name.
     * Helper method to reduce duplication in getLexicalTokensFor() implementations.
     * @param {Reference} noderef - The reference to query
     * @param {LexicalToken|undefined} token - Token to check
     * @param {string} expectedType - Expected reference type
     * @returns {LexicalToken[]}
     */
    getTokensForReference(noderef, token, expectedType) {
        /** @type LexicalToken[] */
        const tokens = [];
        if (noderef.type !== expectedType) return tokens;
        if (!token) return tokens;
        if (token.lexeme !== noderef.name) return tokens;

        tokens.push(token);
        return tokens;
    }

    /**
     * Creates semantic tokens for a list of lexical tokens.
     * Helper method to reduce duplication in getSemanticTokens() implementations.
     * @param {(LexicalToken|undefined)[]} tokens - Array of tokens (undefined values are filtered out)
     * @param {number} tokenType - SemanticTokenType value
     * @param {number[]} modifiers - Array of SemanticTokenModifier values
     * @returns {SemanticToken[]}
     */
    createSemanticTokensFor(tokens, tokenType, modifiers = []) {
        return tokens
            .filter(t => t !== undefined)
            .map(token => ({
                range: token.range,
                tokenType,
                tokenModifiers: modifiers
            }));
    }
}

/**
 * A stand-in for all valid pragmas, which have not yet
 * been properly wired up in the JavaScript parsers.
 */
class StubPragmaNode extends PragmaNode {

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);
    }
}

module.exports = {
    PragmaNode,
    StubPragmaNode
};