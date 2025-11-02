//#region JSDoc Types

/**
 * A position in a document.
 * @typedef {Object} position
 * @property {Number} line - Zero-based line number in document.
 * @property {string} character - Zero-based character position in line.
*/

/**
 * Start and end positions of an element.
 * @typedef {Object} range
 * @property {position} start - The start position of an element.
 * @property {position} end - The end position of an element.
 */

/**
 * An error or diagnostic, with location context.
 * @typedef {Object} YantraError
 * @property {ErrorSeverity} severity - Error severity.
 * @property {string} message - Error message.
 * @property {range} range - The range of the element to which this error pertains.
 */

/**
 * The name and range of a token, rule or other definition.
 * @typedef {Object} YantraDefinition
 * @property {string} name
 * @property {range} range
 */

/**
 * A Lexical token
 * @typedef {Object} LexicalToken
 * @property {string} lexeme;
 * @property {range} range;
 */

/**
 * The ruledefelement nonterminal
 * @typedef {Object} RuleDefElement
 * @property {LexicalToken} element
 * @property {LexicalToken|null} alias
 */

/**
 * The code block name nonterminal
 * @typedef {Object} CodeBlockName
 * @property {string} className
 * @property {string} functionName
 */

/**
 * A line parser function
 * @callback LineParser
 * @this {YantraParser}
 * @param {ParseState} state
 * @returns {ASTNode|undefined}
 */

/**
 * A parser function in an AST Node
 * @callback NodeParser
 * @param {ParseState} state
 * @returns {void}
 */


/**
 * A forward reference to a token or rule
 * @typedef {Object} ForwardReference
 * @property {string} name
 * @property {string} type - can be rule or token
 * @property {range} range
 */

/**
 * A regex and action combination that identifies a
 * non-terminal line
 * @typedef {Object} LinePattern
 * @property {string} type
 * @property {RegExp} pattern
 * @property {LineParser} action
 */

/**
 * Error reporting function.
 * @callback AddErrorWithRange
 * @param {string} message - The diagnotic message
 * @param {ErrorSeverity} severity - The error severity. Default is Error.
 * @param {range} range - The range of the diagnostic context.
 * @returns {void}
 */

/**
 * The connection between line state and document state.
 * @typedef {Object} GlobalState
 * @property {string} className
 * @property {boolean} walkersPragmaDefined
 * @property {string} defaultWalkerName
 * @property {AddErrorWithRange} addErrorWithRange
 * @property {(def:ASTNode) => void} addDefinition
 * @property {(def:ASTNode) => boolean } lookupDefinition
 * @property {(name:string, type:string, range:range) => void} addForwardReference
 * @property {(name:string, type:string) => void} removeForwardReference
 */

/**
 * A named reference to an element.
 * @typedef {Object} Reference
 * @property {string} type - Can be rule, token, function or walker
 * @property {string} name
 */

/**
 * A completion item returned by the language server.
 * @typedef {Object} CompletionItem
 * @property {string} label - The label of this completion item (required).
 * @property {number} [kind] - The kind/type of completion (e.g., Function, Class, Keyword).
 * @property {string} [detail] - A short description of the item.
 * @property {string|{kind: 'markdown'|'plaintext', value: string}} [documentation] - Optional documentation.
 * @property {string} [sortText] - Text used to sort the item in the list.
 * @property {string} [filterText] - Text used for filtering matches.
 * @property {string} [insertText] - Text to insert (defaults to label).
 * @property {1|2} [insertTextFormat] - Format of insertText: 1 = plain text, 2 = snippet.
 * @property {{range: range, newText: string}} [textEdit] - Optional text edit to apply.
 */

/**
 * An object that suggests a rename, with newText replacing
 * whatever exists in the range.
 * @typedef {Object} TextEdit
 * @property {range} range - The range of text to replace
 * @property {string} newText - The replacement text
 */

/**
 * @typedef {Object} DocumentSymbol
 * @property {string} name
 * @property {SymbolKind} kind - SymbolKind enum (e.g., 12 = Function, 5 = Class)
 * @property {range} range
 * @property {range} selectionRange
 * @property {DocumentSymbol[]} [children]
 */
//#endregion

//#region Enums

/**
 * Enumeration for the severity of errors (diagnotics)
 * @readonly
 * @enum {Number}
 */
/* export */ const ErrorSeverity = {
    Error: 1,
    Warning: 2,
    Information: 3,
    Hint: 4
}

/**
 * Enumeration for Parser statuses.
 * @enum {Symbol}
 * @readonly
 */
/* export */ const ParserStatus = {
    Initialized: Symbol('init'),
    Parsing: Symbol('parsing'),
    Ready: Symbol('ready')
}

/**
 * Enumeration for regex patterns used to detect line non-terminals
 * @readonly
 * @enum {RegExp}
 */
const SyntaxPattern = {
    Comment: /^\s*?\/\/.*?$/,
    Pragma: /^\s*?%([a-z_]+)(?:\s+(.*?))?(;?)$/d,
    TokenDefinition: /^\s*?([A-Z][A-Z0-9_]*?)\s*?(:=)\s*?(".*?")(!)?\s*?(;)?\s*?$/d,
    RuleDefinition: /^\s*?([a-z]\w*?)\s*?(?:\(([a-z]\w*?)\)\s*?)?(:=)\s*?(.*?)(;)?\s*?$/d,
    CodeBlockName: /^@(\w+)(?:::(\w+))?\s*?$/d
}

/**
 * Enumeration for regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const ElementPattern = {
    TokenName: /^[A-Z][A-Z0-9_]*?$/d,
    RuleName: /^[a-z]\w*?$/d,
    CppName: /^[a-zA-Z_]\w*$/d,
    SpacedCppName: /^\s*?([a-zA-Z_]\w*?)\s*$/d,
    FunctionDefinition: /^\s*?([a-z_]\w+)\s+(?:(?:([a-zA-Z_]\w+)::)?([a-zA-Z_]\w+))\s*?\((.*?)\)\s*?->\s*(?:((?:[a-zA-Z_]\w+::)?[a-zA-Z_]\w+))\s*?(;)?\s*$/d
}

/**
 * Enumeration for repeated regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const RepeatedElementPattern = {
    CppNames: /\s*?(?:([a-zA-Z]\w*)\s*?)+/dg,
    TokenNames: /\s*?(?:([A-Z][A-Z_]*)\s*?)+/dg,
    RuleDefs: /\s*?(?:([a-zA-Z]\w*)\s*(?:\(([a-zA-Z]\w*)\))?\s*)+?/dg
}

/**
 * Enumeration of completion item kinds.
 * @readonly
 * @enum {number}
 */
const CompletionItemKind = {
    Text: 1,
    Method: 2,
    Function: 3,
    Constructor: 4,
    Field: 5,
    Variable: 6,
    Class: 7,
    Interface: 8,
    Module: 9,
    Property: 10,
    Unit: 11,
    Value: 12,
    Enum: 13,
    Keyword: 14,
    Snippet: 15,
    Color: 16,
    File: 17,
    Reference: 18,
    Folder: 19,
    EnumMember: 20,
    Constant: 21,
    Struct: 22,
    Event: 23,
    Operator: 24,
    TypeParameter: 25
};

/**
 * Enumeration of DocumentSymbol kinds.
 * @readonly 
 * @enum {Number}
 */
const SymbolKind = {
    File: 1,
    Module: 2,
    Namespace: 3,
    Package: 4,
    Class: 5,
    Method: 6,
    Property: 7,
    Field: 8,
    Constructor: 9,
    Enum: 10,
    Interface: 11,
    Function: 12,
    Variable: 13,
    Constant: 14,
    String: 15,
    Number: 16,
    Boolean: 17,
    Array: 18,
    Object: 19,
    Key: 20,
    Null: 21,
    EnumMember: 22,
    Struct: 23,
    Event: 24,
    Operator: 25,
    TypeParameter: 26
};

