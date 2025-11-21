/**
 * @typedef {import('./types').IParseState} IParseState
 * @typedef {import('./types').range} range
 * @typedef {import('./types').Reference} Reference
 * @typedef {import('./types').YantraError} YantraError
 * @typedef {import('./types').YantraDefinition} YantraDefinition
 */

const {
    ParserStatus,
    SyntaxPattern,
    CompletionItemKind, SymbolKind,
    SemanticTokenType, SemanticTokenModifier,
    ErrorSeverity
} = require('./enums');
const { GlobalState } = require('./globalstate');
const { ParseState } = require('./parsestate');
const {
    ASTNode,
    CommentNode,
    PragmaNode,
    ClassNamePragmaNode,
    WalkersPragmaNode, DefaultWalkerPragmaNode, MembersPragmaNode,
    FunctionPragmaNode,
    AssociativityPragmaNode,
    LexerModePragmaNode,
    StubPragmaNode,
    RuleNode,
    TokenNode,
    CodeBlockNode, CodeBlockNameNode
} = require('./ast/nodetypes.js');

/**
 * A line parser function
 * @callback LineParser
 * @param {IParseState} state
 * @returns {ASTNode|undefined}
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
 * Data structure for populating document outline view.
 * @typedef {Object} DocumentSymbol
 * @property {string} name
 * @property {SymbolKind} kind - SymbolKind enum (e.g., 12 = Function, 5 = Class)
 * @property {range} range
 * @property {range} selectionRange
 * @property {DocumentSymbol[]} [children]
 */

/**
 * Semantic token
 * @typedef {Object} SemanticToken
 * @property {range} range
 * @property {SemanticTokenType} tokenType
 * @property {SemanticTokenModifier[]} tokenModifiers
 */


class YantraParser {
    /** @type {ParserStatus} */
    #status = ParserStatus.Initialized;
    /** @type {(ASTNode|undefined)[]} */
    #astNodes = [];
    /** @type YantraError[] */
    #errors;
    /** @type {Map<string, Map<string, YantraDefinition[]>>} */
    #definitionsMap;

    /** @type {Number} */
    #errorThreshold;

    /** @type {LinePattern[]} */
    #linePatterns;

    /** @type {GlobalState|undefined} */
    #globalState;

    /**
     * The semantic token types currently supported by this
     * parser, in the correct order.
     * @readonly
     * @returns {string[]}
     */
    static get semanticTokenTypes() {
        return [
            'keyword', 'class', 'method', 'function',
            'variable', 'operator', 'string', 'parameter',
            'comment'
        ];
    }

    /**
     * The semantic token modifiers currently supported by
     * this parser, in the correct order.
     * @readonly
     * @returns {string[]}
     */
    static get semanticTokenModifiers() {
        return ['declaration', 'definition', 'readonly'];
    }

