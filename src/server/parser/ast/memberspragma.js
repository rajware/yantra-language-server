/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const { SemanticTokenType, SemanticTokenModifier, ErrorSeverity } = require('../enums');

class MembersPragmaNode extends PragmaNode {
    /** @type {LexicalToken|undefined} */
    #walkerNameToken;
    /** @type {LexicalToken|undefined} */
    #codeBlockToken;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state)

        this.#walkerNameToken = undefined;
        this.#codeBlockToken = undefined;
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsToken = this.paramsToken;
        const membersParamRegEx = /^\s*?([a-zA-Z_]\w*?)\s*?(%\{)?\s*$/d;
        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(membersParamRegEx)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %members pragma expects a single valid walker name as parameter'
            );
            return;
        }

        if (this.terminatorToken) {
            state.addError(
                'The %members pragma should be followed by a code block, not a semicolon'
            );
            return;
        }

        // Add a warning if the mentioned walker has not been declared
        const walkerNameToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            1,
            this.paramsToken.range.start.character
        );
        // Forgiving
        this.#walkerNameToken = walkerNameToken;
        //const walkerReferenceNode = new WalkerNode(walkerNameToken);

        const walkerName = walkerNameToken.lexeme;
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        /** @type {Reference} */
        const walkerReference = { type: 'walker', name: walkerName, };

        if (!state.lookupReference(walkerReference)) {
            state.addError(
                `A walker called '${walkerName}' has not been defined`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            );
        }

        // Add a warning if a members pragma already exists for this walker
        // const membersDefinedForWalker = this.#pragmas.walkers?.get(walkerName);
        // if (membersDefinedForWalker) {
        //     /* state = */ this.#addError(
        //         state,
        //         `Members have already been defined for a walker called '${walkerName}'`,
        //         ErrorSeverity.Warning,
        //         startColumn,
        //         endColumn
        //     )
        // }

        // A members pragma must be followed by an anonymous code 
        // block, so we will supply a name ourselves.
        state.setCodeBlockName(walkerName, 'Members');

        // A members pragma must be followed by an anonymous code 
        // block

        // If a block begin is right there
        const codeBlockToken = state.lexicalTokenFromSubmatch(
            paramMatch,
            2,
            this.paramsToken.range.start.character
        );

        if (codeBlockToken) {
            this.#codeBlockToken = codeBlockToken;
            // Begin a code block right here
            state.startCodeBlock(codeBlockToken.range.start.character);
        } else {
            // Expect a code block on the next line
            state.expectCodeBlock = true;
        }
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (this.#walkerNameToken &&
            this.#walkerNameToken.isCharacterInside(character)) {
            return {
                type: 'walker',
                name: this.#walkerNameToken.lexeme
            };
        }

        return null;
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const toks = [];
        if (noderef.type !== 'walker') return toks;
        if (!this.#walkerNameToken) return toks;
        if (this.#walkerNameToken.lexeme !== noderef.name) return toks;

        toks.push(this.#walkerNameToken);

        return toks;
    }

    getFormattedLines() {
        if(!this.#walkerNameToken) return [''];
        // Just write out the pragma name and the walker name.
        // Code block pretty printing will take care of the
        // rest.
        return [`%members ${this.#walkerNameToken.lexeme.trim()}`];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        const pragmaToks = super.getSemanticTokens();
        semToks.push(...pragmaToks);

        // As far as possible, ignore errors while returning
        // semantic tokens.
        if (this.#walkerNameToken) {
            semToks.push({
                range: this.#walkerNameToken.range,
                tokenType: SemanticTokenType.Class,
                tokenModifiers: []
            });
        }

        return semToks;
    }
}

module.exports = {
    MembersPragmaNode
}