Object.freeze(ErrorSeverity);
Object.freeze(ParserStatus);
Object.freeze(SyntaxPattern);
Object.freeze(ElementPattern);
Object.freeze(RepeatedElementPattern);
Object.freeze(CompletionItemKind);

//#endregion

//#region Utility Functions

/**
 * Returns true if the parameter value is a valid Yantra token
 * name, false otherwise.
 * @param {string} word 
 * @returns {Boolean}
 */
const isYantraTokenName = (word) => {
    return ElementPattern.TokenName.test(word);
}

/**
 * Returns true if the parameter value is a valid Yantra rule
 * name, false otherwise.
 * @param {string} word 
 * @returns {Boolean}
 */
const isYantraRuleName = (word) => {
    return ElementPattern.RuleName.test(word);
}

/**
 * Creates a regexp from the passed regexp that adds ^ and $
 * at the start and end respectively.
 * @param {RegExp} input
 * @returns {RegExp}
 */
const ensureOnly = (input) => {
    const inputstr = input.source;
    return new RegExp(`^${inputstr}$`, input.flags);
}

/**
 * Checks if a lexical token contains a repeated pattern only. If so,
 * returns a match array (matchAll). If not, returns null.
 * @param {LexicalToken} lexicalToken 
 * @param {RegExp} repeatingPattern
 * @returns {RegExpExecArray[]|null}
 */
function matchRepeatingPatternInLexicalToken(lexicalToken, repeatingPattern) {
    return !lexicalToken
        ? undefined
        : ensureOnly(repeatingPattern).test(lexicalToken.lexeme)
            ? Array.from(lexicalToken.lexeme.matchAll(repeatingPattern))
            : undefined
}

/**
 * Creates a lexical token from a scanner match of the current
 * line. 
 * @param {ParseState} state 
 * @param {Number} matchIndex 
 * @returns {LexicalToken|null}
 */
const lexicalTokenFromLine = (state, matchIndex) => {
    const matches = state.matches
    const match = matches[matchIndex];
    if (!match) return null;

    const indices = matches.indices[matchIndex];
    return {
        lexeme: match,
        range: {
            start: { line: state.line, character: indices[0] },
            end: { line: state.line, character: indices[1] },
        }
    }
}

/**
 * Creates a lexical token from a scanner match, and offsets the range. 
 * @param {RegExpExecArray} matches - A scanner match
 * @param {Number} matchIndex - The index to be turned into a LexicalToken
 * @param {Number} line - The line for the LexicalToken range
 * @param {Number} characterOffset - The offset to adjust the match column
 * @returns {LexicalToken|null}
 */
const lexicalTokenFromMatch = (matches, matchIndex, line, characterOffset = 0) => {
    const match = matches[matchIndex];
    if (!match) return null;

    const indices = matches.indices[matchIndex];
    return {
        lexeme: match,
        range: {
            start: { line: line, character: indices[0] + characterOffset },
            end: { line: line, character: indices[1] + characterOffset },
        }
    }
}

/**
 * Returns true if the passed character position is inside the
 * passed lexical token's character boundaries, else false.
 * @param {LexicalToken} token 
 * @param {Number} character 
 * @returns {boolean}
 */
const isCharacterInsideToken = (token, character) => {
    if (character >= token.range.start.character &&
        character <= token.range.end.character) {
        return true;
    }

    return false;
}

/**
 * Creates a range spanning the current line
 * @param {ParseState} state
 * @returns {range}
 */
const fullLineRange = (state) => {
    return {
        start: { line: state.line, character: 0 },
        end: { line: state.line, character: state.lineText.length }
    };
}
//#endregion

/**
 * Parser state in the current line.
 */
class ParseState {
    /**
     * The connection to global state.
     * @type {GlobalState}
     */
    #globalState;

    // Current line properties.
    // These reset per line.

    /**
     * The line currently being parsed.
     */
    #lineText;
    /**
     * The line number (zero-based) currently being parsed.
     */
    #line;
    /**
     * The regexp match that invoked the current parser.
     * @type {RegExpMatchArray | null}
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


    /** @type {string|undefined} */
    className;
    /** @type {boolean} */
    walkersPragmaDefined = false;
    /** @type {string|undefined} */
    defaultWalker;


    // Code Block related properties
    /**
     * If the scanner is currently in a code block.
     */
    inCodeBlock = false;
    /**
     * The current code block
     * @type {CodeBlockNode}
     */
    currentCodeBlock;
    /**
     * Code block name
     * @type {CodeBlockName}
     */
    codeBlockName;

    /**
     * The next line parsed must be an anonymous code block start.
     */
    expectCodeBlock = false;

    // Rule Definition related properties
    /** @type {RuleNode} */
    #currentRule;
    /**
     * The next line parsed must be a code block name. If 
     * expectCodeBlock is also set, the next line can also
     * be an anonymous code block.
     */
    expectNamedCodeBlock = false;

    /**
     * 
     * @param {GlobalState} globalState 
     */
    constructor(globalState) {
        this.#globalState = globalState;
        this.#lineText = "";
        this.#line = 0;
        this.#matches = [];
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
     * @type {RegExpMatchArray | null}
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
     * Start a new line, and reset per-line properties
     * @param {Number} line 
     * @param {string} lineText 
     */
    startNewLine(line, lineText) {
        this.#line = line;
        this.#lineText = lineText;
        this.#matches = [];
    }

    /**
     * Match the current line with a syntax pattern
     * @param {RegExp} lineSyntaxPattern
     * @returns {RegExpMatchArray}
     */
    matchLine(lineSyntaxPattern) {
        this.#matches = this.#lineText.match(lineSyntaxPattern);
        return this.#matches;
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
     * @param {YantraDefinition} def
     */
    addDefinition(def) {
        this.#globalState.addDefinition(def);
    }

    /**
     * Looks up a definition. 
     * @param {YantraDefinition} def
     * @returns {boolean}
     */
    lookupDefinition(def) {
        return this.#globalState.lookupDefinition(def);
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
     * @param {range} range 
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

    // /**
    //  * Indicate the start of a new rule definition,
    //  * with the specified name
    //  * @param {string} name 
    //  */
    // startRuleDefWithCodeBlocks(name) {
    //     this.inRuleDef = true;
    //     this.ruleDefName = name;
    //     // this.ruleDefLineNumber = this.line;

    //     // A rule defininition must be followed by
    //     // a named or anonymous code block.
    //     this.expectNamedCodeBlock = true;
    //     this.expectCodeBlock = true;
    // }

    /**
     * Indicate the start of a new rule definition,
     * with the specified name
     * @param {RuleNode} rule 
     */
    startMultilineRule(rule) {
        this.#currentRule = rule;
        //rule.range.end = undefined;
        //COMEBACKHERE
        // this.inRuleDef = true;
        // this.ruleDefName = rule.name;
        // this.ruleDefLineNumber = this.line;

        this.expectNamedCodeBlock = true;
        this.expectCodeBlock = true;

    }

    resetRuleDef() {
        this.#currentRule?.end(this);
        this.#currentRule = undefined;

        // this.inRuleDef = false
        // this.ruleDefName = '';
        // this.ruleDefLineNumber = -1;
    }
}


/* export */ class YantraParser {
    /** @type {ParserStatus} */
    #status;
    /** @type {ASTNode[]} */
    #astNodes;
    /** @type {Map<string, Map<string, YantraDefinition[]>>} */
    #definitionsMap;
    /** @type {ForwardReference[]} */
    #forwardReferences;
    /** @type {YantraError[]} */
    #errors;
    /** @type {Number} */
    #errorThreshold = 25;

    /** @type {LinePattern[]} */
    #linePatterns = [{
        "type": 'comment',
        "pattern": SyntaxPattern.Comment,
        "action": (state) => this.#parseComment(state)
    },
    {
        "type": 'pragma',
        "pattern": SyntaxPattern.Pragma,
        "action": (state) => this.#parsePragma(state)
    },
    {
        "type": 'token',
        "pattern": SyntaxPattern.TokenDefinition,
        "action": (state) => this.#parseTokenDefinition(state)
    },
    {
        'type': 'rule',
        "pattern": SyntaxPattern.RuleDefinition,
        "action": (state) => this.#parseRuleDefinition(state)
    }];


    constructor() {
        this.clear();
    }

    /**
     * Parser status. Can be Initialized, Parsing or Ready.
     * @returns {ParserStatus}
     */
    get status() {
        return this.#status;
    }

    /**
     * Number of errors the parser can encounter, before it
     * stops parsing.
     * @returns {Number}
     */
    get errorThreshold() {
        return this.#errorThreshold;
    }

    /**
     * Number of errors the parser can encounter, before it
     * stops parsing.
     * @param {Number} value
     */
    set errorThreshold(value) {
        this.#errorThreshold = value;
    }

    /**
     * Initializes the parser to a pristine state.
     * @returns {void}
     */
    clear() {
        this.#astNodes = undefined;

        this.#definitionsMap = new Map([
            ['token', new Map()],
            ['rule', new Map()],
            ['walker', new Map()],
            ['function', new Map()],
            ['codeblock', new Map()]
        ]);

