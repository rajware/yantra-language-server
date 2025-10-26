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
 * A parser function
 * @callback Parser
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
 * A regex and action combination that identifies a
 * non-terminal
 * @typedef {Object} SyntaxPattern
 * @property {RegExp} pattern
 * @property {Parser} action
 */

/**
 * An object that holds metadata about the different
 * types of pragmas.
 * @typedef {Object} PragmasMetaData
 * @property {any[]} class
 * @property {Map<string,any>} walkers
 * 
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
 * @readonly
 * @enum {Symbol}
 */
export const ParserStatus = {
    Initialized: Symbol('init'),
    Parsing: Symbol('parsing'),
    Ready: Symbol('ready')
}

/**
 * Enumeration for regex patterns used to detect productions
 * @readonly
 * @enum {RegExp}
 */
const SyntaxPattern = {
    Comment: /^\s*?\/\/.*?$/,
    Pragma: /^\s*?%([a-z_]+)(?:\s+(.*?))?(;?)$/d,
    TokenDefinition: /^\s*?([A-Z][A-Z0-9_]+)\s*?:=\s*?(".*?")(!)?\s*?(;)?\s*?$/d,
    RuleDefinition: /^\s*?([a-z][\w]*?)\s*?:=\s*?(.*?)(;)?\s*?$/d,
    CodeBlockName: /^@(\w+)(?:::(\w+))?$/d
}

/**
 * Enumeration for regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const ElementPattern = {
    TokenName: /^[A-Z]\w+$/d,
    RuleName: /^[a-z]\w+$/d,
    CppName: /^[a-zA-Z_]\w*$/d,
    SpacedCppName: /^\s*?([a-zA-Z_]\w*?)\s*$/d
}

/**
 * Enumeration for repeated regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const RepeatedElementPattern = {
    CppNames: /\s*?(?:([a-zA-Z]\w*)\s*?)+/dg
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
 * at the start and end respectively
 * @param {RegExp} input
 * @returns {RegExp}
 */
const ensureOnly = (input) => {
    const inputstr = input.source;
    return new RegExp(`^${inputstr}$`, input.flags);
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
            start: { line: state.lineNumber, character: indices[0] },
            end: { line: state.lineNumber, character: indices[1] },
        }
    }
}

/**
 * 
 * @param {ParseState} state
 * @returns {Pragma}
 */
const newPragma = (state) => {
    // The pragma regexp returns [1]pragma name [2] all parameters [3] semicolon if present
    return {
        name: lexicalTokenFromLine(state, 1),
        params: lexicalTokenFromLine(state, 2),
        terminator: lexicalTokenFromLine(state, 3)
    }
}

/**
 * Creates a definition from an element in the current line, or the entire line, and pushes
 * it to a definitions array
 * @param {ParseState} state
 * @param {YantraDefinition[]} definitions
 * @param {string} name - The name of the element being defined
 * @param {Number} [startColumn]
 * @param {Number} [endColumn]
 * @returns {YantraDefinition}
 */
