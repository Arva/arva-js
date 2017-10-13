/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import Transitionable from '../transitions/Transitionable.js';
 import OptionsManager from '../core/OptionsManager.js';


export default class Fader {
    /**
     * Modifier that allows you to fade the opacity of affected renderables in and out.
     * @class Fader
     * @constructor
     * @param {Object} [options] options configuration object.
     * @param {Boolean} [options.cull=false] Stops returning affected renderables up the tree when they're fully faded when true.
     * @param {Transition} [options.transition=true] The main transition for showing and hiding.
     * @param {Transition} [options.pulseInTransition=true] Controls the transition to a pulsed state when the Fader instance's pulse
     * method is called.
     * @param {Transition} [options.pulseOutTransition=true]Controls the transition back from a pulsed state when the Fader instance's pulse
     * method is called.
     *
     */
    constructor(options, startState) {
        this.options = Object.create(Fader.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);

        if (options) this.setOptions(options);

        if (!startState) startState = 0;
        this.transitionHelper = new Transitionable(startState);
    }

    static DEFAULT_OPTIONS = {
        cull: false,
        transition: true,
        pulseInTransition: true,
        pulseOutTransition: true
    }

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options.  See constructor.
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }

    /**
     * Fully displays the Fader instance's associated renderables.
     *
     * @method show
     * @param {Transition} [transition] The transition that coordinates setting to the new state.
     * @param {Function} [callback] A callback that executes once you've transitioned to the fully shown state.
     */
    show(transition, callback) {
        transition = transition || this.options.transition;
        this.set(1, transition, callback);
    }

    /**
     * Fully fades the Fader instance's associated renderables.
     *
     * @method hide
     * @param {Transition} [transition] The transition that coordinates setting to the new state.
     * @param {Function} [callback] A callback that executes once you've transitioned to the fully faded state.
     */
    hide(transition, callback) {
        transition = transition || this.options.transition;
        this.set(0, transition, callback);
    }

    /**
     * Manually sets the opacity state of the fader to the passed-in one. Executes with an optional
     * transition and callback.
     *
     * @method set
     * @param {Number} state A number from zero to one: the amount of opacity you want to set to.
     * @param {Transition} [transition] The transition that coordinates setting to the new state.
     * @param {Function} [callback] A callback that executes once you've finished executing the pulse.
     */
    set(state, transition, callback) {
        this.halt();
        this.transitionHelper.set(state, transition, callback);
    }

    /**
     * Halt the transition
     *
     * @method halt
     */
    halt() {
        this.transitionHelper.halt();
    }

    /**
     * Tells you if your Fader instance is above its visibility threshold.
     *
     * @method isVisible
     * @return {Boolean} Whether or not your Fader instance is visible.
     */
    isVisible() {
        return (this.transitionHelper.get() > 0);
    }

    /**
     * Return render spec for this Modifier, applying to the provided
     *    target component.  This is similar to render() for Surfaces.
     *
     * @private
     * @method modify
     *
     * @param {Object} target (already rendered) render spec to
     *    which to apply the transform.
     * @return {Object} render spec for this Modifier, including the
     *    provided target
     */
    modify(target) {
        let currOpacity = this.transitionHelper.get();
        if (this.options.cull && !currOpacity) return undefined;
        else return {opacity: currOpacity, target: target};
    }
}
