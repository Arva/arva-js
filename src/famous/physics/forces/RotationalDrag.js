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
import Drag from './Drag.js';

export default class RotationalDrag extends Drag {

    /**
     * Rotational drag is a force that opposes angular velocity.
     *   Attach it to a physics body to slow down its rotation.
     *
     * @class RotationalDrag
     * @constructor
     * @extends Force
     * @param {Object} options options to set on drag
     */
    constructor(options) {
      super(...arguments);
    }

    static DEFAULT_OPTIONS = Drag.DEFAULT_OPTIONS;
    static FORCE_FUNCTIONS = Drag.FORCE_FUNCTIONS;

    /**
     * @property Repulsion.FORCE_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    static FORCE_FUNCTIONS = {

        /**
         * A drag force proprtional to the angular velocity
         * @attribute LINEAR
         * @type Function
         * @param {Vector} angularVelocity
         * @return {Vector} drag force
         */
        LINEAR : function(angularVelocity) {
            return angularVelocity;
        },

        /**
         * A drag force proprtional to the square of the angular velocity
         * @attribute QUADRATIC
         * @type Function
         * @param {Vector} angularVelocity
         * @return {Vector} drag force
         */
        QUADRATIC : function(angularVelocity) {
            return angularVelocity.mult(angularVelocity.norm());
        }
    };

    /**
     * Adds a rotational drag force to a physics body's torque accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply drag force to.
     */
    applyForce(targets) {
        let strength       = this.options.strength;
        let forceFunction  = this.options.forceFunction;
        let force          = this.force;

        //TODO: rotational drag as function of inertia

        let index;
        let particle;

        for (index = 0; index < targets.length; index++) {
            particle = targets[index];
            forceFunction(particle.angularVelocity).mult(-100*strength).put(force);
            particle.applyTorque(force);
        }
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param {Objects} options
     */
    setOptions(options) {
        for (let key in options) this.options[key] = options[key];
    }
}
