/**
 * @typedef {import('./ast/astcore').ASTNode} ASTNode
 * @typedef {import('./types').IGlobalState} IGlobalState
 * @typedef {import('./types').IParseState} IParseState
 * @typedef {import('./types').CodeBlockName} CodeBlockName
 * @typedef {import('./types').range} range
 * @typedef {import('./types').Reference} Reference
 */

const { LexicalToken } = require("./lexicaltoken");
const { CodeBlockNode } = require('./ast/codeblock');
const { RuleNode } = require('./ast/rule');
const { ErrorSeverity } = require('./enums');

/**
 * Parser state in the current line.
 * @implements {IParseState}
 */
class ParseState {
    /**
     * The connection to global state.
     * @type {IGlobalState}
     */
    #globalState;

    // Current line properties.
    // These reset per line.

    /**
     * The line currently being parsed.
     * @type {string}
     */
    #lineText;
    /**
     * The line number (zero-based) currently being parsed.
     * @type {Number}
     */
    #line;
    /**
     * The regexp match that invoked the current parser.
     * @type {RegExpMatchArray | null | undefined}
     */
    #matches;

    // All properties after this represent
    // state carried over multiple lines.
    // They do NOT reset per line.

    // Cumulative properties for document
    /**
     * @type {Number}
     */
    #errorCount = 0;


    /** @type {string} */
    className = '';
    /** @type {boolean} */
    walkersPragmaDefined = false;
    /** @type {string} */
    defaultWalker = '';


    // Code Block related properties
    /**
     * If the scanner is currently in a code block.
     */
    #inCodeBlock = false;
    /**
     * The current code block
     * @type {CodeBlockNode|undefined}
     */
    #currentCodeBlock;
    /**
     * Code block name
     * @type {CodeBlockName|undefined}
     */
    codeBlockName;

    /**
     * The next line parsed must be an anonymous code block start.
     */
    expectCodeBlock = false;

    // Rule Definition related properties
    /** @type {RuleNode|undefined} */
    #currentRule;
    /**
     * The next line parsed must be a code block name. If 
     * expectCodeBlock is also set, the next line can also
     * be an anonymous code block.
     */
    expectNamedCodeBlock = false;

    /**
     * 
     * @param {IGlobalState} globalState 
     */
    constructor(globalState) {
        this.#globalState = globalState;
        this.#lineText = "";
        this.#line = 0;
        this.#matches = undefined;
        this.#errorCount = 0;
    }

    /**
     * The line number (zero-based) currently being parsed.
     * @type {Number}
     * @readonly
     */
    get line() {
        return this.#line;
    }

    /**
     * The text of line currently being parsed.
     * @type {string}
     * @readonly
     */
    get lineText() {
        return this.#lineText;
    }

    /**
     * The regexp match that invoked the current parser.
     * @type {RegExpMatchArray|null|undefined}
     * @readonly
     */
    get matches() {
        return this.#matches;
    }

    /**
     * The total count of errors found so far.
     * @type {Number}
     * @readonly
     */
    get errorCount() {
        return this.#errorCount;
    }

    /**
     * If the scanner is currently in a rule definition.
     * @type {boolean}
     * @readonly
     */
    get inRuleDef() {
        return this.#currentRule ? true : false;
    }

    /**
    * The name of the current rule definition, or ''
    * @type {string}
    * @readonly
    */
    get ruleDefName() {
        return this.#currentRule?.name ?? '';
    }

    /**
     * True if parsing is currently inside a code block,
     * false otherwise.
     * @type {boolean}
     * @readonly
     */
    get inCodeBlock() {
        return this.#inCodeBlock;
    }

    /**
     * @type {CodeBlockNode|undefined}
     * @readonly
     */
    get currentCodeBlock() {
        return this.#currentCodeBlock;
    }

    /**
     * Start a new line, and reset per-line properties
     * @param {Number} line 
     * @param {string} lineText 
     */
    startNewLine(line, lineText) {
        this.#line = line;
        this.#lineText = lineText;
        this.#matches = undefined;
    }

    /**
     * Match the current line with a syntax pattern
     * @param {RegExp} lineSyntaxPattern
     * @returns {RegExpMatchArray|null}
     */
    matchLine(lineSyntaxPattern) {
        this.#matches = this.#lineText.match(lineSyntaxPattern);
        return this.#matches;
    }


