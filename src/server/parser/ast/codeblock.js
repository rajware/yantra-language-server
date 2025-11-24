/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 */

const { ErrorSeverity, SemanticTokenType, SemanticTokenModifier } = require('../enums');
const { LexicalToken } = require('../lexicaltoken');
const { ASTNode, MultilineASTNode } = require('./astcore');

class CodeBlockNode extends MultilineASTNode {
    /** @type {string} */
    #name;
    /** @type {string[]} */
    #lines;

    /**
     * @param {IParseState} state 
     * @param {Number} [startCharacter] - the start character of the code block, if not the line start
     */
    constructor(state, startCharacter) {
        const isAnonymous = state.inRuleDef && !state.expectNamedCodeBlock;
        const startLine = isAnonymous ? state.line : state.line - 1;

        super('codeblock', {
            start: {
                line: startLine, character: startCharacter ?? 0
            },
            end: {
                line: startLine, character: startCharacter ?? 0
            }
        });

        // Code block names are a combination of the following elements:
        // - The rule definition name if part of a rule definition
        // - The walker name with which this code block is associated
        // - The function name for this code block
        // Separated by ::
        const codeBlockName = `${state.inRuleDef ? state.ruleDefName + '::' : ''}${state.codeBlockName?.className}::${state.codeBlockName?.functionName}`;
        this.#name = codeBlockName;

        this.#lines = [];
    }

    get name() {
        return this.#name;
    }

    /**
     * To be called when the end of the block has been encountered.
     * This RESETS the current code block, so cache it if required.
     * @param {IParseState} state
     * @returns {CodeBlockNode}
     */
    end(state) {
        // This codeblock ends on the current line (%})
        this.range.end = {
            line: state.line,
            character: state.lineText.length
        };

        // Check to see if a walker interface exists for the class
        // name. If it does, this code block should not exist.
        const codeblockWalkerName = state.codeBlockName?.className;
        if (codeblockWalkerName &&
            state.lookupReference({
                name: codeblockWalkerName,
                type: 'walkerinterface'
            })
        ) {
            state.addCodeBlockError(
                `The walker '${codeblockWalkerName}' has an external interface defined. This inline implemntation is invalid.`,
                ErrorSeverity.Error,
                this
            );
        } else {

            // Push definition
            state.addDefinition(this);

            // Remove any forward references
            state.removeForwardReference(this.name, this.type);
        }

        // Reset current code block and name
        state.resetCodeBlock();
        // state.currentCodeBlock = undefined;
        // state.inCodeBlock = false;
        // state.resetCodeBlockName();

        // If a code block ends while in a rule definition
        // then we expect a name next.
        if (state.inRuleDef) {
            state.expectNamedCodeBlock = true;
        }

        return this;
    }

    /**
     * Appends a string to this code block's lines
     * @param {string} lineText
     */
    appendLine(lineText) {
        this.#lines.push(lineText);
    }

    getFormattedLines() {
        const formattedLines = [];
        formattedLines.push('%{');

        // Reformat code block lines to be indented
        // four spaces, and so there.
        const codeBlockLines = this.#lines.map(
            lineText => lineText.slice(0, 4) === '    '
                ? lineText
                : '    ' + lineText
        );
        formattedLines.push(...codeBlockLines);

        formattedLines.push('%}');
        return formattedLines;
    }
}

class CodeBlockNameNode extends ASTNode {
    #classNameToken;
    #functionNameToken;
    #ruleDefName;

    /**
     * 
     * @param {IParseState} state 
     */
    constructor(state) {
        super('codeblockname', state.fullLineRange());

        // The codeblockname regexp returns
        // - [1] class (walker) name
        // - [2] function name
        this.#classNameToken = state.lexicalTokenFromMatch(1);
        this.#functionNameToken = state.lexicalTokenFromMatch(2);

        // A code block name can only appear in a rule definition
        this.#ruleDefName = state.ruleDefName;
    }

    get name() {
        // The full function name is in the form:
        //   RULENAME::WALKERNAME::functionname
        return `${this.#ruleDefName}::${this.className}::${this.functionName}`
    }

    get className() {
        return this.#classNameToken.lexeme;
    }

    get functionName() {
        return this.#functionNameToken
            ? this.#functionNameToken.lexeme
            : 'go';
    }

    /** @type {NodeParser} */
    parse(state) {
        // Validate the classname
        if (!state.lookupReference({ type: 'walker', name: this.className })) {
            const startColumn = this.#classNameToken.range.start.character;
            const endColumn = this.#classNameToken.range.end?.character;
            state.addError(
                `A walker named '${this.className}' has not been defined`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            );
        }

        if (this.functionName != 'go') {
            const funcFullName = this.name;
            if (!state.lookupReference({ type: 'function', name: funcFullName })) {
                const startColumn = this.#functionNameToken.range.start.character;
                const endColumn = this.#functionNameToken.range.end?.character;

                state.addError(
                    `A function called ${this.functionName} has not been defined for the walker ${this.className} and the rule ${state.ruleDefName}`,
                    ErrorSeverity.Warning,
                    startColumn,
                    endColumn
                );
            }
        }

        state.setCodeBlockName(this.className, this.functionName);

        // Once a name is parsed, we no longer expect a
        // name, but we immediately expect a code block
        state.expectNamedCodeBlock = false;
        state.expectCodeBlock = true;
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        if (this.#classNameToken.isCharacterInside(character)) {
            return { type: 'walker', name: this.#classNameToken.lexeme };
        }

        if (this.#functionNameToken.isCharacterInside(character)) {
            return { type: 'function', name: this.name };
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
        if (!(['walker', 'function'].includes(noderef.type))) return refs;

        if (noderef.type === 'walker' && this.#classNameToken.lexeme === noderef.name) {
            refs.push(this.#classNameToken);
        }

        if (noderef.type === 'function' && this.name === noderef.name) {
            refs.push(this.#functionNameToken);
        }

        return refs;
    }

    getFormattedLines() {
        return [`@${this.className}${this.#functionNameToken ? '::' + this.functionName : ''}`];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        if (this.#classNameToken) {
            semToks.push({
                range: this.#classNameToken.range,
                tokenType: SemanticTokenType.Class,
                tokenModifiers: []
            });
        }

        if (this.#functionNameToken) {
            semToks.push({
                range: this.#functionNameToken.range,
                tokenType: SemanticTokenType.Function,
                tokenModifiers: [SemanticTokenModifier.Definition]
            });
        }

        return semToks;
    }
}

module.exports = {
    CodeBlockNode,
    CodeBlockNameNode
}