        this.#forwardReferences = [];
        this.#errors = [];

        this.#status = ParserStatus.Initialized;
    }

    /**
     * Gets a list of ranges which are the definitions of the symbol at  
     * the specified position. Will return an empty range if none are
     * found, including if invoked from a definition itself.
     * @param {Number} line 
     * @param {Number} character
     * @returns {range[]}
     */
    getDefinitionsAt(line, character) {
        const defs = [];

        if (this.#status !== ParserStatus.Ready) return defs;

        if (line < 0 || line > this.#astNodes.length) return defs;

        const node = this.#astNodes[line];
        if (!node) return defs;

        const searchElement = node.getReferenceAt(character);
        if (searchElement) {
            const nodeDefs = this.#searchDefinitions(searchElement.type, searchElement.name);
            defs.push(...nodeDefs);
        }

        return defs;
    }

    /**
     * Gets an appropriate list of definition ranges, being references to
     * the symbol at the specified position. This will include the symbol
     * at the specified position.
     * @param {Number} line 
     * @param {Number} character 
     * @returns {range[]}
     */
    getReferencesForElementAt(line, character) {
        const defs = [];

        if (this.#status !== ParserStatus.Ready) return defs;

        if (line < 0 || line > this.#astNodes.length) return defs;

        const node = this.#astNodes[line];
        if (!node) return defs;

        const searchElement = node.getReferenceOrNodeAt(character);
        if (!searchElement) return defs;

        if (!(searchElement.type)) {
            return defs;
        }

        this.#astNodes.forEach((node, i) => {
            if (!node) return;

            const allReferences = node.getReferencesFor(searchElement);
            if (allReferences.length > 0) {
                defs.push(...allReferences);
            }
        });

        const defRanges = defs.map(def => def.range);

        return defRanges;
    }

    /**
     * Returns completion items based on line context and cursor position.
     * @param {number} line
     * @param {number} character
     * @param {string} lineText
     * @returns {CompletionItem[]}
     */
    getCompletionsAt(line, character, lineText) {
        if (this.#status !== ParserStatus.Ready) return [];

        /** @type {CompletionItem[]} */
        const completions = [];

        // First, completions at the beginning of the line
        const trimmed = lineText.trimStart();
        const prefix = trimmed.slice(1, character).trim();

        // % → pragma suggestions
        if (trimmed.startsWith('%')) {

            const pragmaNames = ['class', 'walkers', 'default_walker', 'members', 'left', 'right', 'token', 'function'];

            const names = this.#namesToCompletions(
                pragmaNames,
                prefix,
                CompletionItemKind.Keyword,
                'pragma'
            );

            completions.push(...names);
            return completions;
        }

        // @ → walker/function suggestions
        if (trimmed.startsWith('@')) {
            if (trimmed.endsWith('::')) {
                // Suggest functions
                const funcNames = this.#definitionsToCompletions(
                    'function',
                    prefix,
                    CompletionItemKind.Method
                );

                completions.push(...funcNames);
                return completions
            }

            // suggest walkers
            const walkerNames = this.#definitionsToCompletions(
                'walker',
                prefix,
                CompletionItemKind.Class
            );

            completions.push(...walkerNames);
            return completions;
        }

        // Later, more context-sensitive completions

        return [];
    }

    /**
     * Gets errors detected after a  parse.
     * @returns {YantraError[]}
     */
    getErrors() {
        return this.#errors;
    }

    /**
     * Pretty prints the current document. Returns an array of
     * strings, or an empty array if pretty printing not 
     * possible.
     * @returns {string[]}
     */
    getFormattedLines() {
        const lines = [];
        if (this.status !== ParserStatus.Ready) return lines;
        if (this.#errors.length > 0) return lines;

        // Get the formatted representation of AST nodes
        this.#astNodes.forEach((node, index, nodes) => {
            // If the node is equal to the previous node
            // (as happens with code blocks), don't add
            // again.
            const nodeLines = !node
                ? ['']
                : index === 0 || node != nodes[index - 1]
                    ? node.getFormattedLines()
                    : undefined;

            nodeLines && lines.push(...nodeLines);
        });

        // Run post-processing, such as aligning token
        // definitions.
        const processedlines = this.#alignTokenDefs(lines);

        return processedlines;
    }

    #alignTokenDefs(lines) {
        const tokenDefRegex = SyntaxPattern.TokenDefinition;
        const result = [];
        let buffer = [];

        const flushBuffer = () => {
            if (buffer.length === 0) return;

            // Determine max length of the left-hand side
            const maxLhsLength = Math.max(...buffer.map(line => {
                const match = line.match(tokenDefRegex);
                return match ? match[1].length : 0;
            }));

            // Reformat each line in the buffer
            for (const line of buffer) {
                const match = line.match(tokenDefRegex);
                if (match) {
                    const lhs = match[1].padEnd(maxLhsLength, ' ');
                    const rhs = match[3];
                    const bang = match[4] || '';
                    const semicolon = match[5];
                    result.push(`${lhs} := ${rhs}${bang}${semicolon}`);
                } else {
                    result.push(line); // fallback, shouldn't happen
                }
            }

            buffer = [];
        };

        for (const line of lines) {
            if (tokenDefRegex.test(line)) {
                buffer.push(line);
            } else {
                flushBuffer();
                result.push(line);
            }
        }

        flushBuffer(); // flush any remaining lines

        return result;
    }

    /**
     * Tries to intelligently rename all occurances of an element.
     * Identifies the element at the specified position, fetches 
     * all references to it, and returns an array of TextEdit
     * objects, which look like this: {range:{}, newText: ''}.
     * @param {Number} line - The line where the symbol to be renamed resides
     * @param {*} character - The character position of that symbol
     * @param {*} newName - The new name to be given
     */
    renameSymbolAt(line, character, newName) {

        const refs = this.getReferencesForElementAt(line, character);
        if (refs.length === 0) return refs;

        const edits = refs.map(range => {
            return { range, newText: newName };
        });

        return edits;
    }

    /**
     * Returns an array of DocumentSymbols, which in turn contain
     * their own arrays of DocumentSymbols. This can be used to
     * populate an outline view of a Yantra document.
     */
    getDocumentSymbols() {
        if (this.#status !== ParserStatus.Ready) return defs;

        const docStart = { line: 0, character: 0 };
        const docEnd = { line: this.#astNodes.length + 1, character: 0 };

        const emptyRange = {
            start: docStart,
            end: docStart
        };
        const documentRange = {
            start: docStart,
            end: docEnd
        };

        /** @type {DocumentSymbol[]} */
        const tokenSymbols = {
            name: 'Tokens',
            kind: SymbolKind.Namespace,
            range: documentRange,
            selectionRange: emptyRange,
            children: []
        };
        this.#addSymbols(tokenSymbols.children, 'token', SymbolKind.Constant);

        const ruleSymbols = {
            name: 'Rules',
            kind: SymbolKind.Namespace,
            range: documentRange,
            selectionRange: emptyRange,
            children: []
        };
        this.#addSymbols(ruleSymbols.children, 'rule', SymbolKind.Function);

        const walkerSymbols = {
            name: 'Walkers',
            kind: SymbolKind.Namespace,
            range: documentRange,
            selectionRange: emptyRange,
            children: []
        };
        this.#addSymbols(walkerSymbols.children, 'walker', SymbolKind.Class);

        const functionSymbols = {
            name: 'Functions',
            kind: SymbolKind.Namespace,
            range: documentRange,
            selectionRange: emptyRange,
            children: []
        };
        this.#addSymbols(functionSymbols.children, 'function', SymbolKind.Method);

        const documentOutline = [
            tokenSymbols,
            ruleSymbols,
            walkerSymbols,
            functionSymbols
        ];

        return documentOutline;
    }

    /**
     * Adds definitions of a particular type to a DocumentSymbols
     * array.
     * @param {DocumentSymbol[]} symbolsArray 
     * @param {string} definitionType 
     * @param {SymbolKind} kind
     */
    #addSymbols(symbolsArray, definitionType, kind) {
        const definitionsMap = this.#definitionsMap.get(definitionType);
        definitionsMap.forEach(
            (definitions) => definitions.forEach((def) => {
                symbolsArray.push({
                    name: def.name,
                    kind,
                    range: def.range,
                    selectionRange: def.range,
                    children: []
                });
            })
        );
    }

    /**
     * Parses the input as a Yantra document.
     * @param {string} inputText 
     * @returns {void}
     */
    parse(inputText) {
        this.#status = ParserStatus.Parsing;
        this.clear();
        //this.#document = inputText;
        const lines = inputText.split(/\r?\n/);
        this.#astNodes = new Array(lines.length);
        this.#parseLines(lines);
        this.#status = ParserStatus.Ready;
    }

    /**
     * The engine of parsing logic.
     * @param {string[]} lines 
     */
    #parseLines(lines) {
        let state = new ParseState({
            addErrorWithRange: this.#addErrorWithRange.bind(this),
            addDefinition: this.#addDefinition.bind(this),
            lookupDefinition: this.#lookupDefinition.bind(this),
            addForwardReference: this.#addForwardReference.bind(this),
            removeForwardReference: this.#removeForwardReference.bind(this)
        });

        for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i];
            state.startNewLine(i, lineText);

            const trimmedLine = lineText.trim();

            // If in a codeblock, only look for %} and pass
            // everything else as a non-error.
            if (state.inCodeBlock) {
                if (trimmedLine === "%}") {
                    this.#astNodes[i] = this.#parseEndCodeBlock(state);
                    continue;
                } else {
                    state.currentCodeBlock.appendLine(lineText);
                    this.#astNodes[i] = state.currentCodeBlock;
                    continue;
                }
            }

            // If a named code block is expected, check for
            // the name first. This is the only case where
            // a code block name is valid.
            if (state.expectNamedCodeBlock) {
                if (trimmedLine.charAt(0) === '@') {
                    state.matchLine(SyntaxPattern.CodeBlockName);
                    if (state.matches) {
                        this.#astNodes[i] = this.#parseCodeBlockName(state);
                        continue;
                    }
                }
            }

            // If a code block is expected, and the current line
            // is not a block begin, that's the error. 
            if (state.expectCodeBlock) {
                if (trimmedLine !== "%{") {
                    state.addError('a code block was expected');

                    if (state.inRuleDef) {
                        state.addRuleDefCodeBlockExpectedError();
                    }

                    state.expectCodeBlock = false;
                    // This is an error line
                    this.#astNodes[i] = undefined;
                    continue;
                }
            }

            switch (trimmedLine) {
                case "":
                    this.#astNodes[i] = undefined;
                    break;
                case "%{":
                    this.#astNodes[i] = this.#parseBeginCodeBlock(state);
                    break;
                case "%}":
                    this.#astNodes[i] = this.#parseEndCodeBlock(state);
                    break;
                default: {
                    let matched = false;
                    for (let j = 0; j < this.#linePatterns.length; j++) {
                        const linePattern = this.#linePatterns[j];
                        state.matchLine(linePattern.pattern);
                        if (state.matches) {
                            this.#astNodes[i] = linePattern.action(state);
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        state.addError('Syntax Error');
                        this.#astNodes[i] = undefined;
                    }
                    break;
                }
            }

            // Stop parsing if too many errors
            if (state.errorCount > this.#errorThreshold) {
                state.addError('Too many errors. Parsing will stop');
                break;
            }
        }

        // Create warnings for pending forward references
        for (let i = 0; i < this.#forwardReferences.length; i++) {
            const forwardRef = this.#forwardReferences[i];
            const defs = this.#definitionsMap.get(forwardRef.type);

            // If definition type is not known, ignore it
            if (!defs) continue;

            if (!defs.has(forwardRef.name)) {
                this.#addErrorWithRange(
                    `The ${forwardRef.type} '${forwardRef.name}' has not been defined`,
                    ErrorSeverity.Warning,
                    forwardRef.range
                );
            }
        }

        // Clear forward references
        this.#forwardReferences = [];
    }

    /**
     * 
     * @type {LineParser}
     */
    #parseBeginCodeBlock(state) {
        if (!state.expectCodeBlock) {
            state.addError('Unexpected start of code block');
            return undefined;
        }

        const codeBlock = new CodeBlockNode(state)
        state.currentCodeBlock = codeBlock;

        state.inCodeBlock = true
        state.expectCodeBlock = false;

        return codeBlock;
    }

    /**
     *
     * @type {LineParser} 
     */
    #parseEndCodeBlock(state) {
        if (!state.inCodeBlock) {
            state.addError("Unexpected end of code block");
            return undefined;
        }

        const currentCodeBlock = state.currentCodeBlock;
        // state.currentCodeBlock.parse(state);
        return currentCodeBlock.end(state);
    }

    /**
     * @type {LineParser}
     */
    #parseComment(state) {
        const node = new CommentNode(state);

        node.parse(state);
        return node;
    }

    /**
     * 
     * @type {LineParser}
     */
    #parsePragma(state) {
        // A pragma can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        /** @type {PragmaNode} */
        let pragmaNode;
        const pragmaName = state.matches[1];
        switch (pragmaName) {
            case 'class':
                pragmaNode = new ClassNamePragmaNode(state);
                break;
            case 'walkers':
                pragmaNode = new WalkersPragmaNode(state);
                break;
            case 'default_walker':
                pragmaNode = new DefaultWalkerPragmaNode(state);
                break;
            case 'members':
                pragmaNode = new MembersPragmaNode(state);
                break;
            case 'left':
            case 'right':
            case 'token':
                pragmaNode = new AssociativityPragmaNode(state);
                break;
            case 'function':
                pragmaNode = new FunctionPragmaNode(state);
                break;
            default:
        }

        if (!pragmaNode) {
            const startColumn = state.matches.indices[1][0];
            const endColumn = state.matches.indices[1][1];
            state.addError(
                `Unknown pragma '${pragmaName}'`,
                ErrorSeverity.Error,
                startColumn,
                endColumn
            );
            return undefined;
        }

        pragmaNode.parse(state);
        return pragmaNode;
    }

    /** @type {LineParser} */
    #parseTokenDefinition(state) {
        // A tokendef can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        const node = new TokenNode(state);
        node.parse(state);
        return node;
    }

    /**
     * 
     * @type {LineParser}
     */
    #parseRuleDefinition(state) {
        // A ruledef can follow, and end, a previous rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        const node = new RuleNode(state);

        node.parse(state);
        return node;
    }

    /**
     * 
     * @type {LineParser}
     */
    #parseCodeBlockName(state) {
        if (!state.inRuleDef) {
            state.addError(
                'Named code block unexpected'
            );
            return undefined;
        }

        const node = new CodeBlockNameNode(state);
        node.parse(state);
        return node;
    }

    /**
     * Adds an error (diagnostic) to the current document for the given range
     * @private
     * @type {AddErrorWithRange}
     */
    #addErrorWithRange(message, severity = ErrorSeverity.Error, range) {
        const newError = {
            severity,
            message,
            range
        }

        this.#errors.push(newError);
    }

    /**
     * Adds a forward reference
     * @param {string} name - The name of the element being forward-referenced
     * @param {string} type - The type of the element being forward-referenced
     * @param {range} range - The range of the element which references the named element
     */
    #addForwardReference(name, type, range) {
        this.#forwardReferences.push({
            name,
            type,
            range
        });
    }

    /**
     * 
     * @param {string} name - The name of the element being forward-referenced
     * @param {string} type - The type of the element being forward-referenced
     */
    #removeForwardReference(name, type) {
        this.#forwardReferences = this.#forwardReferences.filter(
            item => !(item.type === type && item.name === name)
        );
    }

    /**
     * Adds a definition to the appropriate definitions collection.
     * @param {ASTNode} def
     * @returns {void}
     */
    #addDefinition(def) {
        const defMap = this.#definitionsMap.get(def.type);
        if (defMap) {
            /** @type {YantraDefinition[]} */
            let defs;

            if (defMap.has(def.name)) {
                defs = defMap.get(def.name);
            } else {
                defs = [];
                defMap.set(def.name, defs);
            }

            defs.push(def);
            return def;
        }
    }

    /**
     * Looks up a definition from the appropriate definitions collection.
     * @param {ASTNode} def
     * @returns {void}
     */
    #lookupDefinition(def) {
        const defMap = this.#definitionsMap.get(def.type);
        if (!defMap) {
            return false;
        }

        return defMap.has(def.name);
    }

    /**
     * Searches for definitions of the given type. If found
     * returns an array of ranges where found.
     * @param {string>} lookupType
     * @param {string} word
     * @returns {range[]}
     */
    #searchDefinitions(lookupType, word) {
        /** @type {Map<string, YantraDefinition[]>} */
        const defMap = this.#definitionsMap.get(lookupType)
        if (defMap?.has(word)) {
            const defs = defMap.get(word);
            const definitions = defs.map(def => def.range);
            return definitions;
        }

        return [];
    }

    /**
     * Filters an array of names by prefix, then converts them
     * to an array of CompletionItems of the specified kind.
     * @param {string[]} names - An array of names
     * @param {string} prefix - A prefix to filter them
     * @param {CompletionItemKind} kind - Item kind
     * @param {*} detail - Item metadata string
     * @returns {CompletionItem[]}
     */
    #namesToCompletions(names, prefix, kind, detail) {
        return names.filter(name => name.startsWith(prefix))
            .map((name) => {
                return {
                    label: name,
                    kind,
                    detail
                }
            });
    }

    /**
     * Filters available definitions by prefix, then converts
     * to an array of CompletionItems of the specified kind.
     * The deftype will be returned in the detail property.
     * @param {string} definitionType - The type of definition
     * @param {string} prefix - A prefix to filter them
     * @param {CompletionItemKind} kind - Item kind
     * @returns {CompletionItem[]}
     */
    #definitionsToCompletions(definitionType, prefix, kind) {
        if (definitionType !== 'function') {
            const defs = this.#definitionsMap.get(definitionType);
            if (!defs) return [];

            const names = Array.from(defs.keys());
            return this.#namesToCompletions(
                names, prefix, kind, definitionType
            );
        }

        const defs = this.#definitionsMap.get('function');
        const funcFilter = new RegExp(`\\w+?::${prefix}\w*`);
        const funcNames = Array.from(defs.keys())
            .filter(name => funcFilter.test(name))
            .map((name) => {
                const lastcolon = name.lastIndexOf('::');
                const insertText = lastcolon === -1
                    ? name
                    : name.slice(lastcolon + 2);

                return {
                    label: name,
                    insertText,
                    kind,
                    detail: definitionType
                };
            });

        return funcNames;
    }
}

