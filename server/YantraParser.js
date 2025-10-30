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
 * @typedef {Object} GlobalState
 * @property {string} className
 * @property {boolean} walkersPragmaDefined
 * @property {string} defaultWalkerName
 * @property {() => {void}} addError
 * @property {(def:ASTNode) => void} addDefinition
 * @property {(def:ASTNode) => boolean } lookupDefinition
 * @property {(name:string, type:string, range:range) => void} addForwardReference
 * @property {(name:string, type:string) => void} removeForwardReference
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
    // Current line properties.
    // These reset per line.

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

    // All properties after this represent
    // state carried over multiple lines.
    // They do NOT reset per line.

    // Document cumulative properties
    /**
     * The total count of errors found so far.
     */
    errorCount = 0;
    /**
     * @type {GlobalState}
     */
    globalState;

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
     * @type {ASTNode}
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
     * Adds an error to the current line
     * @param {string} message - The diagnotic message
     * @param {ErrorSeverity} [severity] - The error severity. Default is Error.
     * @param {Number} [startColumn] - The column on the current line where the diagnostic context begins. By default the start of the line.
     * @param {Number} [endColumn] - The column on the current line where the diagnostic context ends. By default the end of the line.
     */
    addError(message, severity = ErrorSeverity.Error, startColumn, endColumn) {
        const self = this;
        this.globalState.addError(self, message, severity, startColumn, endColumn);
        // startColumn = startColumn ?? 0;
        // endColumn = endColumn ?? this.#line.length;

        // this.#errors.push({
        //     severity,
        //     message,
        //     range: {
        //         start: { line: this.#line, character: startColumn },
        //         end: { line: this.#line, character: endColumn }
        //     }
        // });
    }

    /**
     * Adds a definition to the current line
     * @param {YantraDefinition} def
     */
    addDefinition(def) {
        this.globalState.addDefinition(def);
    }

    /**
     * Looks up a definition. 
     * @param {YantraDefinition} def
     * @returns {boolean}
     */
    lookupDefinition(def) {
        return this.globalState.lookupDefinition(def);
    }

    /**
     * Adds a forward reference for the given name and type.
     * @param {string} name 
     * @param {string} type 
     * @param {range} range 
     */
    addForwardReference(name, type, range) {
        this.globalState.addForwardReference(name, type, range);
    }

    /**
     * Removes any forward references for the given name and type.
     * @param {string} name 
     * @param {string} type 
     * @param {range} range 
     */
    removeForwardReference(name, type) {
        this.globalState.removeForwardReference(name, type);
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
        this.#document = "";
        this.#lines = [];
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
            const results = this.#searchDefinitions('token', word);
            result.push(...results);
        }

        if (isYantraRuleName(word)) {
            const results = this.#searchDefinitions('rule', word);
            result.push(...results);
        }

        const results = this.#searchDefinitions('walker', word);
        result.push(...results);

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
            this.#astNodes = new Array(this.#lines.length);
            this.#parseLines();
            this.#status = ParserStatus.Ready;
        }

        return this.#astNodes.map(item => item?.toString() ?? "Unknown").join("\n");
    }

    #parseLines() {
        let state = new ParseState();
        state.globalState = {
            addError: this.#addError.bind(this),
            addDefinition: this.#adddefinition.bind(this),
            lookupDefinition: this.#lookupDefinition.bind(this),
            addForwardReference: this.#addForwardReference.bind(this),
            removeForwardReference: this.#removeForwardReference.bind(this)
        }

        for (let i = 0; i < this.#lines.length; i++) {
            const lineText = this.#lines[i];
            state.startNewLine(i, lineText);

            const trimmedLine = lineText.trim();

            // If in a codeblock, only look for %} and pass
            // everything else as a non-error.
            if (state.inCodeBlock) {
                if (trimmedLine === "%}") {
                    this.#astNodes[i] = this.#parseEndCodeBlock(state);

                    continue;
                } else {
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
                    this.#addError(state, 'a code block was expected');

                    if (state.inRuleDef) {
                        // TODO: check this
                        this.#addError(
                            state,
                            'Rule definition should be followed by a semicolon or a code block',
                            ErrorSeverity.Error,
                            state.ruleDefLineNumber,
                            0
                        )
                        state.resetRuleDef();
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
                        this.#addError(state, 'Syntax Error');
                        this.#astNodes[i] = undefined;

                    }
                    break;
                }
            }

            // Stop parsing if too many errors
            if (state.errorCount > this.#errorThreshold) {
                this.#addError(state, 'Too many errors. Parsing will stop');

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
                    state,
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
            this.#addError(state, 'Unexpected start of code block');
            return undefined;
        }

        // Code block names are a combination of the following elements:
        // - The rule definition name if part of a rule definition
        // - The walker name with which this code block is associated
        // - The function name for this code block
        // Separated by ::
        // const codeBlockName = `${state.inRuleDef ? state.ruleDefName + '::' : ''}${state.codeBlockName.className}::${state.codeBlockName.functionName}`;

        // state.currentCodeBlock = {
        //     name: codeBlockName,
        //     range: {
        //         start: { line: state.line, character: 0 },
        //         end: undefined
        //     }
        // };
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
            this.#addError(state, "Unexpected end of code block");
            return undefined;
        }

        const currentCodeBlock = state.currentCodeBlock;
        state.currentCodeBlock.parse(state);
        return currentCodeBlock;
        // state.currentCodeBlock.range.end = {
        // line: state.line,
        //     character: 0
        // };

        // // Push the definition
        // pushDefinition(this.#codeBlockDefinitions, state.currentCodeBlock);

        // // Remove any forward references
        // this.#removeForwardReference(state.currentCodeBlock.name, 'codeblock')

        // Reset current code block and name
        // state.currentCodeBlock = undefined;
        // state.inCodeBlock = false;
        // state.resetCodeBlockName();

        // // If a code block ends while in a rule definition
        // // then we expect a name next.
        // if (state.inRuleDef) {
        //     state.expectNamedCodeBlock = true;
        // }

        // state.result = "End Code Block";
        // return /* state */;
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
            this.#addError(
                state,
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
            this.#addError(
                state,
                'Named code block unexpected'
            );
            return undefined;
        }

        const node = new CodeBlockNameNode(state);
        node.parse(state);
        return node;
        // // The codeblockname regexp returns
        // // - [1] class (walker) name
        // // - [2] function name
        // const className = state.matches[1];
        // const functionName = state.matches[2] ?? 'go';

        // // Validate the classname
        // if (!this.#walkerDefinitions.has(className)) {
        //     const startColumn = state.matches.indices[1][0];
        //     const endColumn = state.matches.indices[1][1];
        //     /* state = */ this.#addError(
        //         state,
        //         `A walker named '${className}' has not been defined`,
        //         ErrorSeverity.Warning,
        //         startColumn,
        //         endColumn
        //     );
        // }

        // if (functionName != 'go') {
        //     // The full function name is in the form:
        //     //   RULENAME::WALKERNAME::functionname
        //     const funcFullName = `${state.ruleDefName}::${className}::${functionName}`;
        //     if (!this.#functionDefinitions.has(funcFullName)) {
        //         const startColumn = state.matches.indices[1][0];
        //         const endColumn = state.matches.indices[1][1];

        //         /* state = */ this.#addError(
        //             state,
        //             `A function called ${functionName} has not been defined for the walker ${className} and the rule ${state.ruleDefName}`,
        //             ErrorSeverity.Warning,
        //             startColumn,
        //             endColumn
        //         );
        //     }
        // }

        // state.setCodeBlockName(className, functionName);

        // // Once a name is parsed, we no longer expect a
        // // name, but we immediately expect a code block
        // state.expectNamedCodeBlock = false;
        // state.expectCodeBlock = true;

        // state.result = "Code Block Name";
        // return state
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
     */
    #addError(state, message, severity = ErrorSeverity.Error, startColumn, endColumn, endRow) {
        this.#addErrorWithRange(
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
     */
    #addErrorWithRange(state, message, severity = ErrorSeverity.Error, range) {
        const newError = {
            severity,
            message,
            range
        }

        this.#errors.push(newError);
        state.errorCount++;
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
    #adddefinition(def) {
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

    toString() {
        return `Type: ${this.type}, Name: ${this.name}`;
    }
}

