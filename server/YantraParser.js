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
 * The pragma nonteriminal
 * @typedef {Object} Pragma
 * @property {LexicalToken} name
 * @property {LexicalToken|null} params
 * @property {LexicalToken|null} terminator
 */

/**
 * The token nonterminal
 * @typedef {Object} YantraToken
 * @property {LexicalToken} name
 * @property {LexicalToken} assignmentOperator
 * @property {LexicalToken} value
 * @property {LexicalToken|null} negator
 * @property {LexicalToken|null} terminator
 */

/**
 * The rule nonterminal
 * @typedef {Object} Rule
 * @property {LexicalToken} name
 * @property {LexicalToken|null} defininition
 * @property {LexicalToken|null} terminator;
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
 * A parser function
 * @callback LineParser
 * @this {YantraParser}
 * @param {ParseState} state
 * @returns {ParseState}
 */

/**
 * A pragma parser function
 * @callback PragmaParser
 * @this {YantraParser}
 * @param {ParseState} state
 * @param {Pragma} pragma
 * @returns {ParseState}
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
 * An object that holds metadata about the different
 * types of pragmas.
 * @typedef {Object} PragmasMetaData
 * @property {any[]} class - Name of the main class to be generated
 * @property {Map<string,any>} walkers - Metadata for defined walkers
 * @property {string} defaultWalker - Name of the default walker
 */

/**
 * A function definition nonterminal, the param of a %function pragma
 * @typedef {Object} FunctionDefinition
 * @property {LexicalToken} ruleName
 * @property {LexicalToken|null} walkerName
 * @property {LexicalToken} functionName
 * @property {LexicalToken} allParams
 * @property {LexicalToken} returnType
 * @property {LexicalToken} terminator
 */
//#endregion

//#region Enums

/**
 * Enumeration for the severity of errors (diagnotics)
 * @readonly
 * @enum {Number}
 */