class ASTNode {
    /** @type {string} */
    #type;
    /** @type {range} */
    #range;

    /** 
     * @param {string} type
     * @param {range} range
     */
    constructor(type, range) {
        this.#type = type;
        this.#range = range;
    }

    /**
     * The type of node
     * @type {string}
     */
    get type() {
        return this.#type;
    }

    /**
     * The name of the node, if any
     * @type {string|null}
     */
    get name() {
        return null;
    }

    /**
     * The range of the node
     */
    get range() {
        return this.#range;
    }

    /**
     * Parses the node and returns state
     * @param {ParseState} state
     * @returns {ParseState}
     */
    parse(state) {
        return undefined
    }

    /**
     * Gets a reference to another node from the elements
     * in this node, at or around the specified character
     * position. If no reference can be found, returns
     * null.
     * Reminder: A Reference is {type:'', name:'' }
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        return null;
    }

    /**
     * Gets a reference to another node or to the current
     * node, based on the specified character position. 
     * If no reference can be found, returns null.
     * Reminder: A Reference is {type:'', name:'' }
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        return this.getReferenceAt(character);
    }

    /**
     * Finds tokens in the current node for another
     * named node. 
     * Reminder: Return lexical tokens.
     * @param {Reference} definition 
     * @returns {LexicalToken[]}
     */
    getReferencesFor(definition) {
        return [];
    }

