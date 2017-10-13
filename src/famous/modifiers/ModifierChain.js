/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

export default class ModifierChain {

    /**
     * A class to add and remove a chain of modifiers
     *   at a single point in the render tree
     *
     * @class ModifierChain
     * @constructor
     */
    constructor() {
        this._chain = [];
        if (arguments.length) this.addModifier.apply(this, arguments);
    }

    /**
     * Add a modifier, or comma separated modifiers, to the modifier chain.
     *
     * @method addModifier
     *
     * @param {...Modifier*} varargs args list of Modifiers
     */
    addModifier(varargs) {
        Array.prototype.push.apply(this._chain, arguments);
    }

    /**
     * Remove a modifier from the modifier chain.
     *
     * @method removeModifier
     *
     * @param {Modifier} modifier
     */
    removeModifier(modifier) {
        let index = this._chain.indexOf(modifier);
        if (index < 0) return;
        this._chain.splice(index, 1);
    }

    /**
     * Return render spec for this Modifier, applying to the provided
     *    target component.  This is similar to render() for Surfaces.
     *
     * @private
     * @method modify
     *
     * @param {Object} input (already rendered) render spec to
     *    which to apply the transform.
     * @return {Object} render spec for this Modifier, including the
     *    provided target
     */
    modify(input) {
        let chain  = this._chain;
        let result = input;
        for (let i = 0; i < chain.length; i++) {
            result = chain[i].modify(result);
        }
        return result;
    }
}