    constructor() {
        // Set up line pattern handlers
        this.#linePatterns = [{
            "type": 'comment',
            "pattern": SyntaxPattern.Comment,
            "action": this.#parseComment
        },
        {
            "type": 'pragma',
            "pattern": SyntaxPattern.Pragma,
            "action": this.#parsePragma
        },
        {
            "type": 'token',
            "pattern": SyntaxPattern.TokenDefinition,
            "action": this.#parseTokenDefinition
        },
        {
            'type': 'rule',
            "pattern": SyntaxPattern.RuleDefinition,
            "action": this.#parseRuleDefinition
        }];

        // Set up parser preferences
        this.#errorThreshold = 25;

        this.#errors = [];
        this.#definitionsMap = new Map([
            ['token', new Map()],
            ['rule', new Map()],
            ['walker', new Map()],
            ['function', new Map()],
            ['codeblock', new Map()],
            ['lexermode', new Map()]
        ]);

        this.#astNodes = [];
        this.#status = ParserStatus.Initialized;
        this.#globalState = undefined;
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
        this.#errors = [];
        this.#definitionsMap = new Map([
            ['token', new Map()],
            ['rule', new Map()],
            ['walker', new Map()],
            ['function', new Map()],
            ['codeblock', new Map()],
            ['lexermode', new Map()]
        ]);
        this.#astNodes = [];
        this.#status = ParserStatus.Initialized;
        this.#globalState = undefined;
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
        /** @type range[] */
        const defRanges = [];

        if (this.#status !== ParserStatus.Ready) return defRanges;
        if (line < 0 || line > this.#astNodes.length) return defRanges;

        const node = this.#astNodes[line];
        if (!node) return defRanges;

        const searchElement = node.getReferenceAt(character);
        if (searchElement) {
            // @ts-ignore
            const nodeDefs = this.#globalState.getDefinitionRanges(searchElement.type, searchElement.name);
            defRanges.push(...nodeDefs);
        }

        return defRanges;
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
        /** @type {range[]} */
        const defRanges = [];

        // Don't do it if not parsed
        if (this.#status !== ParserStatus.Ready) return defRanges;

        // Don't do it if any errors

        // Don't do it if out of bounds
        if (line < 0 || line > this.#astNodes.length) return defRanges;

        const node = this.#astNodes[line];
        if (!node) return defRanges;

        const searchElement = node.getReferenceOrNodeAt(character);
        if (!searchElement) return defRanges;

        if (!(searchElement.type)) {
            return defRanges;
        }

        /** @type {Reference} */
        // @ts-ignore
        const searchRef = { name: searchElement.name, type: searchElement.type };

        this.#astNodes.forEach((node, i) => {
            if (!node) return;

            const allReferences = node.getLexicalTokensFor(searchRef);
            if (allReferences.length > 0) {
                const refRanges = allReferences.map(item => item.range);
                defRanges.push(...refRanges);
            }
        });

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
        if (this.status !== ParserStatus.Ready || !this.#globalState) return [];

        return this.#globalState.errors;
    }

    /**
     * Pretty prints the current document. Returns an array of
     * strings, or an empty array if pretty printing not 
     * possible.
     * @returns {string[]}
     */
    getFormattedLines() {
        /** @type {string[]} */
        const lines = [];
        if (this.status !== ParserStatus.Ready || !this.#globalState) return lines;
        if (this.#globalState.errors.length > 0) return lines;

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

    /**
     * Aligns token definitions by position of assignment symbol.
     * @param {string[]} lines 
     * @returns {string[]}
     */
    #alignTokenDefs(lines) {
        const tokenDefRegex = SyntaxPattern.TokenDefinition;
        /** @type {string[]} **/
        const result = [];
        /** @type {string[]} */
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
                    const lexermode = match[5] ? ` [${match[5]}]` : '';
                    const semicolon = match[6];
                    result.push(`${lhs} := ${rhs}${bang}${lexermode}${semicolon}`);
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
     * @returns {DocumentSymbol[]}
     */
    getDocumentSymbols() {
        if (this.#status !== ParserStatus.Ready) return [];

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

        const lexerModeSymbols = {
            name: 'Lexer Modes',
            kind: SymbolKind.Namespace,
            range: documentRange,
            selectionRange: emptyRange,
            children: []
        };
        this.#addSymbols(lexerModeSymbols.children, 'lexermode', SymbolKind.Constant);

        const documentOutline = [
            tokenSymbols,
            ruleSymbols,
            walkerSymbols,
            functionSymbols,
            lexerModeSymbols
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
        if (!this.#globalState) return;

        const definitionsMap = this.#globalState.definitionsMap.get(definitionType);
        if (!definitionsMap) return;

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
     * Gets all semantic tokens.
     * @returns {SemanticToken[]}
     */
    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const sTokens = [];
        if (this.#status !== ParserStatus.Ready) return sTokens;

        this.#astNodes.forEach(node => {
            const tokArr = node?.getSemanticTokens();
            if (tokArr && tokArr.length > 0) {
                sTokens.push(...tokArr);
            }
        });

        return sTokens;
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
        this.#globalState = new GlobalState(this.#errors, this.#definitionsMap);
        // let state = new ParseState({
        //     className: undefined,
        //     walkersPragmaDefined: false,
        //     defaultWalkerName: undefined,
        //     addErrorWithRange: this.#addErrorWithRange.bind(this),
        //     addDefinition: this.#addDefinition.bind(this),
        //     lookupReference: this.#lookupReference.bind(this),
        //     addForwardReference: this.#addForwardReference.bind(this),
        //     removeForwardReference: this.#removeForwardReference.bind(this)
        // });
        let state = new ParseState(this.#globalState);

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
                    state.currentCodeBlock?.appendLine(lineText);
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
        for (let i = 0; i < this.#globalState?.forwardReferences.length; i++) {
            const forwardRef = this.#globalState.forwardReferences[i];
            const defs = this.#definitionsMap.get(forwardRef.type);

            // If definition type is not known, ignore it
            if (!defs) continue;

            if (!defs.has(forwardRef.name)) {
                this.#globalState.addErrorWithRange(
                    `The ${forwardRef.type} '${forwardRef.name}' has not been defined`,
                    ErrorSeverity.Warning,
                    forwardRef.range
                );
            }
        }

        // Clear forward references
        this.#globalState.clearForwardReferences();
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

        return state.startCodeBlock();
        // const codeBlock = new CodeBlockNode(state)
        // state.currentCodeBlock = codeBlock;

        // state.inCodeBlock = true
        // state.expectCodeBlock = false;

        // return codeBlock;
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
        if (!state.matches || !state.matches.indices) {
            throw "Unexpected regular expression error in parsePragma";
        }

        // A pragma can follow, and end, a rule definition
        if (state.inRuleDef) {
            state.resetRuleDef();
        }

        /** @type {PragmaNode|undefined} */
        let pragmaNode;
        const pragmaName = state.matches ? state.matches[1] : '';
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
            case 'lexer_mode':
                pragmaNode = new LexerModePragmaNode(state);
                break;
            case 'namespace':
            case 'pch_header':
            case 'std_header':
            case 'hdr_header':
            case 'src_header':
            case 'class_member':
            case 'encoding':
            case 'check_unused_tokens':
            case 'auto_resolve':
            case 'warn_resolve':
            case 'walker_output':
            case 'walker_traversal':
            case 'start':
            case 'fallback':
                pragmaNode = new StubPragmaNode(state);
            default:
                pragmaNode = undefined;
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
        const funcFilter = new RegExp(`\\w+?::${prefix}\\w*`);
        // @ts-ignore
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

module.exports = {
    ParserStatus,
    YantraParser
}