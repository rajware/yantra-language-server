/**
 * @typedef {import('../types').position} position
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 */

const {
    ElementPattern, RepeatedElementPattern,
    ErrorSeverity, SemanticTokenType,
    SemanticTokenModifier
} = require('../enums');
const { LexicalToken } = require('../lexicaltoken');
const { ASTNode, MultilineASTNode } = require('./astcore');

/**
 * The ruledefelement nonterminal
 * @typedef {Object} RuleDefElement
 * @property {LexicalToken} anchor
 * @property {LexicalToken} element
 * @property {LexicalToken|null} alias
 */

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

class RuleNode extends MultilineASTNode {
    #nameToken;
    #internalName;
    #aliasToken;
    #assignOpToken;
    #definitionToken;
    #terminatorToken;

    /** @type {position} */
    #multilineEnd;

    /** @type {RuleDefElement[]} */
    #ruleDefElements;

    /**
     * 
     * @param {IParseState} state 
     */
    constructor(state) {
        // The ruledef regexp returns:
        // - [1] - rule name
        // - [2] - alias, optional
        // - [3] - the assignment operator
        // - [4] - the entire rule definition
        // - [5] - semicolon, optional
        const name = state.lexicalTokenFromMatch(1);
        const alias = state.lexicalTokenFromMatch(2);
        const assignOp = state.lexicalTokenFromMatch(3);
        const defininition = state.lexicalTokenFromMatch(4);
        const terminator = state.lexicalTokenFromMatch(5);

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
        this.#internalName = this.#calculateInternalName(state);
        this.#aliasToken = alias;
        this.#assignOpToken = assignOp;
        this.#definitionToken = defininition;
        this.#terminatorToken = terminator;

        // Assume the multiline end is the same is the end.
        this.#multilineEnd = structuredClone(this.range.end);

        this.#ruleDefElements = [];
    }

    get name() {
        return this.#nameToken.lexeme;
    }

    get internalName() {
        return this.#internalName;
    }

    /**
     * Calculates the internal name for this rule definition.
     * First definition uses the base name, subsequent definitions
     * append _1, _2, etc.
     * @param {IParseState} state
     * @returns {string}
     */
    #calculateInternalName(state) {
        const baseName = this.#nameToken.lexeme;
        const existingDefs = state.getRuleDefinitionCount(baseName);

        if (existingDefs === 0) {
            return baseName;  // First definition
        } else {
            return `${baseName}_${existingDefs}`;  // Second+ definitions
        }
    }

    /** @type {NodeParser} */
    parse(state) {
        const paramsMatches = this.#definitionToken.matchRepeatingPattern(
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
        let anchorAppeared = false;

        for (let i = 0; i < paramsMatches.length; i++) {
            // Each match has the elements:
            // - [1] - a caret (^), which marks this ruledef as an "anchor"
            // - [2] - element, which could be a token or a rule
            // - [3] alias, a matching name, optional
            /** @type {RuleDefElement} */
            const ruleDefElement = {
                anchor: state.lexicalTokenFromSubmatch(
                    paramsMatches[i],
                    1,
                    definitionsOffset
                ),
                element: state.lexicalTokenFromSubmatch(
                    paramsMatches[i],
                    2,
                    definitionsOffset
                ),
                alias: state.lexicalTokenFromSubmatch(
                    paramsMatches[i],
                    3,
                    definitionsOffset
                )
            }

            // Store it internally
            this.#ruleDefElements.push(ruleDefElement);

            // Check if anchors are repeated
            if (ruleDefElement.anchor) {
                if (anchorAppeared) {
                    state.addError(
                        'There cannot be more than one anchor in a rule definition',
                        ErrorSeverity.Error,
                        ruleDefElement.anchor.range.start.character,
                        ruleDefElement.anchor.range.end.character
                    );
                } else {
                    anchorAppeared = true;
                }
            }
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
                if (!state.lookupReference({ type: 'token', name: elementName })) {
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
                if (!state.lookupReference({ type: 'rule', name: elementName })) {
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

        // For each function defined for this rule, create a forward reference
        // to the corresponding code block (unless a walker interface exists)
        const functions = state.getFunctionsForRule(this.name);
        functions.forEach((funcDef) => {
            // Extract walker name from function name (format: ruleName::walkerName::functionName)
            const parts = funcDef.name.split('::');
            const walkerName = parts[1];
            const functionName = parts[2];

            // Skip if walker has an interface
            if (state.lookupReference({
                name: walkerName,
                type: 'walkerinterface'
            })) {
                return;
            }

            // Create forward reference using internal rule name
            const codeBlockName = `${this.internalName}::${walkerName}::${functionName}`;
            state.addForwardReference(
                codeBlockName,
                'codeblock',
                this.#nameToken.range
            );
        });
    }

    /**
     * @param {IParseState} state 
     * @returns {ASTNode}
     */
    end(state) {
        // Rule ended as this line began
        this.#multilineEnd = {
            line: state.line,
            character: 0
        };

        return this;
    }

    /**
     * @param {Number} character
     * @returns {Reference|null}
     */
    getReferenceAt(character) {
        const rdef = this.#ruleDefElements?.find(
            rdelement => rdelement.element.isCharacterInside(character)
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

    /**
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        if (this.#nameToken.isCharacterInside(character)) {
            return this;
        }

        return this.getReferenceAt(character);
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const resulToks = [];
        if (!(['rule', 'token'].includes(noderef.type))) return resulToks;

        if (noderef.type === 'rule' && noderef.name === this.name) {
            resulToks.push(this.#nameToken);
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

        if (refs.length === 0) return resulToks;

        resulToks.push(...refs);
        return resulToks;
    }

    getFormattedLines() {
        const ruleElements = [this.name];
        if (this.#aliasToken) {
            ruleElements.push(`(${this.#aliasToken.lexeme})`);
        }
        ruleElements.push(':=');

        this.#ruleDefElements.forEach(item => {
            ruleElements.push(`${item.anchor ? '^' : ''}${item.element.lexeme}`);
            if (item.alias) {
                ruleElements.push(`(${item.alias.lexeme})`);
            }
        });

        let ruleLineText = ruleElements.join(' ');
        ruleLineText += (this.#terminatorToken ? ';' : '');

        return [ruleLineText];
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        semToks.push({
            range: this.#nameToken.range,
            tokenType: SemanticTokenType.Function,
            tokenModifiers: [
                SemanticTokenModifier.Declaration,
                SemanticTokenModifier.Definition
            ]
        });

        if (this.#aliasToken) {
            semToks.push({
                range: this.#aliasToken.range,
                tokenType: SemanticTokenType.Parameter,
                tokenModifiers: []
            });
        }

        semToks.push({
            range: this.#assignOpToken.range,
            tokenType: SemanticTokenType.Operator,
            tokenModifiers: []
        });

        this.#ruleDefElements.forEach(rdef => {
            if (rdef.anchor) {
                semToks.push({
                    range: rdef.anchor.range,
                    tokenType: SemanticTokenType.Operator,
                    tokenModifiers: []
                });
            }
            semToks.push({
                range: rdef.element.range,
                tokenType: isYantraRuleName(rdef.element.lexeme)
                    ? SemanticTokenType.Function
                    : SemanticTokenType.Variable,
                tokenModifiers: []
            });

            if (rdef.alias) {
                semToks.push({
                    range: rdef.alias.range,
                    tokenType: SemanticTokenType.Parameter,
                    tokenModifiers: []
                });
            }
        });

        return semToks;
    }
}

module.exports = {
    RuleNode
};