    /**
     * Returns a pretty-printed string representation of a
     * node.
     * @returns {string[]}
     */
    getFormattedLines() {
        return [];
    }

    toString() {
        return `AST Node Type: ${this.type}, Name: ${this.name}`;
    }
}

class MultilineASTNode extends ASTNode {
    /**
     * Called at the end of a multi-line node.
     * Returns this node.
     * @param {ParseState} state 
     * @returns {ASTNode}
     */
    end(state) {
        return this;
    }
}

class TokenNode extends ASTNode {
    #nameToken; //: lexicalTokenFromLine(state, 1),
    #assignmentOperatorToken; //: lexicalTokenFromLine(state, 2),
    #valueToken; //: lexicalTokenFromLine(state, 3),
    #negatorToken; //: lexicalTokenFromLine(state, 4),
    #terminatorToken; //: lexicalTokenFromLine(state, 5)

    /**
     * @param {ParseState} state
     */
    constructor(state) {
        super('token', fullLineRange(state));

        // The tokendef regexp returns:
        // - [1] token name
        // - [2] assignment operator
        // - [3] token value
        // - [4] "!' if present
        // - [5] semicolon if present
        this.#nameToken = lexicalTokenFromLine(state, 1);
        this.#assignmentOperatorToken = lexicalTokenFromLine(state, 2);
        this.#valueToken = lexicalTokenFromLine(state, 3);
        this.#negatorToken = lexicalTokenFromLine(state, 4);
        this.#terminatorToken = lexicalTokenFromLine(state, 5);
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
    }

    getReferenceOrNodeAt(character) {
        if (isCharacterInsideToken(this.#nameToken, character)) {
            return this;
        }

        return this.getReferenceAt(character);
    }

    getFormattedLines() {
        return [`${this.name} := ${this.#valueToken.lexeme}${this.#negatorToken?.lexeme ?? ''};`]
    }
}

class PragmaNode extends ASTNode {
    #pragma
    #name
    #params
    #terminator

    constructor(state) {
        super('pragma', fullLineRange(state));

        this.#name = lexicalTokenFromLine(state, 1);
        this.#params = lexicalTokenFromLine(state, 2);
        this.#terminator = lexicalTokenFromLine(state, 3);
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

    /**
     * Checks if the parameters of a pragma are a repeated pattern only
     * @param {RegExp} repeatingPattern 
     * @returns {RegExpMatchArray[]|undefined}
     */
    _matchRepeatingPattern(repeatingPattern) {
        const paramsToken = this.#params;
        return !paramsToken
            ? undefined
            : ensureOnly(repeatingPattern).test(paramsToken.lexeme)
                ? Array.from(paramsToken.lexeme.matchAll(repeatingPattern))
                : undefined
    }
}

class ClassNamePragmaNode extends PragmaNode {

