/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').Reference} Reference
 */

const { ASTNode } = require('./astcore');
const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const {
    ElementPattern, RepeatedElementPattern,
    SemanticTokenType, SemanticTokenModifier,
    ErrorSeverity
} = require('../enums');


class FunctionPragmaNode extends PragmaNode {
    /** @type {FunctionDefinitionNode|undefined} */
    #functionDefinition;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);
    }

    /** @type {NodeParser} */
    parse(state) {
        if (!this.paramsToken) {
            state.addError(
                'The %function pragma requires a rule and a function definition'
            );
            return;
        }

        const paramsMatch = this.paramsToken.lexeme.match(ElementPattern.FunctionDefinition);
        if (!paramsMatch) {
            state.addError(
                'The %function pragma requires a rule and a function definition in the format: RULENAME FUNCTIONNAME(PARAMS) -> RETURNTYPE;'
            );
            return;
        }

        //const funcdef = new FunctionDefinitionNode(paramsMatch, state.line, this.paramsToken.range.start.character, state.defaultWalker);
        const funcdef = new FunctionDefinitionNode(state, paramsMatch, this.paramsToken.range.start.character);
        // Forgiving
        this.#functionDefinition = funcdef;

        // Look up classname
        if (funcdef.walkerNameToken) {
            if (!state.lookupReference({ type: 'walker', name: funcdef.walkerName })) {
                const startColumn = funcdef.walkerNameToken.range.start.character;
                const endColumn = funcdef.walkerNameToken.range.end.character;
                state.addError(
                    `A walker called ${funcdef.walkerName} has not been defined`,
                    ErrorSeverity.Error,
                    startColumn,
                    endColumn
                );
                return;
            }
        }

        // Look up function name
        const funcNameStartColumn = funcdef.functionNameToken.range.start.character; // pragma.params.range.start.character + paramsMatch.indices[3][0];
        const funcNameEndColumn = funcdef.functionNameToken.range.end.character; //funcNameStartColumn + funcdef.functionName.length;

        /** @type {Reference} */
        const functionReference = { name: funcdef.name, type: 'function' };

        if (state.lookupReference(functionReference)) {
            state.addError(
                `A function called ${funcdef.functionName} has already been defined for the walker ${funcdef.walkerName} and the rule ${funcdef.ruleName}`,
                ErrorSeverity.Error,
                funcNameStartColumn,
                funcNameEndColumn
            );
            return;
        }

        if (!this.terminatorToken) {
            state.addError(
                'The %function pragma should end with a semicolon'
            )
            return;
        }

        // Push definition
        state.addDefinition(funcdef);

        // Add forward reference to rulename
        state.addForwardReference(
            funcdef.ruleName,
            'rule',
            funcdef.ruleNameToken.range
        );

        // Add forward reference to code block
        state.addForwardReference(
            funcdef.name,
            'codeblock',
            funcdef.functionNameToken.range
        );
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (!this.paramsToken) return null;

        if (character > this.paramsToken.range.start.character) {
            return this.#functionDefinition?.getReferenceAt(character) ?? null;
        }

        return null;
    }

    /**
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        if (!this.paramsToken) return null;
        
        if (character > this.paramsToken.range.start.character) {
            return this.#functionDefinition?.getReferenceOrNodeAt(character) ?? null;
        }

        return null;
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        // Forgiving
        if (this.#functionDefinition) {
            return this.#functionDefinition.getLexicalTokensFor(noderef);
        }

        return [];
    }

    getFormattedLines() {
        const funcDefLines = this.#functionDefinition?.getFormattedLines();
        if (!funcDefLines) return [''];
        return [`%function ${funcDefLines[0]};`];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        const pragmaToks = super.getSemanticTokens();
        semToks.push(...pragmaToks);

        // As far as possible, ignore errors while returning
        // semantic tokens.
        if (this.#functionDefinition) {
            const funcDefToks = this.#functionDefinition.getSemanticTokens();
            semToks.push(...funcDefToks);
        }

        return semToks;
    }
}

class FunctionDefinitionNode extends ASTNode {
    #ruleNameToken;
    #walkerNameToken;
    #functionNameToken;
    #allParamsToken;
    #returnTypeToken;
    #terminatorToken;

    #defaulWalkerName;


    // * @param {Number} fdLine - The line where the fd match exists
    // * @param {Number} fdOffset - The character offset where the fd match exists
    // * @param {string} defaultWalker - The global default walker name
    // constructor(match, fdLine, fdOffset, defaultWalker) {

    /**
     * @param {IParseState} state
     * @param {RegExpMatchArray} match - A scanner match
     * @param {Number} fdOffset - The character offset where the fd match exists
     */

    constructor(state, match, fdOffset) {
        if (!match || !match.indices) {
            throw "Unexpected Regular expression error parsing function definition";
        }

        // The range of a function definition is calculated as be the match
        // rules below.
        super('function', {
            start: { line: state.line, character: fdOffset },
            end: { line: state.line, character: match[6] ? match.indices[6][1] : match.indices[5][1] }
        });

        this.#defaulWalkerName = state.defaultWalker;

        // The funcdef regexp matches:
        // - [1] Rule Definition name
        // - [2] Walker name. If empty, assume default walker
        // - [3] Function name
        // - [4] All C++ function parameters as a string
        // - [5] The C++ return type of the function as a string
        // - [6] A semicolon. May be empty
        this.#ruleNameToken = state.lexicalTokenFromSubmatch(match, 1, fdOffset);
        this.#walkerNameToken = state.lexicalTokenFromSubmatch(match, 2, fdOffset);
        this.#functionNameToken = state.lexicalTokenFromSubmatch(match, 3, fdOffset);
        this.#allParamsToken = state.lexicalTokenFromSubmatch(match, 4, fdOffset);
        this.#returnTypeToken = state.lexicalTokenFromSubmatch(match, 5, fdOffset);
        this.#terminatorToken = state.lexicalTokenFromSubmatch(match, 6, fdOffset)
    }

    get type() {
        return 'function';
    }

    get name() {
        return `${this.ruleName}::${this.walkerName}::${this.functionName}`
    }

    get ruleNameToken() {
        return this.#ruleNameToken;
    }

    get ruleName() {
        return this.#ruleNameToken.lexeme;
    }

    get walkerNameToken() {
        return this.#walkerNameToken;
    }

    get walkerName() {
        return this.#walkerNameToken?.lexeme ?? this.#defaulWalkerName;
    }

    get functionNameToken() {
        return this.#functionNameToken;
    }

    get functionName() {
        return this.functionNameToken.lexeme;
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (this.#ruleNameToken.isCharacterInside(character)) {
            return { type: 'rule', name: this.#ruleNameToken.lexeme };
        }

        if (this.#walkerNameToken.isCharacterInside(character)) {
            return { type: 'walker', name: this.#walkerNameToken.lexeme };
        }

        return null;
    }

    /**
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        if (this.#functionNameToken.isCharacterInside(character)) {
            return { type: 'function', name: this.name };
        }

        return this.getReferenceAt(character);
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const toks = [];
        if (!(['rule', 'walker', 'function'].includes(noderef.type))) return toks;

        if (noderef.type === 'rule' && noderef.name === this.ruleName) {
            toks.push(this.#ruleNameToken);
        }

        if (noderef.type === 'walker' && noderef.name === this.walkerName) {
            toks.push(this.#walkerNameToken);
        }

        if (noderef.type === 'function' && noderef.name === this.name) {
            toks.push(this.#functionNameToken);
        }

        return toks;
    }

    getFormattedLines() {
        return [`${this.ruleName} ${this.walkerName}::${this.functionName}(${this.#allParamsToken?.lexeme ?? ''}) -> ${this.#returnTypeToken.lexeme}`];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        semToks.push({
            range: this.#ruleNameToken.range,
            tokenType: SemanticTokenType.Function,
            tokenModifiers: []
        });

        if (this.#walkerNameToken) {
            semToks.push({
                range: this.#walkerNameToken.range,
                tokenType: SemanticTokenType.Method,
                tokenModifiers: [SemanticTokenModifier.Declaration]
            });
        }

        return semToks;
    }
}

module.exports = {
    FunctionPragmaNode
}