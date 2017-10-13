/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Transform from '../core/Transform.js';
import OptionsManager from '../core/OptionsManager.js';
import Transitionable from '../transitions/Transitionable.js';
import Utility from '../utilities/Utility.js';
import SequentialLayout from './SequentialLayout.js';


export default class Deck extends SequentialLayout {

    /**
     * A Sequential Layout that can be opened and closed with animations.
     *
     *   Takes the same options as SequentialLayout
     *   as well as options for the open/close transition
     *   and the rotation you want your Deck instance to layout in.
     *
     * @class Deck
     * @constructor
     * @extends SequentialLayout
     *
     * @param {Options} [options] An object of configurable options
     * @param {Transition} [options.transition={duration: 500, curve: 'easeOutBounce'}
     *   The transition that executes upon opening or closing your deck instance.
     * @param {Number} [stackRotation=0] The amount of rotation applied to the propogation
     *   of the Deck instance's stack of renderables.
     * @param {Object} [options.transition] A transition object for changing between states.
     * @param {Number} [options.direction] axis of expansion (Utility.Direction.X or .Y)
     */
    constructor(options) {
        super(...arguments);

        this.state = new Transitionable(0);
        this._isOpen = false;

        this.setOutputFunction((input, offset, index) => {
            let state = _getState.call(this);
            let positionMatrix = (this.options.direction === Utility.Direction.X) ?
                Transform.translate(state * offset, 0, 0.001 * (state - 1) * offset) :
                Transform.translate(0, state * offset, 0.001 * (state - 1) * offset);
            let output = input.render();
            if (this.options.stackRotation) {
                let amount = this.options.stackRotation * index * (1 - state);
                output = {
                    transform: Transform.rotateZ(amount),
                    origin: [0.5, 0.5],
                    target: output
                };
            }
            return {
                transform: positionMatrix,
                size: input.getSize(),
                target: output
            };
        });
    }


    static DEFAULT_OPTIONS = OptionsManager.patch(SequentialLayout.DEFAULT_OPTIONS, {
        transition: {
            curve: 'easeOutBounce',
            duration: 500
        },
        stackRotation: 0
    })

    /**
     * Returns the width and the height of the Deck instance.
     *
     * @method getSize
     * @return {Array} A two value array of Deck's current width and height (in that order).
     *   Scales as Deck opens and closes.
     */
    getSize() {
        let originalSize = super.getSize(...arguments);
        let firstSize = this._items ? this._items.get().getSize() : [0, 0];
        if (!firstSize) firstSize = [0, 0];
        let state = this._getState();
        let invState = 1 - state;
        return [firstSize[0] * invState + originalSize[0] * state, firstSize[1] * invState + originalSize[1] * state];
    };

    _getState(returnFinal) {
        if (returnFinal) return this._isOpen ? 1 : 0;
        else return this.state.get();
    }

    _setState(pos, transition, callback) {
        this.state.halt();
        this.state.set(pos, transition, callback);
    }

    /**
     * An accesor method to find out if the messaged Deck instance is open or closed.
     *
     * @method isOpen
     * @return {Boolean} Returns true if the instance is open or false if it's closed.
     */
    isOpen() {
        return this._isOpen;
    }

    /**
     * Sets the Deck instance to an open state.
     *
     * @method open
     * @param {function} [callback] Executes after transitioning to a fully open state.
     */
    open(callback) {
        this._isOpen = true;
       this._setState(1, this.options.transition, callback);
    }

    /**
     * Sets the Deck instance to an open state.
     *
     * @method close
     * @param {function} [callback] Executes after transitioning to a fully closed state.
     */
    close(callback) {
        this._isOpen = false;
        this._setState(0, this.options.transition, callback);
    }

    /**
     * Sets the Deck instance from its current state to the opposite state.
     *
     * @method close
     * @param {function} [callback] Executes after transitioning to the toggled state.
     */
    toggle(callback) {
        if (this._isOpen) this.close(callback);
        else this.open(callback);
    }
}
