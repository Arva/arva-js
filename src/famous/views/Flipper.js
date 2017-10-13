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
import Transitionable from '../transitions/Transitionable.js';
import RenderNode from '../core/RenderNode.js';
import OptionsManager from '../core/OptionsManager.js';

export default class Flipper {

    /**
     * Allows you to link two renderables as front and back sides that can be
     *  'flipped' back and forth along a chosen axis. Rendering optimizations are
     *  automatically handled.
     *
     * @class Flipper
     * @constructor
     * @param {Options} [options] An object of options.
     * @param {Transition} [options.transition=true] The transition executed when flipping your Flipper instance.
     * @param {Direction} [options.direction=Flipper.DIRECTION_X] Direction specifies the axis of rotation.
     */
    constructor(options) {
        this.options = Object.create(Flipper.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.angle = new Transitionable(0);

        this.frontNode = undefined;
        this.backNode = undefined;

        this.flipped = false;
    }

    static DIRECTION_X = 0;
    static DIRECTION_Y = 1;

    static SEPERATION_LENGTH = 1;

    static DEFAULT_OPTIONS = {
        transition: true,
        direction: Flipper.DIRECTION_X
    }

    /**
     * Toggles the rotation between the front and back renderables
     *
     * @method flip
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    flip(transition, callback) {
        let angle = this.flipped ? 0 : Math.PI;
        this.setAngle(angle, transition, callback);
        this.flipped = !this.flipped;
    }

    /**
     * Basic setter to the angle
     *
     * @method setAngle
     * @param {Number} angle
     * @param {Object} [transition] Transition definition
     * @param {Function} [callback] Callback
     */
    setAngle(angle, transition, callback) {
        if (transition === undefined) transition = this.options.transition;
        if (this.angle.isActive()) this.angle.halt();
        this.angle.set(angle, transition, callback);
    }

    /**
     * Patches the Flipper instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the Flipper instance.
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }

    /**
     * Adds the passed-in renderable to the view associated with the 'front' of the Flipper instance.
     *
     * @method setFront
     * @chainable
     * @param {Object} node The renderable you want to add to the front.
     */
    setFront(node) {
        this.frontNode = node;
    }

    /**
     * Adds the passed-in renderable to the view associated with the 'back' of the Flipper instance.
     *
     * @method setBack
     * @chainable
     * @param {Object} node The renderable you want to add to the back.
     */
    setBack(node) {
        this.backNode = node;
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Number} Render spec for this component
     */
    render() {
        let angle = this.angle.get();

        let frontTransform;
        let backTransform;

        if (this.options.direction === Flipper.DIRECTION_X) {
            frontTransform = Transform.rotateY(angle);
            backTransform = Transform.rotateY(angle + Math.PI);
        }
        else {
            frontTransform = Transform.rotateX(angle);
            backTransform = Transform.rotateX(angle + Math.PI);
        }

        let result = [];
        if (this.frontNode){
            result.push({
                transform: frontTransform,
                target: this.frontNode.render()
            });
        }

        if (this.backNode){
            result.push({
                transform: Transform.moveThen([0, 0, SEPERATION_LENGTH], backTransform),
                target: this.backNode.render()
            });
        }

        return result;
    }
}
