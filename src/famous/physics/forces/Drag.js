/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Force from './Force.js';

export default class Drag extends Force {

    /**
     * Drag is a force that opposes velocity. Attach it to the physics engine
     * to slow down a physics body in motion.
     *
     * @class Drag
     * @constructor
     * @extends Force
     * @param {Object} options options to set on drag
     */
    constructor(options) {
      super(...arguments);
      this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);
    }

    /**
     * @property Drag.FORCE_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    static FORCE_FUNCTIONS = {

        /**
         * A drag force proportional to the velocity
         * @attribute LINEAR
         * @type Function
         * @param {Vector} velocity
         * @return {Vector} drag force
         */
        LINEAR : function(velocity) {
            return velocity;
        },

        /**
         * A drag force proportional to the square of the velocity
         * @attribute QUADRATIC
         * @type Function
         * @param {Vector} velocity
         * @return {Vector} drag force
         */
        QUADRATIC : function(velocity) {
            return velocity.mult(velocity.norm());
        }
    };

    /**
     * @property Drag.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    static DEFAULT_OPTIONS = {

        /**
         * The strength of the force
         *    Range : [0, 0.1]
         * @attribute strength
         * @type Number
         * @default 0.01
         */
        strength : 0.01,

        /**
         * The type of opposing force
         * @attribute forceFunction
         * @type Function
         */
        forceFunction : Drag.FORCE_FUNCTIONS.LINEAR
    }

    /**
     * Adds a drag force to a physics body's force accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply drag force to.
     */
    applyForce(targets) {
        let strength        = this.options.strength;
        let forceFunction   = this.options.forceFunction;
        let force           = this.force;
        let index;
        let particle;

        for (index = 0; index < targets.length; index++) {
            particle = targets[index];
            forceFunction(particle.velocity).mult(-strength).put(force);
            particle.applyForce(force);
        }
    }

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param {Objects} options
     */
    setOptions(options) {
        for (let key in options) this.options[key] = options[key];
    }
}
