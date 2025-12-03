// yantra.d.ts

import { CodeBlockNode } from "./ast/codeblock";
import { LexicalToken } from "./lexicaltoken";

// Basic structural types
/**
 * A position in a document.
 */
type position = {
  /**
   * - Zero-based line number in document.
   */
  line: number;
  /**
   * - Zero-based character position in line.
   */
  character: number;
};
/**
 * Start and end positions of an element.
 */
type range = {
  /**
   * - The start position of an element.
   */
  start: position;
  /**
   * - The end position of an element.
   */
  end: position;
};

/**
 * An error or diagnostic, with location context.
 */
type YantraError = {
  /**
   * Error severity.
   */
  severity: ErrorSeverity;
  /**
   * Error message.
   */
  message: string;
  /**
   * The range of the element to which this error pertains.
   */
  range: range;
}

interface Reference {
  type: 'rule' | 'token' | 'function' | 'walker' | 'lexermode' | 'walkerinterface';
  name: string;
}

interface ForwardReference {
  type: string;
  name: string;
  range: range;
}

interface YantraDefinition {
  name: string;
  range: range;
}

interface SemanticToken {
  range: range;
  tokenType: SemanticTokenType;
  tokenModifiers: SemanticTokenModifier[];
}

/**
 * The code block name nonterminal
 */
type CodeBlockName = {
  className: string;
  functionName: string;
};


// Enums
enum ErrorSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4
}

enum ParserStatus {
  Initialized = 'init',
  Parsing = 'parsing',
  Ready = 'ready'
}

enum SemanticTokenType {
  Keyword = 0,
  Class = 1,
  Method = 2,
  Function = 3,
  Variable = 4,
  Operator = 5,
  String = 6,
  Parameter = 7,
  Comment = 8
}

enum SemanticTokenModifier {
  Declaration = 0,
  Definition = 1,
  ReadOnly = 2
}

enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25
}

enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26
}

// Global state contract
interface IGlobalState {
  className: string;
  walkersPragmaDefined: boolean;
  defaultWalkerName: string;

  addErrorWithRange(
    message: string,
    severity: ErrorSeverity,
    range: range
  ): void;

  addDefinition(def: any): void; // ASTNode
  lookupReference(ref: Reference): boolean;

  addForwardReference(
    name: string,
    type: string,
    range: range
  ): void;

  removeForwardReference(
    name: string,
    type: string
  ): void;

  getRuleDefinitionCount(ruleName: string): number;
}

// Parse state contract
interface IParseState {
  // Properties
  readonly line: number;
  readonly lineText: string;
  readonly matches: RegExpMatchArray | null | undefined;
  readonly errorCount: number;
  readonly inRuleDef: boolean;
  readonly ruleDefName: string;
  readonly inCodeBlock: boolean;
  readonly currentCodeBlock: any; // CodeBlockNode
  readonly currentRule: any; // RuleNode
  className?: string;
  walkersPragmaDefined: boolean;
  defaultWalker: string;
  codeBlockName?: { className: string; functionName: string };
  expectCodeBlock: boolean;
  expectNamedCodeBlock: boolean;

  // Methods
  startNewLine(line: number, lineText: string): void;

  matchLine(lineSyntaxPattern: RegExp): RegExpMatchArray | null;

  addError(
    message: string,
    severity?: ErrorSeverity,
    startColumn?: number,
    endColumn?: number
  ): void;

  addRuleDefCodeBlockExpectedError(): void;
  addCodeBlockError(message: string, severity?: ErrorSeverity, codeBlock: CodeBlockNode): void;

  addDefinition(def: any): void; // ASTNode
  lookupReference(ref: Reference): boolean;

  addForwardReference(name: string, type: string, range: range): void;
  removeForwardReference(name: string, type: string): void;

  setCodeBlockName(className: string, functionName?: string): void;
  resetCodeBlockName(): void;

  startCodeBlock(startCharacter?: number): any; // CodeBlockNode
  resetCodeBlock(): void;

  startMultilineRule(rule: any): void; // RuleNode
  resetRuleDef(): void;

  fullLineRange(): range;
  lexicalTokenFromMatch(matchIndex: number): LexicalToken | null;
  lexicalTokenFromSubmatch(submatches: RegExpMatchArray, matchIndex: number, characterOffset: number);

  getRuleDefinitionCount(ruleName: string): number;
}

/**
 * A parser function in an AST Node
 */
type NodeParser = (state: IParseState) => void;