const pushDefinition = (state, definitions, name, startColumn, endColumn) => {
    let defs;

    if (definitions.has(name)) {
        defs = definitions.get(name);
    } else {
        defs = [];
        definitions.set(name, defs);
    }

    const def = {
        name,
        range: {
            start: { line: state.lineNumber, character: startColumn ?? 0 },
            end: { line: state.lineNumber, character: endColumn ?? state.line.length },
        }
    };

    defs.push(def);
    return def;
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
    line = "";
    /**
     * The line number (zero-based) currently being parsed.
     */
    lineNumber = 0;
    /**
     * The regexp match that invoked the current parser.
     * @type {RegExpMatchArray | null}
     */
    matches = [];
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
    currentCodeBlock;
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
     * The line number of the start of the rule definition
     * the scanner is currently in, or -1.
     */
    ruleDefLineNumber = -1;

    startRuleDefWithCodeBlocks() {
        this.inRuleDef = true;
        this.ruleDefLineNumber = this.lineNumber;

        // A rule defininition must be followed by
        // a named or anonymous code block.
        this.expectNamedCodeBlock = true;
        this.expectCodeBlock = true;
    }

    resetRuleDef() {
        this.inRuleDef = false
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
    #codeBlocks;
    /** @type {YantraError[]} */
    #errors;
    /** @type {Number} */
    #errorThreshold = 25;
    /** @type {SyntaxPattern[]} */
    #syntaxPatterns = [
        {
            "pattern": SyntaxPattern.Comment,
            "action": (state) => {
                state.result = "Comment.";
                return state;
            }
        },
        {
            "pattern": SyntaxPattern.Pragma,
            "action": (state) => this.#parsePragma(state)
        },
        {
            "pattern": SyntaxPattern.TokenDefinition,
            "action": (state) => this.#parseTokenDefinition(state)
        },
        {
            "pattern": SyntaxPattern.RuleDefinition,
            "action": (state) => this.#parseRuleDefinition(state)
        }
    ];

    /**
     * @type {Map<string,PragmaParser>}
     */
    #pragmaParsers = {
        "class": this.#parsePragmaClass,
        "walkers": this.#parsePragmaWalkers,
        "members": this.#parsePragmaMembers
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
            members: []
        };

        this.#tokenDefinitions = new Map();
        this.#ruleDefinitions = new Map();
        this.#walkerDefinitions = new Map();
        this.#codeBlocks = [];
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
     * Errors detected after a  parse.
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
            const line = this.#lines[i];
            state.line = line;
            state.lineNumber = i;

            const trimmedLine = line.trim();

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
                    state.matches = line.match(SyntaxPattern.CodeBlockName)
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
                default:
                    let matched = false;
                    for (let j = 0; j < this.#syntaxPatterns.length; j++) {
                        const syntaxPattern = this.#syntaxPatterns[j];
                        state.matches = line.match(syntaxPattern.pattern);
                        if (state.matches) {
                            state = syntaxPattern.action(state);
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

            // Stop parsing if too many errors
            if (state.errorCount > this.#errorThreshold) {
                state = this.#addError(state, 'Too many errors. Parsing will stop');
                results.push(state.result);
                break;
            }
        }

        this.#results = results;
    }

    /**
     * 
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parseBeginCodeBlock(state) {
        if (!state.expectCodeBlock) {
            state = this.#addError(state, 'Unexpected start of code block');
            return state;
        }

        state.currentCodeBlock = {
            start: {
                line: state.lineNumber
            },
            end: undefined
        }

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

        state.currentCodeBlock.end = {
            line: state.lineNumber
        }

        this.#codeBlocks.push(state.currentCodeBlock);

        state.currentCodeBlock = undefined;
        state.inCodeBlock = false;

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
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parsePragma(state) {
        // A pragma can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        // The pragma regexp returns [1]pragma name [2] all parameters [3] semicolon if present
        const pragma = newPragma(state);
        //const [, name, params, terminator] = state.matches;
        const name = pragma.name.lexeme;

        const parse = this.#pragmaParsers[name];
        if (!parse) {
            const startColumn = state.matches.indices[1][0];
            const endColumn = state.matches.indices[1][1];
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

        const paramsMatch = !pragma.params
            ? undefined
            : ensureOnly(RepeatedElementPattern.CppNames).test(pragma.params.lexeme)
                ? Array.from(pragma.params.lexeme.matchAll(RepeatedElementPattern.CppNames))
                : undefined;

        if (!paramsMatch || paramsMatch.length === 0) {
            state = this.#addError(
                state,
                'The %walkers pragma expects one or more valid C++ class names'
            );
            return state;
        }

        this.#pragmas.walkers = new Map();
        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements [1] Walkername
            const walkerName = paramsMatch[i][1];
            const startColumn = pragma.params.range.start.character + paramsMatch[i].indices[1][0];
            const endColumn = startColumn + walkerName.length

            // For now, add a key with the value false for members not defined.
            this.#pragmas.walkers.set(walkerName, false);
            // Also push as definition
            pushDefinition(state, this.#walkerDefinitions, walkerName, startColumn, endColumn);
        }

        state.result = "Walkers pragma";
        return state
    }

    /** @type {PragmaParser} */
    #parsePragmaMembers(state, pragma) {

        const paramMatch = pragma.params
            ? pragma.params.lexeme.match(ElementPattern.SpacedCppName)
            : undefined;

        if (!paramMatch) {
            state = this.#addError(
                state,
                'The %members pragma expects a single valid C++ class name as parameter'
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
        const walkerName = paramMatch[1];
        const startColumn = pragma.params.range.start.character + paramMatch.indices[1][0];
        const endColumn = startColumn+walkerName.length;

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
        if(membersDefinedForWalker) {
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

        const memberspragmas = this.#pragmas['members'];
        memberspragmas.push({ walkerName: paramMatch[1] });

        state.expectCodeBlock = true;
        state.result = `Members pragma: walkername: ${paramMatch[1]}`;
        return state;
    }

    /**
     * 
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parseTokenDefinition(state) {
        // A tokendef can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        // The tokendef regexp returns [1]token name [2] token value [3] "!' if present [4] semicolon if present
        const [, tokenName, value, , terminator] = state.matches;

        if (!terminator) {
            state = this.#addError(state, "A token definition should end with a semicolon");
            return state;
        }

        // Push definition
        // /** @type {YantraDefinition[]} */
        // let tokenDefs;

        // if (this.#tokenDefinitions.has(tokenName)) {
        //     tokenDefs = this.#tokenDefinitions.get(tokenName);
        // } else {
        //     tokenDefs = [];
        //     this.#tokenDefinitions.set(tokenName, tokenDefs);
        // }

        // tokenDefs.push({
        //     name: tokenName,
        //     range: {
        //         start: { line: state.lineNumber, character: 0 },
        //         end: { line: state.lineNumber, character: state.line.length },
        //     }
        // });
        pushDefinition(state, this.#tokenDefinitions, tokenName);

        state.result = `Token Definition :- Token: ${tokenName} Value: ${value} Terminator: ${terminator}`;
        return state;
    }

    /**
     * 
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parseRuleDefinition(state) {
        // A ruledef can follow, and end, a previous rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        // The ruledef regexp returns [1]rule name [2] rule definition [3] semicolon if present
        const [, ruleName, ruledef, terminator] = state.matches;

        // validate ruledef
        const ruledefreg = /^\s*?(?:(?:([a-zA-Z]\w*?)\s*?)(?:\(([a-zA-Z]\w*?)\)\s*?)?)+$/
        if (!ruledefreg.test(ruledef)) {
            state = this.#addError(state, `Syntax error in rule definition: '${ruledef}'`);
            return state;
        }

        // A rule definition that does not end in a semicolon is expecting
        // a code block
        if (!terminator) {
            state.startRuleDefWithCodeBlocks();
        }

        // Push definintion
        // /** @type {YantraDefinition[]} */
        // let ruleDefs;
        // if (this.#ruleDefinitions.has(ruleName)) {
        //     ruleDefs = this.#ruleDefinitions.get(ruleName);
        // } else {
        //     ruleDefs = [];
        //     this.#ruleDefinitions.set(ruleName, ruleDefs);
        // }
        // ruleDefs.push({
        //     name: ruleName,
        //     range: {
        //         start: { line: state.lineNumber, character: 0 },
        //         end: { line: state.lineNumber, character: state.line.length }
        //     }
        // })
        pushDefinition(state, this.#ruleDefinitions, ruleName);

        state.result = `Rule Definition := Rulename: ${ruleName}`;
        return state;
    }

    /**
     * 
     * @param {ParseState} state 
     * @returns {ParseState}
     */
    #parseCodeBlockName(state) {
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
        const newError = {
            severity,
            message,
            range: {
                start: { line: state.lineNumber, character: startColumn ?? 0 },
                end: { line: endRow ?? state.lineNumber, character: endColumn ?? state.line.length }
            }
        }

        this.#errors.push(newError);
        state.errorCount++;

        state.result = `ERROR: ${message}`;
        return state;
    }
}
