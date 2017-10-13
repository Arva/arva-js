/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Transitionable from './Transitionable.js';
import Transform from '../core/Transform.js';
import Utility from '../utilities/Utility.js';

export default class TransitionableTransform {
    /**
     * A class for transitioning the state of a Transform by transitioning
     * its translate, scale, skew and rotate components independently.
     *
     * @class TransitionableTransform
     * @constructor
     *
     * @param [transform=Transform.identity] {Transform} The initial transform state
     */
    constructor(transform) {
        this._final = Transform.identity.slice();

        this._finalTranslate = [0, 0, 0];
        this._finalRotate = [0, 0, 0];
        this._finalSkew = [0, 0, 0];
        this._finalScale = [1, 1, 1];

        this.translate = new Transitionable(this._finalTranslate);
        this.rotate = new Transitionable(this._finalRotate);
        this.skew = new Transitionable(this._finalSkew);
        this.scale = new Transitionable(this._finalScale);

        if (transform) this.set(transform);
    }

    _build() {
        return Transform.build({
            translate: this.translate.get(),
            rotate: this.rotate.get(),
            skew: this.skew.get(),
            scale: this.scale.get()
        });
    }

    _buildFinal() {
        return Transform.build({
            translate: this._finalTranslate,
            rotate: this._finalRotate,
            skew: this._finalSkew,
            scale: this._finalScale
        });
    }

    /**
     * An optimized way of setting only the translation component of a Transform
     *
     * @method setTranslate
     * @chainable
     *
     * @param translate {Array}     New translation state
     * @param [transition] {Object} Transition definition
     * @param [callback] {Function} Callback
     * @return {TransitionableTransform}
     */
    setTranslate(translate, transition, callback) {
        this._finalTranslate = translate;
        this._final = this._buildFinal();
        this.translate.set(translate, transition, callback);
        return this;
    }

    /**
     * An optimized way of setting only the scale component of a Transform
     *
     * @method setScale
     * @chainable
     *
     * @param scale {Array}         New scale state
     * @param [transition] {Object} Transition definition
     * @param [callback] {Function} Callback
     * @return {TransitionableTransform}
     */
    setScale(scale, transition, callback) {
        this._finalScale = scale;
        this._final = this._buildFinal();
        this.scale.set(scale, transition, callback);
        return this;
    }

    /**
     * An optimized way of setting only the rotational component of a Transform
     *
     * @method setRotate
     * @chainable
     *
     * @param eulerAngles {Array}   Euler angles for new rotation state
     * @param [transition] {Object} Transition definition
     * @param [callback] {Function} Callback
     * @return {TransitionableTransform}
     */
    setRotate(eulerAngles, transition, callback) {
        this._finalRotate = eulerAngles;
        this._final = this._buildFinal();
        this.rotate.set(eulerAngles, transition, callback);
        return this;
    }

    /**
     * An optimized way of setting only the skew component of a Transform
     *
     * @method setSkew
     * @chainable
     *
     * @param skewAngles {Array}    New skew state
     * @param [transition] {Object} Transition definition
     * @param [callback] {Function} Callback
     * @return {TransitionableTransform}
     */
    setSkew(skewAngles, transition, callback) {
        this._finalSkew = skewAngles;
        this._final = this._buildFinal();
        this.skew.set(skewAngles, transition, callback);
        return this;
    }

    /**
     * Setter for a TransitionableTransform with optional parameters to transition
     * between Transforms
     *
     * @method set
     * @chainable
     *
     * @param transform {Array}     New transform state
     * @param [transition] {Object} Transition definition
     * @param [callback] {Function} Callback
     * @return {TransitionableTransform}
     */
    set(transform, transition, callback) {
        var components = Transform.interpret(transform);

        this._finalTranslate = components.translate;
        this._finalRotate = components.rotate;
        this._finalSkew = components.skew;
        this._finalScale = components.scale;
        this._final = transform;

        var _callback = callback ? Utility.after(4, callback) : null;
        this.translate.set(components.translate, transition, _callback);
        this.rotate.set(components.rotate, transition, _callback);
        this.skew.set(components.skew, transition, _callback);
        this.scale.set(components.scale, transition, _callback);
        return this;
    }

    /**
     * Sets the default transition to use for transitioning betwen Transform states
     *
     * @method setDefaultTransition
     *
     * @param transition {Object} Transition definition
     */
    setDefaultTransition(transition) {
        this.translate.setDefault(transition);
        this.rotate.setDefault(transition);
        this.skew.setDefault(transition);
        this.scale.setDefault(transition);
    }

    /**
     * Getter. Returns the current state of the Transform
     *
     * @method get
     *
     * @return {Transform}
     */
    get() {
        if (this.isActive()) {
            return this._build();
        }
        else return this._final;
    }

    /**
     * Get the destination state of the Transform
     *
     * @method getFinal
     *
     * @return Transform {Transform}
     */
    getFinal() {
        return this._final;
    }

    /**
     * Determine if the TransitionalTransform is currently transitioning
     *
     * @method isActive
     *
     * @return {Boolean}
     */
    isActive() {
        return this.translate.isActive() || this.rotate.isActive() || this.scale.isActive() || this.skew.isActive();
    }

    /**
     * Halts the transition
     *
     * @method halt
     */
    halt() {
        this.translate.halt();
        this.rotate.halt();
        this.skew.halt();
        this.scale.halt();

        this._final = this.get();
        this._finalTranslate = this.translate.get();
        this._finalRotate = this.rotate.get();
        this._finalSkew = this.skew.get();
        this._finalScale = this.scale.get();

        return this;
    }
}