class TokenNode extends ASTNode {
    #name; //: lexicalTokenFromLine(state, 1),
    #assignmentOperator; //: lexicalTokenFromLine(state, 2),
    #value; //: lexicalTokenFromLine(state, 3),
    #negator; //: lexicalTokenFromLine(state, 4),
    #terminator; //: lexicalTokenFromLine(state, 5)

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
        this.#name = lexicalTokenFromLine(state, 1);
        this.#assignmentOperator = lexicalTokenFromLine(state, 2);
        this.#value = lexicalTokenFromLine(state, 3);
        this.#negator = lexicalTokenFromLine(state, 4);
        this.#terminator = lexicalTokenFromLine(state, 5);
    }

    get name() {
        return this.#name.lexeme;
    }

    /** @type {NodeParser} */
    parse(state) {
        if (!this.#terminator) {
            state.addError('A token definition should end with a semicolon');
            return;
        }

        // Push definition
        state.addDefinition(this);

        // Remove any forward references for this token
        state.removeForwardReference(this.name, this.type);
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
    #walkerReferenceNode;

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

        this.#walkerReferenceNode = walkerReferenceNode;

        // Set the default walker name
        state.defaultWalker = walkerName;
    }
}

class MembersPragmaNode extends PragmaNode {
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

        // For now, set the walker value to true, signifying members defined.
        // this.#pragmas.walkers?.set(walkerName, true);

