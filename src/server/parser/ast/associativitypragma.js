/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const { RepeatedElementPattern, SemanticTokenType, ErrorSeverity } = require('../enums');

class AssociativityPragmaNode extends PragmaNode {
    /** @type {LexicalToken[]} */
    #tokenNameTokens;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);

        this.#tokenNameTokens = [];
    }

    /** @type {NodeParser} */
    parse(state) {
        // Check parameters
        const paramsMatch = this.paramsToken.matchRepeatingPattern(RepeatedElementPattern.TokenNames);
        if (!paramsMatch || paramsMatch.length === 0) {
            state.addError(
                `The % ${this.name} pragma expects one or more valid token names`
            );
            return;
        }

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] YantraTokenName
            const yantraTokenNameToken = state.lexicalTokenFromSubmatch(
                paramsMatch[i],
                1,
                this.paramsToken.range.start.character
            );

            this.#tokenNameTokens.push(yantraTokenNameToken);

            const tokenName = yantraTokenNameToken.lexeme;
            const startColumn = yantraTokenNameToken.range.start.character;
            const endColumn = yantraTokenNameToken.range.end.character;

            /** @type {Reference} */
            const tokenReference = {
                name: tokenName,
                type: 'token'
            };

            // The token should not be defined at this point
            if (state.lookupReference(tokenReference)) {
                state.addError(
                    `The %${this.name} should appear before the definition of the token ${tokenName}`,
                    ErrorSeverity.Warning,
                    startColumn,
                    endColumn
                );
            } else {
                // Add a forward reference to the token
                const tokRefRange = yantraTokenNameToken.range;

                state.addForwardReference(
                    tokenName,
                    'token',
                    tokRefRange
                );
            }
        }
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        const defObj = this.#tokenNameTokens?.find((ltoken) => {
            return ltoken.isCharacterInside(character);
        });

        return defObj
            ? { type: 'token', name: defObj.lexeme }
            : null;
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const toks = [];
        if (noderef.type !== 'token') return toks;

        const ref = this.#tokenNameTokens.find(w => w.lexeme === noderef.name);
        if (!ref) return toks;

        toks.push(ref);
        return toks;
    }

    getFormattedLines() {
        const tokenNames = this.#tokenNameTokens.map(tok => tok.lexeme);

        return [`%${this.name} ${tokenNames.join(' ')};`];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        const pragmaToks = super.getSemanticTokens();
        semToks.push(...pragmaToks);

        this.#tokenNameTokens.forEach(ytokenname => {
            semToks.push({
                range: ytokenname.range,
                tokenType: SemanticTokenType.Variable,
                tokenModifiers: []
            });
        });

        return semToks;
    }
}

module.exports = {
    AssociativityPragmaNode
}