    constructor(state) {
        super(state);
    }

    /**
     * @type {NodeParser}
     */
    parse(state) {
        // Check if class pragma has already appeared
        if (state.className) {
            state.addError(
                'A %class pragma has already been specified'
            );
            return;
        }

        // Check for parameter validity
        const paramsToken = this.paramsToken;
        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;
        if (!paramMatch) {
            state.addError(
                'The %class pragma expects a single valid C++ class name as parameter'
            );
            return;
        }

        // Check for terminator
        if (!this.terminatorToken) {
            state.addError('A %class pragma should end with a semicolon');
            return;
        }

        state.className = paramMatch[1];
    }

    getFormattedLines() {
        return [`%class ${this.paramsToken?.lexeme.trim()};`];
    }
}

class WalkersPragmaNode extends PragmaNode {
    /** @type {WalkerNode[]} */
    #walkers;

    constructor(state) {
        super(state);
        this.#walkers = [];
    }

    /** @type {NodeParser} */
    parse(state) {
        // Check if walkers pragma has already appeared
        if (state.walkersPragmaDefined) {
            state.addError(
                'A %walkers pragma has already been specified'
            );
            return;
        }

        // Check parameters
        const paramsMatch = this._matchRepeatingPattern(RepeatedElementPattern.CppNames);

        if (!paramsMatch || paramsMatch.length === 0) {
            state.addError(
                'The %walkers pragma expects one or more valid C++ class names separated by spaces'
            );
            return;
        }

        if (!this.terminatorToken) {
            state.addError(
                'The %walkers pragma should end with a semicolon'
            );
            return;
        }

        const paramsOffset = this.paramsToken.range.start.character;

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] Walkername
            const walkerNameToken = lexicalTokenFromMatch(
                paramsMatch[i],
                1,
                state.line,
                paramsOffset
            );
            const walkerNode = new WalkerNode(walkerNameToken);
            this.#walkers.push(walkerNode);
            state.addDefinition(walkerNode);
        }

        // The first walker is considered the default walker
        state.defaultWalker = this.#walkers[0].name;
        state.walkersPragmaDefined = true;
    }

    getReferenceOrNodeAt(character) {
        const walker = this.#walkers.find(w => isCharacterInsideToken(w, character));
        return walker ? walker : null;
    }

    getFormattedLines() {
        const walkernames = this.#walkers.map(walker => walker.name).join(' ');
        return [`%walkers ${walkernames};`];
    }

    /**
     * 
     * @param {Reference} noderef 
     * @returns {ASTNode[]}
     */
    getReferencesFor(noderef) {
        const refs = [];
        if (noderef.type !== 'walker') return refs;

        const ref = this.#walkers.find(w => w.name === noderef.name);
        if (!ref) return refs;

        refs.push(ref);
        return refs;
    }
}

class WalkerNode extends ASTNode {
    /** @type {LexicalToken} */
    #walkerToken

    /**
     * @param {LexicalToken} walkerToken
     */
    constructor(walkerToken) {
        super('walker', walkerToken.range)
        this.#walkerToken = walkerToken;
    }

    get name() {
        return this.#walkerToken.lexeme;
    }

    get type() {
        return 'walker';
    }

    toJSON() {
        return {
            name: this.name,
            type: this.type,
            range: this.range,
            walkerToken: this.#walkerToken
        }
    }
}

class DefaultWalkerPragmaNode extends PragmaNode {
    /** @type {LexicalToken} */
    #walkerReferenceToken;

    constructor(state) {
        super(state)
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsToken = this.paramsToken;
        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state.addError(
                'The %default_walker pragma expects a single valid walker name as parameter'
            );
            return;
        }

        if (!this.terminatorToken) {
            state.addError('A %default_walker pragma should end with a semicolon');
            return;
        }

        const walkerNameToken = lexicalTokenFromMatch(
            paramMatch,
            1,
            state.line,
            this.paramsToken.range.start.character
        );
        // Forgiving
        this.#walkerReferenceToken = walkerNameToken;

        const walkerReferenceNode = new WalkerNode(walkerNameToken);

        const walkerName = walkerNameToken.lexeme;
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        // Add an error if the walker has not been defined
        if (!state.lookupDefinition(walkerReferenceNode)) {
            state.addError(
                `A walker called '${walkerNameToken.lexeme}' has not been defined`,
                ErrorSeverity.Error,
                startColumn,
                endColumn
            );
            return;
        }

