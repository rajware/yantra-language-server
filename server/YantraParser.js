//#region JSDoc Types

/**
 * @typedef {Object} position
 * @property {Number} line - One-based line number.
 * @property {string} character - Zero-based character position in line.
*/

/**
 * @typedef {Object} range
 * @property {position} start - The starting position of an element.
 * @property {position} end - The ending position of an element.
 */

/**
 * @typedef {Object} YantraError
 * @property {ErrorSeverity} severity - Error severity.
 * @property {string} message - Error message.
 * @property {range} range - The range of the element to which this error pertains.
 */


/**
 * @typedef {Object} YantraTokenDefinition
 * @property {string} tokenName
 * @property {string} value
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
    TokenDefinition: /^\s*?([A-Z][A-Z0-9_]+)\s*?:=\s*?(".*?")(;)?\s*?$/d,
}

/**
 * Enumeration for regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const ElementPatterns = {
    CppName: /^\s*?([A-Z][A-Z0-9_]+)\s*?:=\s*?(".*?")(;)?\s*?$/d,
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
function isYantraTokenName(word) {
    return ElementPatterns.TokenName.test(word);
}

//#endregion

class ParseState {
    // Current line properties
    line = "";
    lineNumber = 0;
    matches = [];
    result = null;

    // Code Block properties
    inCodeBlock = false;
    currentCodeBlock;
    expectCodeBlock = false;
    expectNameOrCodeBlock = false;

    // Document cumulative properties
    errorCount = 0;
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
    /** @type {Map<string,YantraTokenDefinition>} */
    #tokenDefinitions;
    #codeBlocks;
    #errors;

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
        }
        /*
        ,
        {
            "pattern": /([a-z][a-zA-Z0-9_]+)\s*?:=\s*?(".*?")(;)?$/,
            "action":  (state) => {
                const match = state.matches;
                const error = match[3] ? "" : "ERROR: expected semicolon";
                state.result = `rule Definitin :- RuleName: ${match[1]} Params: ${match[2]} Terminator: ${match[3]} ${error}`;
                return state;
            }
        },
        */
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
     * Errors detected after a  parse.
     * @returns {YantraError[]}
     */
    get errors() {
        return this.#errors;
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
        "".search()
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
     * parameter are present. If the word is not recognized or
     * no definitions exist, an empty array is returned.
     * @param {string} word 
     * @returns {range[]}
     */
    getDefinitionLocationsFor(word) {
        const result = [];

        if(isYantraTokenName(word)) {
            if(this.#tokenDefinitions.has(word)) {
                const tokdef = this.#tokenDefinitions.get(word);
                result.push(tokdef.range);
            }
        }

        return result
    }

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

            // If a code block is expected, and the current line
            // is not a block begin, that's the error. 
            if (state.expectCodeBlock) {
                if (trimmedLine !== "%{") {
                    state = this.#addError(state, 'a code block was expected');
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
            if (state.errorCount > 5) {
                state = this.#addError(state, 'Too many errors. Parsing will stop');
                results.push(state.result);
                break;
            }
        }

        this.#results = results;
    }

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
        state.result = "End Code Block";
        return state;
    }

    #parsePragma(state) {
        // The pragma regexp returns [1]pragma name [2] all parameters [3] semicolon if present
        const [, name, params, terminator] = state.matches;
        const pragma = {
            name,
            params,
            terminator
        }
        const parse = this.#pragmaParsers[name];
        if (!parse) {
            const startColumn = state.matches.indices[1][1];
            const endColumn = startColumn + name.length;
            state = this.#addError(state, `Unknown pragma '${name}'`, startColumn, endColumn);
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

    #parseTokenDefinition(state) {
        // The tokendef regexp returns [1]token name [2] token value [3] semicolon if present
        const [, tokenName, value, terminator] = state.matches;

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

        this.#tokenDefinitions.set(tokenName, {
            tokenName,
            value,
            range: {
                start: { line: state.lineNumber, character: 0 },
                end: { line: state.lineNumber, character: state.line.length },
            }
        });

        state.result = `Token Definition :- Token: ${tokenName}(${state.matches.indices[1]}) Value: ${value} Terminator: ${terminator}`;

        return state;
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
