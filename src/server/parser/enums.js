/**
 * Enumeration for the severity of errors (diagnotics)
 * @readonly
 * @enum {Number}
 */
const ErrorSeverity = {
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
const ParserStatus = {
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
    Pragma: /^\s*?%([a-z_]+)(?:\s+(.*?))?(;)?$/d,
    TokenDefinition: /^\s*?([A-Z][A-Z0-9_]*?)\s*?(:=)\s*?(".*?")(!)?\s*?(?:\[([A-Za-z][A-Za-z0-9_]*?|\^)\])?\s*?(;)?\s*?$/d,
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
    FunctionDefinition: /^\s*?([a-z_]\w+)\s+(?:(?:([a-zA-Z_]\w+)::)?([a-zA-Z_]\w+))\s*?\((.*?)\)\s*?->\s*([^\s\(\);]+)\s*?(;)?\s*$/d,
    LexerMode: /^\s*?([A-Za-z][A-Za-z0-9_]*?)\s*$/d
}

/**
 * Enumeration for repeated regex patterns used to detect elements (tokens)
 * @readonly
 * @enum {RegExp}
 */
const RepeatedElementPattern = {
    CppNames: /\s*?(?:([a-zA-Z]\w*)\s*?)+/dg,
    TokenNames: /\s*?(?:([A-Z][A-Z_]*)\s*?)+/dg,
    RuleDefs: /\s*?(?:(\^)?([a-zA-Z]\w*)\s*(?:\(([a-zA-Z]\w*)\))?\s*)+?/dg
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

/**
 * Enumeration of semantic token types supported
 * by this parser. The server must declare them
 * in the same order.
 * @readonly
 * @enum {Number}
 */
const SemanticTokenType = {
    Keyword: 0,
    Class: 1,
    Method: 2,
    Function: 3,
    Variable: 4,
    Operator: 5,
    String: 6,
    Parameter: 7,
    Comment: 8
};

/**
 * Enumeration of semantic token modifiers supported
 * by this parser. The server must declare them in
 * the same order.
 * @readonly
 * @enum {Number}
 */
const SemanticTokenModifier = {
    Declaration: 0,
    Definition: 1,
    ReadOnly: 2
};

Object.freeze(ErrorSeverity);
Object.freeze(ParserStatus);
Object.freeze(SyntaxPattern);
Object.freeze(ElementPattern);
Object.freeze(RepeatedElementPattern);
Object.freeze(CompletionItemKind);
Object.freeze(SymbolKind);
Object.freeze(SemanticTokenType);
Object.freeze(SemanticTokenModifier);

module.exports = {
    ErrorSeverity,
    ParserStatus,
    SyntaxPattern,
    ElementPattern,
    RepeatedElementPattern,
    CompletionItemKind,
    SymbolKind,
    SemanticTokenType,
    SemanticTokenModifier
}
