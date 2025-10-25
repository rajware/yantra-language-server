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
const SyntaxPatterns = {
    Comment: /^\s*?\/\/.*?$/,
    Pragma: /^\s*?%([a-z_]+)(?:\s+(.*?))?(;?)$/d,
    TokenDefinition: /^\s*?([A-Z][A-Z0-9_]+)\s*?:=\s*?(".*?")(!)?(;)?\s*?$/d,
    RuleDefinition: /^\s*?([a-z][\w]*?)\s*?:=\s*?(.*?)(;)?\s*?$/d,
    CodeBlockName: /^@(\w+)(?:::(\w+))?$/d
}

/**
 * Enumeration for regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const ElementPatterns = {
    TokenName: /^[A-Z][A-Z0-9_]+$/d,
    RuleName: /^[a-z][a-zA-Z0-9_]+$/d
}

Object.freeze(ErrorSeverity);
Object.freeze(ParserStatus);
Object.freeze(SyntaxPatterns);
Object.freeze(ElementPatterns);

//#endregion

//#region Utility Functions

/**
 * Returns true if the parameter value is a valid Yantra token
 * name, false otherwise.
 * @param {string} word 
 * @returns {Boolean}
 */
const isYantraTokenName = (word) => {
    return ElementPatterns.TokenName.test(word);
}

const isYanraRuleName = (word) => {
    return ElementPatterns.RuleName.test(word);
}
//#endregion
/**
 * @typedef {Object} ParseState
 * @property {*} line
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
    #pragmas;
    /** @type {Map<string,YantraDefinition>} */
    #tokenDefinitions;
    /** @type {Map<string, YantraDefinition[]} */
    #ruleDefinitions;
    #codeBlocks;
    /** @type {YantraError[]} */
    #errors;
    /** @type {Number} */
    #errorThreshold = 25;

    #syntaxPatterns = [
        {
            "pattern": SyntaxPatterns.Comment,
            "action": (state) => {
                state.result = "Comment.";
                return state;
            }
        },
        {
            "pattern": SyntaxPatterns.Pragma,
            "action": (state) => {
                state = this.#parsePragma(state);
                return state
            }
        },
        {
            "pattern": SyntaxPatterns.TokenDefinition,
            "action": (state) => {
                state = this.#parseTokenDefinition(state);
                return state
            }
        },
        {
            "pattern": SyntaxPatterns.RuleDefinition,
            "action": (state) => {
                state = this.#parseRuleDefinition(state);
                return state;
            }
        }
    ];

    // Pragma parsers have the following signature:
    //  parser(state, pragma) -> state  
    #pragmaParsers = {
        "class": this.#parsePragmaClass,
        "members": this.#parsePragmaMember
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
            "class": [],
            "members": []
        };

        this.#tokenDefinitions = new Map();
        this.#ruleDefinitions = new Map();
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
                const tokdef = this.#tokenDefinitions.get(word);
                result.push(tokdef.range);
            }
        }

        if (isYanraRuleName(word)) {
            if (this.#ruleDefinitions.has(word)) {
                const ruleDefs = this.#ruleDefinitions.get(word);
                const ruleDefLocations = ruleDefs.map(def => def.range);
                result.push(...ruleDefLocations);
            }
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
                    state.matches = line.match(SyntaxPatterns.CodeBlockName)
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
        const [, name, params, terminator] = state.matches;
        const pragma = {
            name,
            params,
            terminator
        }
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

        state = parse.call(this, state, pragma);
        return state;
    }

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
            ? pragma.params.match(/^\s*?([A-Za-z][A-Za-z0-9_]*?)\s*?$/)
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

    #parsePragmaMember(state, pragma) {

        const paramMatch = pragma.params
            ? pragma.params.match(/^\s*?([A-Za-z][A-Za-z0-9_]*?)\s*?$/)
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

        if (this.#tokenDefinitions.has(tokenName)) {
            const match = state.matches;
            state = this.#addError(
                state,
                `Redefining a token is not allowed. Did you misspell ${tokenName} ?`,
                ErrorSeverity.Warning,
                match.indices[1][0],
                match.indices[1][1]
            );
            return state;
        }

        if (!terminator) {
            state = this.#addError(state, "A token definition should end with a semicolon");
            return state;
        }

        // Push definition
        this.#tokenDefinitions.set(tokenName, {
            name: tokenName,
            range: {
                start: { line: state.lineNumber, character: 0 },
                end: { line: state.lineNumber, character: state.line.length },
            }
        });

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
        /** @type {YantraDefinition[]} */
        let ruleDefs;
        if (this.#ruleDefinitions.has(ruleName)) {
            ruleDefs = this.#ruleDefinitions.get(ruleName);
        } else {
            ruleDefs = [];
            this.#ruleDefinitions.set(ruleName, ruleDefs);
        }
        ruleDefs.push({
            name: ruleName,
            range: {
                start: { line: state.lineNumber, character: 0 },
                end: { line: state.lineNumber, character: state.line.length }
            }
        })

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
