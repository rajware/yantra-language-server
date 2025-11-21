/**
 * @typedef {import('./types').range} range
 */

class LexicalToken {
    /** @type {string} */
    #lexeme;
    /** @type {range} */
    #range;


    /**
     * @param {string} scanText 
     * @param {range} scanRange 
     */
    constructor(scanText, scanRange) {
        this.#lexeme = scanText;
        this.#range = scanRange;
    }

    get lexeme() {
        return this.#lexeme;
    }

    get range() {
        return this.#range;
    }

    /**
     * Creates a new RegExp from an existing one, by adding ^ and $.
     * @param {RegExp} input 
     * @returns 
     */
    #ensureOnly(input) {
        const inputstr = input.source;
        return new RegExp(`^${inputstr}$`, input.flags);
    };

    /**
     * Checks if a lexical token contains a repeated pattern only. If so,
     * returns a match array (matchAll). If not, returns undefined.
     * @param {RegExp} repeatingPattern 
     * @returns {RegExpExecArray[]|undefined}
     */
    matchRepeatingPattern(repeatingPattern) {
        return this.#ensureOnly(repeatingPattern).test(this.#lexeme)
            ? Array.from(this.#lexeme.matchAll(repeatingPattern))
            : undefined
    }

    /**
     * Returns true if the passed character position is inside the
     * token's character boundaries, else false.
     * @param {Number} character 
     * @returns {boolean}
     */
    isCharacterInside(character) {
        if(!this.#range.end) return false;
        
        if (character >= this.#range.start.character &&
            character <= this.#range.end.character) {
            return true;
        }

        return false;
    }
}

module.exports = {
    LexicalToken
};