    /**
     * Returns a range spanning the full current line.
     * @returns {range}
     */
    fullLineRange() {
        return {
            start: { line: this.#line, character: 0 },
            end: { line: this.#line, character: this.#lineText.length }
        };
    }

    /**
     * Constructs a lexical token from a match found in the current line.
     * @param {Number} matchIndex - The index of the match
     * @returns {LexicalToken|null}
     */
    lexicalTokenFromMatch(matchIndex) {
        const matches = this.#matches;
        if (!matches || !matches.indices) {
            throw "Could not get a lexical token from current line match";
        }

        const match = matches[matchIndex];
        if (match === undefined) {
            return null;
        }

        const indices = matches.indices[matchIndex];
        if (!indices) {
            return null;
        }

        return new LexicalToken(match, {
            start: { line: this.#line, character: indices[0] },
            end: { line: this.#line, character: indices[1] },
        });
    }

    /**
     * Creates a lexical token from a scanner match of a sub-expression in the
     * current line, and offsets the range. 
     * @param {RegExpMatchArray} submatches - A scanner match
     * @param {Number} matchIndex - The index to be turned into a LexicalToken
     * @param {Number} characterOffset - The offset to adjust the match column
     * @returns {LexicalToken|null}
     */
    lexicalTokenFromSubmatch(submatches, matchIndex, characterOffset = 0) {
        const match = submatches[matchIndex];
        if (!match) return null;

        if (!submatches.indices) {
            throw "Indices not found in regexp match"
        }

        const line = this.#line;
        const indices = submatches.indices[matchIndex];
        return new LexicalToken(match, {
            start: { line: line, character: indices[0] + characterOffset },
            end: { line: line, character: indices[1] + characterOffset },
        });
    }

    /**
     * Adds an error to the current line
     * @param {string} message - The diagnotic message
     * @param {ErrorSeverity} [severity] - The error severity. Default is Error.
     * @param {Number} [startColumn] - The column on the current line where the diagnostic context begins. By default the start of the line.
     * @param {Number} [endColumn] - The column on the current line where the diagnostic context ends. By default the end of the line.
     */
    addError(message, severity = ErrorSeverity.Error, startColumn, endColumn) {
        const range = {
            start: { line: this.#line, character: startColumn ?? 0 },
            end: { line: this.#line, character: endColumn ?? this.#lineText.length }
        }
        this.#globalState.addErrorWithRange(message, severity, range);
        this.#errorCount++;
    }

    /**
     * Adds an error to the current ruledef line, and resets ruledef state.
     * Should be called to indicate that a code block was expected right
     * after rule definition.
     */
    addRuleDefCodeBlockExpectedError() {
        if (!this.#currentRule) {
            throw "Unexpected error: this should not have been invoked from outside a rule";
        }

        const ruleDefLineNumber = this.#currentRule.range.start.line;

        this.#globalState.addErrorWithRange(
            'Rule definition should be immediately followed by a semicolon or a code block',
            ErrorSeverity.Error,
            {
                start: { line: ruleDefLineNumber, character: 0 },
                end: { line: ruleDefLineNumber, character: this.#currentRule.range.end.character }
            }
        );
        this.#errorCount++;
        this.resetRuleDef();
    }

    /**
     * Adds a definition to the current line
     * @param {ASTNode} def
     */
    addDefinition(def) {
        this.#globalState.addDefinition(def);
    }

    /**
     * Looks up a reference in current definitions. 
     * @param {Reference} ref
     * @returns {boolean}
     */
    lookupReference(ref) {
        return this.#globalState.lookupReference(ref);
    }

    /**
     * Adds a forward reference for the given name and type.
     * @param {string} name 
     * @param {string} type 
     * @param {range} range 
     */
    addForwardReference(name, type, range) {
        this.#globalState.addForwardReference(name, type, range);
    }

    /**
     * Removes any forward references for the given name and type.
     * @param {string} name 
     * @param {string} type
     */
    removeForwardReference(name, type) {
        this.#globalState.removeForwardReference(name, type);
    }

    /**
     * Set a name for the next code block
     * @param {string} className - Name of a walker, by default the default walker
     * @param {string} [functionName] - Name of a function, or by default "go"
     */
    setCodeBlockName(className, functionName) {
        this.codeBlockName = {
            className,
            functionName: functionName ?? 'go'
        };
    }

    resetCodeBlockName() {
        this.codeBlockName = undefined;
    }

    /**
     * 
     * @param {Number} [startCharacter] - The character position in current line where the code block starts. Default 0. 
     * @returns {CodeBlockNode}
     */
    startCodeBlock(startCharacter) {
        const codeBlock = new CodeBlockNode(this, startCharacter)
        this.#currentCodeBlock = codeBlock;

        this.#inCodeBlock = true
        this.expectCodeBlock = false;

        return codeBlock;
    }

    resetCodeBlock() {
        if (!this.#inCodeBlock) {
            throw "Very unexpected end of code block";
        }

        this.#currentCodeBlock = undefined;
        this.#inCodeBlock = false;
        this.resetCodeBlockName();
    }

    /**
     * Indicate the start of a new rule definition.
     * @param {RuleNode} rule 
     */
    startMultilineRule(rule) {
        this.#currentRule = rule;

        this.expectNamedCodeBlock = true;
        this.expectCodeBlock = true;
    }

    resetRuleDef() {
        this.#currentRule?.end(this);
        this.#currentRule = undefined;
    }
}


module.exports = {
    ParseState
};