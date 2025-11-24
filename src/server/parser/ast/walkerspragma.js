/**
 * @typedef {import('../types').IParseState} IParseState
 * @typedef {import('../types').NodeParser} NodeParser
 * @typedef {import('../types').Reference} Reference
 * @typedef {import('../types').SemanticToken} SemanticToken
 */

const { ASTNode } = require('./astcore');
const { PragmaNode } = require('./pragmacore');
const { LexicalToken } = require('../lexicaltoken');
const { ElementPattern, RepeatedElementPattern, SemanticTokenType, SemanticTokenModifier } = require('../enums');

class WalkersPragmaNode extends PragmaNode {
    /** @type {WalkerNode[]} */
    #walkers;

    /**
     * @param {IParseState} state 
     */
    constructor(state) {
        super(state);
        this.#walkers = [];
    }

    /** @type {NodeParser} */
    parse(state) {
        if(!this.paramsToken) return;
        
        // Check if walkers pragma has already appeared
        if (state.walkersPragmaDefined) {
            state.addError(
                'A %walkers pragma has already been specified'
            );
            return;
        }

        // Check parameters
        const paramsMatch = this.paramsToken.matchRepeatingPattern(RepeatedElementPattern.CppNames);

        if (!paramsMatch || paramsMatch.length === 0) {
            state.addError(
                'The %walkers pragma expects one or more valid C++ class names separated by spaces'
            );
            return;
        }

        if (!this.validateTerminator(state, 'walkers')) {
            return;
        }

        const paramsOffset = this.paramsToken.range.start.character;

        for (let i = 0; i < paramsMatch.length; i++) {
            // Each match has the elements:
            // - [1] Walkername
            const walkerNameToken = state.lexicalTokenFromSubmatch(
                paramsMatch[i],
                1,
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

    /**
     * @param {Number} character
     * @returns {Reference|ASTNode|null}
     */
    getReferenceOrNodeAt(character) {
        const walker = this.#walkers.find(w => w.isCharacterInside(character));
        return walker ? walker : null;
    }

    getFormattedLines() {
        const walkernames = this.#walkers.map(walker => walker.name).join(' ');
        return [`%walkers ${walkernames};`];
    }

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        /** @type {LexicalToken[]} */
        const resultToks = [];
        if (noderef.type !== 'walker') return resultToks;

        const ref = this.#walkers.find(w => w.name === noderef.name);
        if (!ref) return resultToks;

        return ref.getLexicalTokensFor(noderef);
    }

    getSemanticTokens() {
        /** @type {SemanticToken[]} */
        const semToks = [];

        const pragmaToks = super.getSemanticTokens();
        semToks.push(...pragmaToks);

        this.#walkers.forEach(walker => {
            semToks.push({
                range: walker.range,
                tokenType: SemanticTokenType.Class,
                tokenModifiers: [SemanticTokenModifier.Declaration]
            });
        });

        return semToks;
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

    /**
     * @param {Reference} noderef - The reference to be queried in the current Node
     * @returns {LexicalToken[]} - The lexical token(s) which match the reference
     */
    getLexicalTokensFor(noderef) {
        const refs = [];
        // Since this will only be called from a parent
        // collection, no need to check if noderef matches.
        if (this.#walkerToken) {
            refs.push(this.#walkerToken);
        }
        return refs;
    }

    /**
     * 
     * @param {number} character 
     * @returns {boolean}
     */
    isCharacterInside(character) {
        return this.#walkerToken.isCharacterInside(character);
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

module.exports = {
    WalkersPragmaNode
}