        // A members pragma must be followed by an anonymous code 
        // block, so we will supply a name ourselves.
        state.setCodeBlockName(walkerName, 'Members');
        // A members pragma must be followed by an anonymous code 
        // block
        state.expectCodeBlock = true;
    }
}

class AssociativityPragmaNode extends PragmaNode {
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
                `The %${this.name} pragma expects one or more valid token names`
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
}


class FunctionPragmaNode extends PragmaNode {

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
            funcdef.RuleNameToken.range
        );

        // Add forward reference to code block
        state.addForwardReference(
            funcdef.name,
            'codeblock',
            funcdef.functionNameToken.range
        );
    }
}

class FunctionDefinitionNode extends ASTNode {
    #ruleName;
    #walkerName;
    #functionName;
    #allParams;
    #returnType;
    #terminator;

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
        this.#ruleName = lexicalTokenFromMatch(match, 1, fdLine, fdOffset);
        this.#walkerName = lexicalTokenFromMatch(match, 2, fdLine, fdOffset);
        this.#functionName = lexicalTokenFromMatch(match, 3, fdLine, fdOffset);
        this.#allParams = lexicalTokenFromMatch(match, 4, fdLine, fdOffset);
        this.#returnType = lexicalTokenFromMatch(match, 5, fdLine, fdOffset);
        this.#terminator = lexicalTokenFromMatch(match, 6, fdLine, fdOffset)
    }

    get type() {
        return 'function';
    }

    get name() {
        return `${this.ruleName}::${this.walkerName}::${this.functionName}`
    }

    get RuleNameToken() {
        return this.#ruleName;
    }

    get ruleName() {
        return this.#ruleName.lexeme;
    }

    get walkerNameToken() {
        return this.#walkerName;
    }

    get walkerName() {
        return this.#walkerName?.lexeme ?? this.#defaulWalkerName;
    }

    get functionNameToken() {
        return this.#functionName;
    }

    get functionName() {
        return this.functionNameToken.lexeme;
    }
}

class RuleNode extends ASTNode {
    #nameToken;
    #definitionToken;
    #terminatorToken;

    /** @type {RuleDefElement[]} */
    #ruleDefElements;

    constructor(state) {
        // The ruledef regexp returns:
        // - [1] - rule name
        // - [2] - the entire rule definition
        // - [3] - semicolon, optional
        const name = lexicalTokenFromLine(state, 1);
        const defininition = lexicalTokenFromLine(state, 2);
        const terminator = lexicalTokenFromLine(state, 3);

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
        this.#definitionToken = defininition;
        this.#terminatorToken = terminator;

        this.#ruleDefElements = [];
    }

    get name() {
        return this.#nameToken.lexeme;
    }

    get defininition() {
        return this.#definitionToken.lexeme;
    }

    get definitionToken() {
        return this.#definitionToken;
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
            state.startRuleDefWithCodeBlocks(this.name);
        }

        // Push definintion
        // pushNewDefinition(state, this.#ruleDefinitions, ruleName);
        state.addDefinition(this);

        // Clear any forward references
        state.removeForwardReference(this.name, 'rule');
    }
}

class CommentNode extends ASTNode {
    constructor(state) {
        super('comment', fullLineRange(state));
    }

    /** @type {NodeParser} */
    parse(state) {


    }
}

class CodeBlockNode extends ASTNode {
    #name;

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
    }

    get name() {
        return this.#name;
    }

    /**
     * To be called when the end of the block has been encountered.
     * This RESETS the current code block, so cache it if required.
     * @type {NodeParser}
     */
    parse(state) {
        this.range.end = {
            line: state.line,
            character: state.lineText.length
        }

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
    }
}

class CodeBlockNameNode extends ASTNode {
    #classnameToken;
    #functionnameToken;
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
        this.#functionnameToken = lexicalTokenFromLine(state, 2);
        // A code block name can only appear in a rule definition
        this.#ruleDefName = state.ruleDefName;
    }

    get name() {
        return `${this.#ruleDefName}::${this.className}::${this.functionName}`
    }

    get className() {
        return this.#classnameToken.lexeme;
    }

    get functionName() {
        return this.#functionnameToken
            ? this.#functionnameToken.lexeme
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
            // The full function name is in the form:
            //   RULENAME::WALKERNAME::functionname
            const funcFullName = `${state.ruleDefName}::${this.className}::${this.functionName}`;
            if (!state.lookupDefinition({ type: 'function', name: funcFullName })) {
                const startColumn = this.#functionnameToken.range.start.character;
                const endColumn = this.#functionnameToken.range.end.character;

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
}