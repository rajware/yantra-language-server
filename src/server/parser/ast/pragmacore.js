/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').SemanticToken} SemanticToken
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