        // Set the default walker name
        state.defaultWalker = walkerName;
    }

    getReferenceAt(character) {
        if (isCharacterInsideToken(this.#walkerReferenceToken, character)) {
            return { type: 'walker', name: this.#walkerReferenceToken.lexeme };
        }

        return null;
    }

    getReferencesFor(noderef) {
        const refs = [];
        if (noderef.type !== 'walker') return refs;

        if (this.#walkerReferenceToken.lexeme !== noderef.name) return refs;

        refs.push({
            name: '',
            range: this.#walkerReferenceToken.range
        });

        return refs;
    }

    getFormattedLines() {
        return [`%default_walker ${this.#walkerReferenceToken.lexeme.trim()};`];
    }
}

class MembersPragmaNode extends PragmaNode {
    /** @type {LexicalToken} */
    #walkerNameToken;

    constructor(state) {
        super(state)
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsToken = this.paramsToken;

        const paramMatch = paramsToken
            ? paramsToken.lexeme.match(ElementPattern.SpacedCppName)
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
        const walkerNameToken = lexicalTokenFromMatch(
            paramMatch,
            1,
            state.line,
            this.paramsToken.range.start.character
        );
        // Forgiving
        this.#walkerNameToken = walkerNameToken;
        const walkerReferenceNode = new WalkerNode(walkerNameToken);

        const walkerName = walkerNameToken.lexeme;
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        if (!state.lookupDefinition(walkerReferenceNode)) {
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
        state.expectCodeBlock = true;
    }

    getReferenceAt(character) {
        if (this.#walkerNameToken &&
            isCharacterInsideToken(this.#walkerNameToken, character)) {
            return {
                type: 'walker',
                name: this.#walkerNameToken.lexeme
            };
        }

        return null;
    }

    getReferencesFor(noderef) {
        const refs = [];
        if (noderef.type !== 'walker') return refs;

        if (this.#walkerNameToken.lexeme !== noderef.name) return refs;

        refs.push({
            name: '',
            range: this.#walkerNameToken.range
        });

        return refs;
    }

    getFormattedLines() {
        return [`%members ${this.#walkerNameToken.lexeme.trim()}`];
    }
}

class AssociativityPragmaNode extends PragmaNode {
    /** @type {LexicalToken[]} */
    #tokenNameTokens;

    constructor(state) {
        super(state);

        this.#tokenNameTokens = [];
    }

    /** @type {NodeParser} */
    parse(state) {
        // Check parameters
        const paramsMatch = this._matchRepeatingPattern(RepeatedElementPattern.TokenNames);
        if (!paramsMatch || paramsMatch.length === 0) {
            state.addError(
                `The % ${this.name} pragma expects one or more valid token names`
            );
            return;
        }

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] YantraTokenName
            const yantraTokenNameToken = lexicalTokenFromMatch(
                paramsMatch[i],
                1,
                state.line,
                this.paramsToken.range.start.character
            );

            this.#tokenNameTokens.push(yantraTokenNameToken);

            const tokenName = yantraTokenNameToken.lexeme;
            const startColumn = yantraTokenNameToken.range.start.character;
            const endColumn = yantraTokenNameToken.range.end.character;

            const tokDef = {
                name: tokenName,
                type: 'token'
            };

            // The token should not be defined at this point
            if (state.lookupDefinition(tokDef)) {
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

    getReferenceAt(character) {
        const defObj = this.#tokenNameTokens?.find((ltoken) => {
            return isCharacterInsideToken(ltoken, character);
        });

        return defObj
            ? { type: 'token', name: defObj.lexeme }
            : null;
    }

    getReferencesFor(noderef) {
        const refs = [];
        if (noderef.type !== 'token') return refs;

        const ref = this.#tokenNameTokens.find(w => w.lexeme === noderef.name);
        if (!ref) return refs;

        refs.push(ref);
        return refs;
    }

    getFormattedLines() {
        const tokenNames = this.#tokenNameTokens.map(tok => tok.lexeme);

        return [`%${this.name} ${tokenNames.join(' ')};`];
    }
}


class FunctionPragmaNode extends PragmaNode {
    /** @type {FunctionDefinitionNode} */
    #functionDefinition;

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

        const funcdef = new FunctionDefinitionNode(paramsMatch, state.line, this.paramsToken.range.start.character, state.defaultWalker);
        // Forgiving
        this.#functionDefinition = funcdef;

        // Look up classname
        if (funcdef.walkerNameToken) {
            if (!state.lookupDefinition({ type: 'walker', name: funcdef.walkerName })) {
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

        if (state.lookupDefinition(funcdef)) {
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

    getReferenceAt(character) {
        if (character > this.paramsToken.range.start.character) {
            return this.#functionDefinition?.getReferenceAt(character);
        }
    }

    getReferenceOrNodeAt(character) {
        if (character > this.paramsToken.range.start.character) {
            return this.#functionDefinition?.getReferenceOrNodeAt(character);
        }
    }

    getReferencesFor(noderef) {
        return this.#functionDefinition.getReferencesFor(noderef);
    }

    getFormattedLines() {
        const funcDefLines = this.#functionDefinition.getFormattedLines();
        return [`%function ${funcDefLines[0]};`];
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

    /**
    * @param {RegExpExecArray} match - A scanner match
    * @param {Number} fdLine - The line where the fd match exists
    * @param {Number} fdOffset - The character offset where the fd match exists
    * @param {string} defaultWalker - The global default walker name
    */
    constructor(match, fdLine, fdOffset, defaultWalker) {
        // The range of a function definition is calculated as be the match
        // rules below.
        super('function', {
            start: { line: fdLine, character: fdOffset },
            end: { line: fdLine, character: match[6] ? match.indices[6][1] : match.indices[5][1] }
        });

        this.#defaulWalkerName = defaultWalker;

        // The funcdef regexp matches:
        // - [1] Rule Definition name
        // - [2] Walker name. If empty, assume default walker
        // - [3] Function name
        // - [4] All C++ function parameters as a string
        // - [5] The C++ return type of the function as a string
        // - [6] A semicolon. May be empty
        this.#ruleNameToken = lexicalTokenFromMatch(match, 1, fdLine, fdOffset);
        this.#walkerNameToken = lexicalTokenFromMatch(match, 2, fdLine, fdOffset);
        this.#functionNameToken = lexicalTokenFromMatch(match, 3, fdLine, fdOffset);
        this.#allParamsToken = lexicalTokenFromMatch(match, 4, fdLine, fdOffset);
        this.#returnTypeToken = lexicalTokenFromMatch(match, 5, fdLine, fdOffset);
        this.#terminatorToken = lexicalTokenFromMatch(match, 6, fdLine, fdOffset)
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

    getReferenceAt(character) {
        if (isCharacterInsideToken(this.#ruleNameToken, character)) {
            return { type: 'rule', name: this.#ruleNameToken.lexeme };
        }

        if (isCharacterInsideToken(this.#walkerNameToken, character)) {
            return { type: 'walker', name: this.#walkerNameToken.lexeme };
        }

        return null;
    }

    getReferenceOrNodeAt(character) {
        if (isCharacterInsideToken(this.#functionNameToken, character)) {
            return { type: 'function', name: this.name };
        }

        return this.getReferenceAt(character);
    }

    getReferencesFor(noderef) {
        const refs = [];
        if (!(['rule', 'walker', 'function'].includes(noderef.type))) return refs;

        if (noderef.type === 'rule' && noderef.name === this.ruleName) {
            refs.push(this.#ruleNameToken);
        }

        if (noderef.type === 'walker' && noderef.name === this.walkerName) {
            refs.push(this.#walkerNameToken);
        }

        if (noderef.type === 'function' && noderef.name === this.name) {
            refs.push(this.#functionNameToken);
        }

        return refs;
    }

    getFormattedLines() {
        return [`${this.ruleName} ${this.walkerName}::${this.functionName} (${this.#allParamsToken?.lexeme ?? ''}) -> ${this.#returnTypeToken.lexeme};`];
    }
}

class RuleNode extends MultilineASTNode {
    #nameToken;
    #aliasToken;
    #assignOpToken;
    #definitionToken;
    #terminatorToken;

    /** @type {position} */
    #multilineEnd;

    /** @type {RuleDefElement[]} */
    #ruleDefElements;

    constructor(state) {
        // The ruledef regexp returns:
        // - [1] - rule name
        // - [2] - alias, optional
        // - [3] - the assignment operator
        // - [4] - the entire rule definition
        // - [5] - semicolon, optional
        const name = lexicalTokenFromLine(state, 1);
        const alias = lexicalTokenFromLine(state, 2);
        const assignOp = lexicalTokenFromLine(state, 3);
        const defininition = lexicalTokenFromLine(state, 4);
        const terminator = lexicalTokenFromLine(state, 5);

        super('rule', {
            start: { line: state.line, character: 0 },
            end: {
                line: state.line,
                character: terminator
                    ? terminator.range.end.character
                    : state.lineText.length
            }
        });

        this.#nameToken = name;
        this.#aliasToken = alias;
        this.#assignOpToken = assignOp;
        this.#definitionToken = defininition;
        this.#terminatorToken = terminator;

        this.#ruleDefElements = [];
    }

    get name() {
        return this.#nameToken.lexeme;
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsMatches = matchRepeatingPatternInLexicalToken(
            this.#definitionToken,
            RepeatedElementPattern.RuleDefs
        );

        if (!paramsMatches) {
            state.addError(
                'Syntax error in rule definition'
            );
            return;
        }

        // Process rule definitions
        const definitionsOffset = this.#definitionToken.range.start.character;

        for (let i = 0; i < paramsMatches.length; i++) {
            // Each match has the elements:
            // - [1] element, which could be a token or a rule
            // - [2] alias, a matching name, optional
            /** @type {RuleDefElement} */
            const ruleDefElement = {
                element: lexicalTokenFromMatch(
                    paramsMatches[i],
                    1,
                    state.line,
                    definitionsOffset
                ),
                alias: lexicalTokenFromMatch(
                    paramsMatches[i],
                    2,
                    state.line,
                    definitionsOffset)
            }

            // Store it internally
            this.#ruleDefElements.push(ruleDefElement);

            const elementName = ruleDefElement.element.lexeme;

            // An element could be a Token
            if (isYantraTokenName(elementName)) {
                // Check that the alias, if present, is also token name compliant
                if (ruleDefElement.alias) {
                    if (!isYantraTokenName(ruleDefElement.alias.lexeme)) {
                        state.addError(
                            'The alias name for a token must match the casing of token names',
                            ErrorSeverity.Error,
                            ruleDefElement.alias.range.start.character,
                            ruleDefElement.alias.range.end.character
                        );
                    }
                }

                // Look up the token name. If not found, add a forward
                // reference.
                if (!state.lookupDefinition({ type: 'token', name: elementName })) {
                    state.addForwardReference(
                        elementName,
                        'token',
                        ruleDefElement.element.range
                    );
                }

                // Proceed to next definition element
                continue;
            }

            // An element could be a Rule
            if (isYantraRuleName(elementName)) {
                // Check that the alias, if present, is also rule name compliant
                if (ruleDefElement.alias) {
                    if (!isYantraRuleName(ruleDefElement.alias.lexeme)) {
                        state.addError(
                            'The alias name for a rule must match the casing of rule names',
                            ErrorSeverity.Error,
                            ruleDefElement.alias.range.start.character,
                            ruleDefElement.alias.range.end.character
                        );
                    }
                }

                // If the rule name used is the same as the rule being
                // defined, no need for a lookup or forward reference.
                if (elementName === this.name) {
                    continue;
                }

                // Look up the rule name. If not found, add a forward
                // reference.
                if (!state.lookupDefinition({ type: 'rule', name: elementName })) {
                    state.addForwardReference(
                        elementName,
                        'rule',
                        ruleDefElement.element.range
                    );
                }
            }

        }

        // A rule definition that does not end in a semicolon is expecting
        // a code block
        if (!this.#terminatorToken) {
            // We will set a default name for the first code block, which
            // could be anonymous
            state.setCodeBlockName(state.defaultWalker, 'go');
            // state.startRuleDefWithCodeBlocks(this.name);
            state.startMultilineRule(this);
        }

        // Push definintion
        // pushNewDefinition(state, this.#ruleDefinitions, ruleName);
        state.addDefinition(this);

        // Clear any forward references
        state.removeForwardReference(this.name, 'rule');
    }

    end(state) {
        // Rule ended as this line began
        this.#multilineEnd = {
            line: state.line,
            character: 0
        };

        return this;
    }

    getReferenceAt(character) {
        const rdef = this.#ruleDefElements?.find(
            rdelement => isCharacterInsideToken(rdelement.element, character)
        );

        if (rdef) {
            if (isYantraTokenName(rdef.element.lexeme)) {
                return { type: 'token', name: rdef.element.lexeme }

            }
            if (isYantraRuleName(rdef.element.lexeme)) {
                return { type: 'rule', name: rdef.element.lexeme }
            }
        }

        return null;
    }

    getReferenceOrNodeAt(character) {
        if (isCharacterInsideToken(this.#nameToken, character)) {
            return this;
        }

        return this.getReferenceAt(character);
    }

    getReferencesFor(noderef) {
        const resulRefs = [];
        if (!(['rule', 'token'].includes(noderef.type))) return resulRefs;

        if (noderef.type === 'rule' && noderef.name === this.name) {
            resulRefs.push(this.#nameToken);
        }

        // Filter all ruledefs to those that contain a matching
        // reference in the element portion of the ruledef, and
        // then select only the element portions.
        const refs = this.#ruleDefElements.filter(
            rdef => rdef.element?.lexeme === noderef.name &&
                (
                    noderef.type === 'token'
                        ? isYantraTokenName(rdef.element.lexeme)
                        : isYantraRuleName(rdef.element.lexeme)
                )
        ).map(rdef => rdef.element);

        if (refs.length === 0) return resulRefs;

        resulRefs.push(...refs);
        return resulRefs;
    }

    getFormattedLines() {
        const ruleElements = [this.name];
        if (this.#aliasToken) {
            ruleElements.push(`(${this.#aliasToken.lexeme})`);
        }
        ruleElements.push(':=');

        this.#ruleDefElements.forEach(item => {
            ruleElements.push(item.element.lexeme);
            if (item.alias) {
                ruleElements.push(`(${item.alias.lexeme})`);
            }
        });

        let ruleLineText = ruleElements.join(' ');
        ruleLineText += (this.#terminatorToken ? ';' : '');

        return [ruleLineText];
    }
}

class CommentNode extends ASTNode {
    /** @type {string} */
    #lineText;

    constructor(state) {
        super('comment', fullLineRange(state));
    }

    /** @type {NodeParser} */
    parse(state) {
        this.#lineText = state.lineText;
    }

    /**
     * Preseve spaces before //, but ensure one space after it, unless 
     * immediately followed by a hash.
     * @returns {string[]}
     */
    getFormattedLines() {
        return [this.#lineText.replace(/^(\s*?)\/\/([^\s#])/, "$1// $2")];
    }
}

class CodeBlockNode extends MultilineASTNode {
    /** @type {string} */
    #name;
    /** @type {string[]} */
    #lines;

    /**
     * 
     * @param {ParseState} state 
     */
    constructor(state) {
        const isAnonymous = state.inRuleDef && !state.expectNamedCodeBlock;
        const startLine = isAnonymous ? state.line : state.line - 1;

        super('codeblock', {
            start: {
                line: startLine, character: 0
            },
            end: undefined
        });

        // Code block names are a combination of the following elements:
        // - The rule definition name if part of a rule definition
        // - The walker name with which this code block is associated
        // - The function name for this code block
        // Separated by ::
        const codeBlockName = `${state.inRuleDef ? state.ruleDefName + '::' : ''}${state.codeBlockName.className}::${state.codeBlockName.functionName}`;
        this.#name = codeBlockName;

        this.#lines = [];
    }

    get name() {
        return this.#name;
    }

    parse(state) {
        return state;
    }

    /**
     * To be called when the end of the block has been encountered.
     * This RESETS the current code block, so cache it if required.
     * @param {ParseState} state
     * @returns {CodeBlockNode}
     */
    end(state) {
        // This codeblock ends on the current line (%})
        this.range.end = {
            line: state.line,
            character: state.lineText.length
        };

        // Push definition
        state.addDefinition(this);

        // Remove any forward references
        state.removeForwardReference(this.name, this.type);

        // Reset current code block and name
        state.currentCodeBlock = undefined;
        state.inCodeBlock = false;
        state.resetCodeBlockName();

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
    #classnameToken;
    #functionNameToken;
    #ruleDefName;

    /**
     * 
     * @param {ParseState} state 
     */
    constructor(state) {
        super('codeblockname', fullLineRange(state));

        // The codeblockname regexp returns
        // - [1] class (walker) name
        // - [2] function name
        this.#classnameToken = lexicalTokenFromLine(state, 1);
        this.#functionNameToken = lexicalTokenFromLine(state, 2);
        // A code block name can only appear in a rule definition
        this.#ruleDefName = state.ruleDefName;
    }

    get name() {
        // The full function name is in the form:
        //   RULENAME::WALKERNAME::functionname
        return `${this.#ruleDefName}::${this.className}::${this.functionName}`
    }

    get className() {
        return this.#classnameToken.lexeme;
    }

    get functionName() {
        return this.#functionNameToken
            ? this.#functionNameToken.lexeme
            : 'go';
    }

    /** @type {NodeParser} */
    parse(state) {
        // Validate the classname
        if (!state.lookupDefinition({ type: 'walker', name: this.className })) {
            const startColumn = this.#classnameToken.range.start.character;
            const endColumn = this.#classnameToken.range.end.character;
            state.addError(
                `A walker named '${this.className}' has not been defined`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            );
        }

        if (this.functionName != 'go') {
            const funcFullName = this.name;
            if (!state.lookupDefinition({ type: 'function', name: funcFullName })) {
                const startColumn = this.#functionNameToken.range.start.character;
                const endColumn = this.#functionNameToken.range.end.character;

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

    getReferenceAt(character) {
        if (isCharacterInsideToken(this.#classnameToken, character)) {
            return { type: 'walker', name: this.#classnameToken.lexeme };
        }

        if (isCharacterInsideToken(this.#functionNameToken, character)) {
            return { type: 'function', name: this.name };
        }

        return null;
    }

    getReferencesFor(noderef) {
        const refs = [];
        if (!(['walker', 'function'].includes(noderef.type))) return refs;

        if (noderef.type === 'walker' && this.#classnameToken.lexeme === noderef.name) {
            refs.push(this.#classnameToken);
        }

        if (noderef.type === 'function' && this.name === noderef.name) {
            refs.push(this.#functionNameToken);
        }

        return refs;
    }

    getFormattedLines() {
        return [`@${this.className}${this.#functionNameToken ? '::' + this.functionName : ''}`];
    }
}

module.exports = {
    ErrorSeverity,
    ParserStatus,
    YantraParser
};