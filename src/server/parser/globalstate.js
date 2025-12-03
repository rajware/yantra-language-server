/**
 * @typedef {import('./types').IGlobalState} IGlobalState
 * @typedef {import('./types').range} range
 * @typedef {import('./types').YantraError} YantraError
 * @typedef {import('./types').YantraDefinition} YantraDefinition
 * @typedef {import('./types').Reference} Reference
 * @typedef {import('./types').ForwardReference} ForwardReference
 */

const { ErrorSeverity } = require('./enums');
const { ASTNode } = require('./ast/astcore');

/**
 * @implements {IGlobalState}
 */
class GlobalState {
    /** @type YantraError[] */
    #errors;
    /** @type {Map<string, Map<string, YantraDefinition[]>>} */
    #definitionsMap;
    /** @type {ForwardReference[]} */
    #forwardReferences;

    /** @type {string} */
    className = '';
    walkersPragmaDefined = false;
    defaultWalkerName = '';

    /**
     * 
     * @param {YantraError[]} errors 
     * @param {Map<string, Map<string, YantraDefinition[]>>} definitionsMap 
     */
    constructor(errors, definitionsMap) {
        // this.#errors = [];
        // this.#definitionsMap = new Map([
        //     ['token', new Map()],
        //     ['rule', new Map()],
        //     ['walker', new Map()],
        //     ['function', new Map()],
        //     ['codeblock', new Map()],
        //     ['lexermode', new Map()],
        //     ['walkerinterface', new Map()]
        // ]);
        this.#errors = errors;
        this.#definitionsMap = definitionsMap;
        this.#forwardReferences = [];
    }

    /** @type YantraError[] */
    get errors() {
        return this.#errors;
    }

    /** @type {Map<string, Map<string, YantraDefinition[]>>} */
    get definitionsMap() {
        return this.#definitionsMap;
    }

    /** @type {ForwardReference[]} */
    get forwardReferences() {
        return this.#forwardReferences;
    }

    /**
     * Adds a node to the appropriate definitions collection.
     * @param {ASTNode} def
     * @returns {void}
     */
    addDefinition(def) {
        const defMap = this.#definitionsMap.get(def.type);
        if (defMap) {
            /** @type {YantraDefinition[]|undefined} */
            let defs;

            if (defMap.has(def.name)) {
                defs = defMap.get(def.name);
            } else {
                defs = [];
                defMap.set(def.name, defs);
            }

            defs?.push(def);
        }
    }

    /**
     * 
     * @param {string} message 
     * @param {ErrorSeverity} severity 
     * @param {range} range 
     */
    addErrorWithRange(message, severity = ErrorSeverity.Error, range) {
        const newError = {
            severity,
            message,
            range
        }

        this.#errors.push(newError);
    }

    /**
     * Looks up a reference from the appropriate definitions collection.
     * @param { Reference } ref
     * @returns { boolean }
     */
    lookupReference(ref) {
        const defMap = this.#definitionsMap.get(ref.type);
        if (!defMap) {
            return false;
        }

        return defMap.has(ref.name);
    }

    /**
     * Adds a forward reference
     * @param {string} name - The name of the element being forward-referenced
     * @param {string} type - The type of the element being forward-referenced
     * @param {range} range - The range of the element which references the named element
     */
    addForwardReference(name, type, range) {
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
    removeForwardReference(name, type) {
        this.#forwardReferences = this.#forwardReferences.filter(
            item => !(item.type === type && item.name === name)
        );
    }

    clearForwardReferences() {
        this.#forwardReferences = [];
    }
    /**
     * Searches for definitions of the given type. If found
     * returns an array of ranges where found.
     * @param {string} type
     * @param {string} name
     * @returns {range[]}
     */
    getDefinitionRanges(type, name) {
        const defMap = this.#definitionsMap.get(type);
        if (defMap?.has(name)) {
            const defs = defMap.get(name);
            // @ts-ignore
            return defs.map(def => def.range);
        }
        return [];
    }

    /**
     * Gets the count of existing definitions for a rule name.
     * Used to calculate internal rule names with suffixes.
     * @param {string} ruleName
     * @returns {number}
     */
    getRuleDefinitionCount(ruleName) {
        const defMap = this.#definitionsMap.get('rule');
        if (!defMap || !defMap.has(ruleName)) {
            return 0;
        }
        return defMap.get(ruleName).length;
    }

    /**
     * Gets all definitions for a given type and name.
     * @param {string} type
     * @param {string} name
     * @returns {YantraDefinition[]}
     */
    getDefinitions(type, name) {
        const defMap = this.#definitionsMap.get(type);
        if (!defMap || !defMap.has(name)) {
            return [];
        }
        return defMap.get(name) || [];
    }

    /**
     * Gets all functions defined for a specific rule name.
     * @param {string} ruleName
     * @returns {YantraDefinition[]}
     */
    getFunctionsForRule(ruleName) {
        const funcMap = this.#definitionsMap.get('function');
        if (!funcMap) return [];

        const functions = [];
        funcMap.forEach((defs) => {
            defs.forEach((def) => {
                // Function names are in format: ruleName::walkerName::functionName
                if (def.name.startsWith(ruleName + '::')) {
                    functions.push(def);
                }
            });
        });
        return functions;
    }
}

module.exports = {
    GlobalState
}