export const ErrorSeverity = {
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
export const ParserStatus = {
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
    RuleDefinition: /^\s*?([a-z][\w]*?)\s*?:=\s*?(.*?)(;)?\s*?$/d,
    CodeBlockName: /^@(\w+)(?:::(\w+))?$/d
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
    FunctionDefinition: /^\s*?([a-z_]\w+)\s+(?:(?:([a-zA-Z_]\w+)::)?([a-zA-Z_]\w+))\s*?\(.*?\)\s*?->\s*(?:([a-zA-Z_]\w+::)?([a-zA-Z_]\w+))\s*?(;)?\s*$/d
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

Object.freeze(ErrorSeverity);
Object.freeze(ParserStatus);
Object.freeze(SyntaxPattern);
Object.freeze(ElementPattern);
Object.freeze(RepeatedElementPattern);
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
 * Checks if the parameters of a pragma are a repeated pattern only
 * @param {Pragma} pragma 
 * @param {RegExp} repeatingPattern 
 * @returns 
 */
function matchRepeatingPattern(pragma, repeatingPattern) {
    return !pragma.params
        ? undefined
        : ensureOnly(repeatingPattern).test(pragma.params.lexeme)
            ? Array.from(pragma.params.lexeme.matchAll(repeatingPattern))
            : undefined
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
 * 
 * @param {ParseState} state
 * @returns {Pragma}
 */
const newPragma = (state) => {
    // The pragma regexp returns:
    // - [1] pragma name
    // - [2] all parameters
    // - [3] semicolon if present
    return {
        name: lexicalTokenFromLine(state, 1),
        params: lexicalTokenFromLine(state, 2),
        terminator: lexicalTokenFromLine(state, 3)
    }
}

/**
 * 
 * @param {ParseState} state 
 * @returns {YantraToken}
 */
const newYantraToken = (state) => {
    // The tokendef regexp returns:
    // - [1] token name
    // - [2] assignment operator
    // - [3] token value
    // - [4] "!' if present
    // - [5] semicolon if present
    return {
        name: lexicalTokenFromLine(state, 1),
        assignmentOperator: lexicalTokenFromLine(state, 2),
        value: lexicalTokenFromLine(state, 3),
        negator: lexicalTokenFromLine(state, 4),
        terminator: lexicalTokenFromLine(state, 5)
    };
}

/**
 * 
 * @param {ParseState} state
 * @returns {Rule}
 */
const newRule = (state) => {
    // The ruledef regexp returns:
    // - [1] rule name
    // - [2] the entire rule definition
    // - [3] semicolon if present
    return {
        name: lexicalTokenFromLine(state, 1),
        defininition: lexicalTokenFromLine(state, 2),
        terminator: lexicalTokenFromLine(state, 3)
    }
}

/**
 * Creates a new FunctionDefinition from the paramsmatch of a %function pragma
 * @param {RegExpMatchArray} match - The RegExpMatchArray matching the function definition regexp
 * @param {Number} fdLine - The line number of the function definition
 * @param {Number} fdOffset = The offset or position of the function definition, after %function
 * @returns {FunctionDefinition}
 */
const newFunctionDefinition = (match, fdLine, fdOffset) => {
    // The funcdef regexp matches:
    // - [1] Rule name
    // - [2] Walker name. If empty, assume default walker
    // - [3] Function name
    // - [4] All C++ function parameters as a string
    // - [5] The C++ return type of the function as a string
    // - [6] A semicolon. May be empty
    return {
        // ruleName: match[1],
        // walkerName: match[2],
        // functionName: match[3],
        // allParams: match[4],
        // returnType: match[5],
        // terminator: match[6]
        ruleName: lexicalTokenFromMatch(match, 1, fdLine, fdOffset),
        walkerName: lexicalTokenFromMatch(match, 2, fdLine, fdOffset),
        functionName: lexicalTokenFromMatch(match, 3, fdLine, fdOffset),
        allParams: lexicalTokenFromMatch(match, 4, fdLine, fdOffset),
        returnType: lexicalTokenFromMatch(match, 5, fdLine, fdOffset),
        terminator: lexicalTokenFromMatch(match, 6, fdLine, fdOffset)
    }
}

/**
 * Creates a definition from an element in the current line, or the entire line, and pushes
 * it to a definitions array
 * @param {ParseState} state
 * @param {YantraDefinition[]} definitions - A definitions array
 * @param {string} name - The name of the element being defined
 * @param {Number} [startColumn] - The start column of the element. Default 0.
 * @param {Number} [endColumn] - The end column of the element. Default line length.
 * @returns {YantraDefinition}
 */
const pushNewDefinition = (state, definitions, name, startColumn, endColumn) => {
    const range = {
        start: { line: state.line, character: startColumn ?? 0 },
        end: { line: state.line, character: endColumn ?? state.lineText.length },
    };

    //return pushDefinitionWithRange(definitions, name, defRange);
    return pushDefinition(definitions, { name, range });
}

/**
 * Pushes an already constructed definition to a definitions array
 * @param {YantraDefinition[]} definitions 
 * @param {YantraDefinition} definition 
 * @returns 
 */
const pushDefinition = (definitions, definition) => {
    let defs;

    if (definitions.has(definition.name)) {
        defs = definitions.get(definition.name);
    } else {
        defs = [];
        definitions.set(definition.name, defs);
    }

    defs.push(definition);
    return definition;
}
//#endregion

/**
 * Parser state in the current line.
 */
class ParseState {
    // Current line properties
    /**
     * The line currently being parsed.
     */
    #lineText = "";
    /**
     * The line number (zero-based) currently being parsed.
     */
    #line = 0;
    /**
     * The regexp match that invoked the current parser.
     * @type {RegExpMatchArray | null}
     */
    #matches = [];
    result = null;

    // Document cumulative properties
    /**
     * The total count of errors found so far.
     */
    errorCount = 0;

    // Code Block related properties
    /**
     * If the scanner is currently in a code block.
     */
    inCodeBlock = false;
    /**
     * The current code block
     * @type {YantraDefinition}
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
    /**
     * The next line parsed must be a code block name. If 
     * expectCodeBlock is also set, the next line can also
     * be an anonymous code block.
     */
    expectNamedCodeBlock = false;
    /**
     * If the scanner is currently in a rule definition.
     */
    inRuleDef = false;
    /**
     * The line number of the start of the current rule 
     * definition, or -1.
     */
    ruleDefLineNumber = -1;
    /**
     * The name of the current rule definition, or ''
     */
    ruleDefName = '';

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
     * Indicate the start of a new rule definition,
     * with the specified name
     * @param {string} name 
     */
    startRuleDefWithCodeBlocks(name) {
        this.inRuleDef = true;
        this.ruleDefName = name;
        this.ruleDefLineNumber = this.line;

        // A rule defininition must be followed by
        // a named or anonymous code block.
        this.expectNamedCodeBlock = true;
        this.expectCodeBlock = true;
    }

    resetRuleDef() {
        this.inRuleDef = false
        this.ruleDefName = '';
        this.ruleDefLineNumber = -1;
    }
}


export class YantraParser {
    /** @type {ParserStatus} */
    #status;
    /** @type {string} */
    #document;
    /** @type {string[]} */
    #lines;
    /** @type {string[]} */
    #results;
    /** @type {PragmasMetaData}} */
    #pragmas;
    /** @type {Map<string,YantraDefinition[]>} */
    #tokenDefinitions;
    /** @type {Map<string, YantraDefinition[]} */
    #ruleDefinitions;
    /** @type {Map<string, YantraDefinition[]} */
    #walkerDefinitions;
    /** @type {Map<string, YantraDefinition[]} */
    #functionDefinitions;
    /** @type {Map<string, YantraDefinition[]} */
    #codeBlockDefinitions;
    /** @type {Map<string,() => Map<string, YantraDefinition[]>>} */
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
        "action": (state) => {
            state.result = "Comment.";
            return state;
        }
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

    /**
     * @type {Map<string,PragmaParser>}
     */
    #pragmaParsers = {
        "class": this.#parsePragmaClass,
        "walkers": this.#parsePragmaWalkers,
        "default_walker": this.#parsePragmaDefaultWalker,
        "members": this.#parsePragmaMembers,
        "left": this.#parsePragmaAssociativity,
        "right": this.#parsePragmaAssociativity,
        "token": this.#parsePragmaAssociativity,
        "function": this.#parsePragmaFunction
    };


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
        this.#document = "";
        this.#lines = [];
        this.#results = [];

        this.#pragmas = {
            class: [],
            walkers: undefined,
            defaultWalker: undefined
        };

        this.#tokenDefinitions = new Map();
        this.#ruleDefinitions = new Map();
        this.#walkerDefinitions = new Map();
        this.#functionDefinitions = new Map();
        this.#codeBlockDefinitions = new Map();
        this.#definitionsMap = {
            'token': this.#tokenDefinitions,
            'rule': this.#ruleDefinitions,
            'walker': this.#walkerDefinitions,
            'function': this.#functionDefinitions,
            'codeblock': this.#codeBlockDefinitions
        };

        this.#forwardReferences = [];
        this.#errors = [];

        this.#status = ParserStatus.Initialized;
    }

    /**
     * Returns the word surrounding the position (lineNumber, char).
     * If there is a space at that position, or the position is 
     * beyond the boundaries of the document, returns null.
     * @param {Number} lineNumber 
     * @param {Number} char 
     * @returns {string|null}
     */
    getWordAt(lineNumber, char) {
        if (lineNumber >= this.#lines.length) {
            return null;
        }

        const line = this.#lines[lineNumber];
        if (char >= line.length) {
            return null
        }

        if (line.charAt(char).trim() === "") {
            return null;
        }

        const regex = /\b[\w%]+\b/g;
        let match;
        while ((match = regex.exec(line))) {
            if (match.index <= char && regex.lastIndex >= char) {
                return match[0];
            }
        }

        return null;
    }

    /**
     * Gets an array of locations where the definition(s) for the
     * parameter are present. If the word is not recognized or no
     * definitions exist, an empty array is returned.
     * @param {string} word 
     * @returns {range[]}
     */
    getDefinitionLocationsFor(word) {
        const result = [];

        if (isYantraTokenName(word)) {
            if (this.#tokenDefinitions.has(word)) {
                const tokdefs = this.#tokenDefinitions.get(word);
                const tokDefinitions = tokdefs.map(def => def.range);
                result.push(...tokDefinitions);
            }
        }

        if (isYantraRuleName(word)) {
            if (this.#ruleDefinitions.has(word)) {
                const ruleDefs = this.#ruleDefinitions.get(word);
                const ruleDefLocations = ruleDefs.map(def => def.range);
                result.push(...ruleDefLocations);
            }
        }

        if (this.#walkerDefinitions.has(word)) {
            const walkerDefs = this.#walkerDefinitions.get(word);
            const walkerDefLocations = walkerDefs.map(def => def.range);
            result.push(...walkerDefLocations);
        }

        return result
    }

    /**
     * Gets errors detected after a  parse.
     * @returns {YantraError[]}
     */
    getErrors() {
        return this.#errors;
    }

    /**
     * Parses the input as a Yantra document. If the document
     * has not changed since the last invocation,  parsing is 
     * not done.
     * @param {string} inputText 
     * @returns {string}
     */
    parse(inputText) {
        if (this.#document != inputText) {
            this.#status = ParserStatus.Parsing;
            this.clear();
            this.#document = inputText;
            this.#lines = this.#document.split(/\r?\n/);
            this.#parseLines();
            this.#status = ParserStatus.Ready;
        }

        return this.#results.join("\n");
    }

    #parseLines() {
        const results = [];
        let state = new ParseState();

        for (let i = 0; i < this.#lines.length; i++) {
            const lineText = this.#lines[i];
            state.startNewLine(i, lineText);

            const trimmedLine = lineText.trim();

            // If in a codeblock, only look for %} and pass
            // everything else as a non-error.
            if (state.inCodeBlock) {
                if (trimmedLine === "%}") {
                    state = this.#parseEndCodeBlock(state);
                    results.push(state.result);
                    continue;
                } else {
                    results.push("In Code Block");
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
                        state = this.#parseCodeBlockName(state);
                        results.push(state.result);
                        continue;
                    }
                }
            }

            // If a code block is expected, and the current line
            // is not a block begin, that's the error. 
            if (state.expectCodeBlock) {
                if (trimmedLine !== "%{") {
                    state = this.#addError(state, 'a code block was expected');

                    if (state.inRuleDef) {
                        state = this.#addError(
                            state,
                            'Rule definition should be followed by a semicolon or a code block',
                            ErrorSeverity.Error,
                            state.ruleDefLineNumber,
                            0
                        )
                        state.resetRuleDef();
                    }

                    state.expectCodeBlock = false;
                    results.push(state.result);
                    continue;
                }
            }

            switch (trimmedLine) {
                case "":
                    results.push("Empty");
                    break;
                case "%{":
                    state = this.#parseBeginCodeBlock(state);
                    results.push(state.result);
                    break;
                case "%}":
                    state = this.#parseEndCodeBlock(state);
                    results.push(state.result);
                    break;
                default: {
                    let matched = false;
                    for (let j = 0; j < this.#linePatterns.length; j++) {
                        const linePattern = this.#linePatterns[j];
                        state.matchLine(linePattern.pattern);
                        if (state.matches) {
                            state = linePattern.action(state);
                            results.push(state.result);
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) {
                        state = this.#addError(state, 'Syntax Error');
                        results.push(state.result);
                    }
                    break;
                }
            }

            // Stop parsing if too many errors
            if (state.errorCount > this.#errorThreshold) {
                state = this.#addError(state, 'Too many errors. Parsing will stop');
                results.push(state.result);
                break;
            }
        }

        // Create warnings for pending forward references
        for (let i = 0; i < this.#forwardReferences.length; i++) {
            const forwardRef = this.#forwardReferences[i];
            const defs = this.#definitionsMap[forwardRef.type];

            // If definition type is not known, ignore it
            if (!defs) continue;

            if (!defs.has(forwardRef.name)) {
                state = this.#addErrorWithRange(
                    state,
                    `The ${forwardRef.type} '${forwardRef.name}' has not been defined`,
                    ErrorSeverity.Warning,
                    forwardRef.range
                );
            }
        }
        // Clear forward references
        this.#forwardReferences = [];

        this.#results = results;
    }

    /**
     * 
     * @type {LineParser}
     */
    #parseBeginCodeBlock(state) {
        if (!state.expectCodeBlock) {
            state = this.#addError(state, 'Unexpected start of code block');
            return state;
        }

        // Code block names are a combination of the following elements:
        // - The rule definition name if part of a rule definition
        // - The walker name with which this code block is associated
        // - The function name for this code block
        // Separated by ::
        const codeBlockName = `${state.inRuleDef ? state.ruleDefName + '::' : ''}${state.codeBlockName.className}::${state.codeBlockName.functionName}`;

        state.currentCodeBlock = {
            name: codeBlockName,
            range: {
                start: { line: state.line, character: 0 },
                end: undefined
            }
        };

        state.inCodeBlock = true
        state.expectCodeBlock = false;
        state.result = "Start Code Block";
        return state
    }

    /**
     * 
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parseEndCodeBlock(state) {
        if (!state.inCodeBlock) {
            state = this.#addError(state, "Unexpected end of code block");
            return state;
        }

        state.currentCodeBlock.range.end = {
            line: state.line,
            character: 0
        };

        // Push the definition
        pushDefinition(this.#codeBlockDefinitions, state.currentCodeBlock);

        // Remove any forward references
        this.#removeForwardReference(state.currentCodeBlock.name, 'codeblock')

        // Reset current code block and name
        state.currentCodeBlock = undefined;
        state.inCodeBlock = false;
        state.resetCodeBlockName();

        // If a code block ends while in a rule definition
        // then we expect a name next.
        if (state.inRuleDef) {
            state.expectNamedCodeBlock = true;
        }

        state.result = "End Code Block";
        return state;
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

        const pragma = newPragma(state);
        const name = pragma.name.lexeme;

        const parse = this.#pragmaParsers[name];
        if (!parse) {
            const startColumn = pragma.name.range.start.character;
            const endColumn = pragma.name.range.end.character;
            state = this.#addError(
                state,
                `Unknown pragma '${name}'`,
                ErrorSeverity.Error,
                startColumn,
                endColumn
            );
            return state;
        }

        // Call a pragmaparser function, ensuring that 'this'
        // is the current YantraParser
        state = parse.call(this, state, pragma);
        return state;
    }

    /** @type {PragmaParser} */
    #parsePragmaClass(state, pragma) {
        // Check if class pragma has already appeared
        const classpragmas = this.#pragmas['class'];
        if (classpragmas.length > 0) {
            state = this.#addError(
                state,
                'A %class pragma has already been specified'
            );
            return state;
        }

        // Check for parameter validity
        const paramMatch = pragma.params
            ? pragma.params.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;
        if (!paramMatch) {
            state = this.#addError(
                state,
                'The %class pragma expects a single valid C++ class name as parameter'
            );
            return state;
        }

        // Check for terminator
        if (!pragma.terminator) {
            state = this.#addError(state, 'A %class pragma should end with a semicolon');
            return state;
        }

        classpragmas.push({ className: paramMatch[1] });

        state.result = `Class Pragma: className: ${paramMatch[1]}`;
        return state
    }

    /** @type {PragmaParser} */
    #parsePragmaWalkers(state, pragma) {
        // Check if walkers pragma has already appeared
        const walkerspragmas = this.#pragmas.walkers;
        if (walkerspragmas) {
            state = this.#addError(
                state,
                'A %walkers pragma has already been specified'
            );
            return state;
        }

        // Check parameters
        const paramsMatch = matchRepeatingPattern(pragma, RepeatedElementPattern.CppNames);

        if (!paramsMatch || paramsMatch.length === 0) {
            state = this.#addError(
                state,
                'The %walkers pragma expects one or more valid C++ class names separated by spaces'
            );
            return state;
        }

        if (!pragma.terminator) {
            state = this.#addError(
                state,
                'The %walkers pragma should end with a semicolon'
            );
            return state;
        }

        this.#pragmas.walkers = new Map();
        const paramsOffset = pragma.params.range.start.character;

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] Walkername
            const walkerNameToken = lexicalTokenFromMatch(
                paramsMatch[i],
                1,
                state.line,
                paramsOffset
            );
            const walkerName = walkerNameToken.lexeme;
            const startColumn = walkerNameToken.range.start.character;
            const endColumn = walkerNameToken.range.end.character;

            // For now, add a key with the value false for members not defined.
            this.#pragmas.walkers.set(walkerName, false);

            // Also push as definition
            pushNewDefinition(
                state,
                this.#walkerDefinitions,
                walkerName,
                startColumn,
                endColumn
            );
        }

        // The first walker is considered the default walker
        this.#pragmas.defaultWalker = paramsMatch[0][1];

        state.result = "Walkers pragma";
        return state
    }

    /** @type {PragmaParser} */
    #parsePragmaDefaultWalker(state, pragma) {
        const paramMatch = pragma.params
            ? pragma.params.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state = this.#addError(
                state,
                'The %default_walker pragma expects a single valid walker name as parameter'
            );
            return state;
        }

        if (!pragma.terminator) {
            state = this.#addError(state, "A %default_walker pragma should end with a semicolon");
            return state;
        }

        const walkerNameToken = lexicalTokenFromMatch(
            paramMatch,
            1,
            state.line,
            pragma.params.range.start.character
        );
        const walkerName = walkerNameToken.lexeme;
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        // Add an error if the walker has not been defined
        if (!this.#walkerDefinitions.has(walkerName)) {
            state = this.#addError(
                state,
                `A walker called '${walkerName}' has not been defined`,
                ErrorSeverity.Error,
                startColumn,
                endColumn
            );
            return state;
        }

        // Set the default walker name
        this.#pragmas.defaultWalker = walkerName;

        state.result = "default_walker pragma";
        return state;
    }

    /** @type {PragmaParser} */
    #parsePragmaMembers(state, pragma) {
        const paramMatch = pragma.params
            ? pragma.params.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state = this.#addError(
                state,
                'The %members pragma expects a single valid walker name as parameter'
            );
            return state;
        }

        if (pragma.terminator) {
            state = this.#addError(
                state,
                'The %members pragma should be followed by a code block, not a semicolon'
            );
            return state;
        }

        // Add a warning if the mentioned walker has not been declared
        const walkerNameToken = lexicalTokenFromMatch(
            paramMatch,
            1,
            state.line,
            pragma.params.range.start.character
        );
        const walkerName = walkerNameToken.lexeme
        const startColumn = walkerNameToken.range.start.character;
        const endColumn = walkerNameToken.range.end.character;

        if (!this.#pragmas.walkers?.has(walkerName)) {
            state = this.#addError(
                state,
                `A walker called '${walkerName}' has not been defined`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            )
        }

        // Add a warning if a members pragma already exists for this walker
        const membersDefinedForWalker = this.#pragmas.walkers?.get(walkerName);
        if (membersDefinedForWalker) {
            state = this.#addError(
                state,
                `Members have already been defined for a walker called '${walkerName}'`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            )
        }

        // For now, set the walker value to true, signifying members defined.
        this.#pragmas.walkers?.set(walkerName, true);

        // A members pragma must be followed by an anonymous code 
        // block, so we will supply a name ourselves.
        state.setCodeBlockName(walkerName, 'Members');
        // A members pragma must be followed by an anonymous code 
        // block
        state.expectCodeBlock = true;

        state.result = `Members pragma: walkername: ${paramMatch[1]}`;
        return state;
    }

    /** @type {PragmaParser} */
    #parsePragmaAssociativity(state, pragma) {
        // Check parameters
        const paramsMatch = matchRepeatingPattern(pragma, RepeatedElementPattern.TokenNames);
        if (!paramsMatch || paramsMatch.length === 0) {
            state = this.#addError(
                state,
                `The %${pragma.name.lexeme} pragma expects one or more valid token names`
            );
            return state;
        }

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] YantraTokenName
            const YantraTokenNameToken = lexicalTokenFromMatch(
                paramsMatch[i],
                1,
                state.line,
                pragma.params.range.start.character
            );

            // const tokenName = paramsMatch[i][1];
            // const startColumn = paramsMatch[i].indices[1][0] + pragma.params.range.start.character;
            // const endColumn = startColumn + tokenName.length;
            const tokenName = YantraTokenNameToken.lexeme;
            const startColumn = YantraTokenNameToken.range.start.character;
            const endColumn = YantraTokenNameToken.range.end.character;

            // The token should not be defined at this point
            if (this.#tokenDefinitions.has(tokenName)) {
                state = this.#addError(
                    state,
                    `The %${pragma.name.lexeme} should appear before the definition of the token ${tokenName}`,
                    ErrorSeverity.Warning,
                    startColumn,
                    endColumn
                );
            } else {
                // Add a forward reference to the token
                const tokRefRange = YantraTokenNameToken.range;

                this.#addForwardReference(
                    tokenName,
                    'token',
                    tokRefRange
                );
            }
        }

        state.result = `%${pragma.name.lexeme} pragma.`;
        return state;
    }

    /** @type {PragmaParser} */
    #parsePragmaFunction(state, pragma) {
        if (!pragma.params) {
            state = this.#addError(
                state,
                'The %function pragma requires a rule and a function definition'
            )
            return state;
        }

        if (!pragma.terminator) {
            state = this.#addError(
                state,
                'The %function pragma should end with a semicolon'
            )
            return state;
        }

        const paramsMatch = pragma.params.lexeme.match(ElementPattern.FunctionDefinition);

        // The funcdef regexp matches:
        // - [1] Rule Definition name
        // - [2] Walker name. If empty, assume default walker
        // - [3] Function name
        // - [4] All C++ function parameters as a string
        // - [5] The C++ return type of the function as a string
        // - [6] A semicolon. May be empty
        const funcdef = newFunctionDefinition(paramsMatch, state.line, pragma.params.range.start.character);

        // Look up classname
        if (funcdef.walkerName) {
            if (!this.#walkerDefinitions.has(funcdef.walkerName.lexeme)) {
                const startColumn = funcdef.walkerName.range.start.character;
                const endColumn = funcdef.walkerName.range.end.character;
                state = this.#addError(
                    state,
                    `A walker called ${funcdef.walkerName.lexeme} has not been defined`,
                    ErrorSeverity.Error,
                    startColumn,
                    endColumn
                );
                return state;
            }
        }

        // Look up function name
        const funcNameStartColumn = funcdef.functionName.range.start.character; // pragma.params.range.start.character + paramsMatch.indices[3][0];
        const funcNameEndColumn = funcdef.functionName.range.end.character; //funcNameStartColumn + funcdef.functionName.length;
        const funcdefWalkerName = funcdef.walkerName?.lexeme ?? this.#pragmas.defaultWalker;
        const funcdefName = `${funcdef.ruleName.lexeme}::${funcdefWalkerName}::${funcdef.functionName.lexeme}`;

        if (this.#functionDefinitions.has(funcdefName)) {
            state = this.#addError(
                state,
                `A function called ${funcdef.functionName.lexeme} has already been defined for the walker ${funcdefWalkerName} and the rule ${funcdef.ruleName.lexeme}`,
                ErrorSeverity.Error,
                funcNameStartColumn,
                funcNameEndColumn
            );
            return state;
        }

        // Push definition
        pushNewDefinition(
            state,
            this.#functionDefinitions,
            funcdefName
        );

        // Add forward reference to rulename
        this.#addForwardReference(
            funcdef.ruleName.lexeme,
            'rule',
            funcdef.ruleName.range
        );

        // Add forward reference to code block
        this.#addForwardReference(
            funcdefName,
            'codeblock',
            funcdef.functionName.range
        );

        state.result = `%function pragma:${funcdefName}`;
        return state;
    }

    /** @type {LineParser} */
    #parseTokenDefinition(state) {
        // A tokendef can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        // The tokendef regexp returns:
        // - [1] token name
        // - [2] assignment operator
        // - [3] token value
        // - [4] "!' if present
        // - [5] semicolon if present
        const token = newYantraToken(state);
        const tokenName = token.name.lexeme;
        // const [, tokenName, value, , terminator] = state.matches;

        if (!token.terminator) {
            state = this.#addError(state, "A token definition should end with a semicolon");
            return state;
        }

        // Push definition
        pushNewDefinition(state, this.#tokenDefinitions, tokenName);

        // Remove any forward references for this token
        this.#removeForwardReference(tokenName, 'token');

        state.result = `Token Definition :- Token: ${tokenName}`;
        return state;
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

        // The ruledef regexp returns:
        // - [1]rule name
        // - [2] rule definition
        // - [3] semicolon if present

        const rule = newRule(state);
        const ruleName = rule.name.lexeme;

        const paramsMatches = matchRepeatingPatternInLexicalToken(
            rule.defininition,
            RepeatedElementPattern.RuleDefs
        );

        if (!paramsMatches) {
            state = this.#addError(
                state,
                'Syntax error in rule definition'
            );
            return state;
        }

        // Process rule definitions
        const definitionsOffset = rule.defininition.range.start.character;

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

            const elementName = ruleDefElement.element.lexeme;

            // An element could be a Token
            if (isYantraTokenName(elementName)) {
                // Check that the alias, if present, is also a token
                if (ruleDefElement.alias) {
                    if (!isYantraTokenName(ruleDefElement.alias.lexeme)) {
                        state = this.#addError(
                            state,
                            'The alias name for a token must match the casing of token names',
                            ErrorSeverity.Error,
                            ruleDefElement.alias.range.start.character,
                            ruleDefElement.alias.range.end.character
                        );
                    }
                }
                // Look up the token name. If not found, add a forward
                // reference.
                if (!this.#tokenDefinitions.has(elementName)) {
                    this.#addForwardReference(
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
                // Check that the alias, if present, is also a token
                if (ruleDefElement.alias) {
                    if (!isYantraRuleName(ruleDefElement.alias.lexeme)) {
                        state = this.#addError(
                            state,
                            'The alias name for a rule must match the casing of rule names',
                            ErrorSeverity.Error,
                            ruleDefElement.alias.range.start.character,
                            ruleDefElement.alias.range.end.character
                        );
                    }
                }

                // If the rule name used is the same as the rule being
                // defined, no need for a lookup or forward reference.
                if (elementName === rule.name.lexeme) {
                    continue;
                }

                // Look up the rule name. If not found, add a forward
                // reference.
                if (!this.#ruleDefinitions.has(elementName)) {
                    this.#addForwardReference(
                        elementName,
                        'rule',
                        ruleDefElement.element.range
                    );
                }
            }

        }

        // A rule definition that does not end in a semicolon is expecting
        // a code block
        if (!rule.terminator) {
            // We will set a default name for the first code block, which
            // could be anonymous
            state.setCodeBlockName(this.#pragmas.defaultWalker, 'go');
            state.startRuleDefWithCodeBlocks(ruleName);
        }

        // Push definintion
        pushNewDefinition(state, this.#ruleDefinitions, ruleName);

        // Clear any forward references
        this.#removeForwardReference(ruleName, 'rule');

        state.result = `Rule Definition := Rulename: ${ruleName}`;
        return state;
    }

    /**
     * 
     * @type {LineParser}
     */
    #parseCodeBlockName(state) {
        if (!state.inRuleDef) {
            state = this.#addError(
                state,
                'Named code block unexpected'
            );
            return state;
        }

        // The codeblockname regexp returns
        // - [1] class (walker) name
        // - [2] function name
        const className = state.matches[1];
        const functionName = state.matches[2] ?? 'go';

        // Validate the classname
        if (!this.#walkerDefinitions.has(className)) {
            const startColumn = state.matches.indices[1][0];
            const endColumn = state.matches.indices[1][1];
            state = this.#addError(
                state,
                `A walker named '${className}' has not been defined`,
                ErrorSeverity.Warning,
                startColumn,
                endColumn
            );
        }

        if (functionName != 'go') {
            // The full function name is in the form:
            //   RULENAME::WALKERNAME::functionname
            const funcFullName = `${state.ruleDefName}::${className}::${functionName}`;
            if (!this.#functionDefinitions.has(funcFullName)) {
                const startColumn = state.matches.indices[1][0];
                const endColumn = state.matches.indices[1][1];

                state = this.#addError(
                    state,
                    `A function called ${functionName} has not been defined for the walker ${className} and the rule ${state.ruleDefName}`,
                    ErrorSeverity.Warning,
                    startColumn,
                    endColumn
                );
            }
        }

        state.setCodeBlockName(className, functionName);

        // Once a name is parsed, we no longer expect a
        // name, but we immediately expect a code block
        state.expectNamedCodeBlock = false;
        state.expectCodeBlock = true;

        state.result = "Code Block Name";
        return state
    }

    /**
     * Adds an error (diagnostic) to the current document
     * @private
     * @param {ParseState} state 
     * @param {string} message - The diagnotic message
     * @param {ErrorSeverity} severity - The error severity. Default is Error.
     * @param {Number} [startColumn] - The column on the current line where the diagnostic context begins. By default the start of the line.
     * @param {Number} [endColumn] - The column on the current line where the diagnostic context ends. By default the end of the line.
     * @param {Number} [endRow] - The line number where the diagnostic context ends. By default the current line number.
     * @returns {ParseState}
     */
    #addError(state, message, severity = ErrorSeverity.Error, startColumn, endColumn, endRow) {
        return this.#addErrorWithRange(
            state,
            message,
            severity,
            {
                start: { line: state.line, character: startColumn ?? 0 },
                end: { line: endRow ?? state.line, character: endColumn ?? state.lineText.length }
            }
        );
    }

    /**
     * Adds an error (diagnostic) to the current document for the given range
     * @private
     * @param {ParseState} state 
     * @param {string} message - The diagnotic message
     * @param {ErrorSeverity} severity - The error severity. Default is Error.
     * @param {range} [range] - The range of the diagnostic context.
     * @returns {ParseState}
     */
    #addErrorWithRange(state, message, severity = ErrorSeverity.Error, range) {
        const newError = {
            severity,
            message,
            range
        }

        this.#errors.push(newError);
        state.errorCount++;

        state.result = `ERROR: ${message}`;
        return state;
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
}
