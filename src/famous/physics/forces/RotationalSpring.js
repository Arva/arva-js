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
import Spring from './Spring.js';
import Quaternion from '../../math/Quaternion.js';

//TODO: test inheritance
export default class RotationalSpring extends Spring {

    /**
     *  A force that rotates a physics body back to target Euler angles.
     *  Just as a spring translates a body to a particular X, Y, Z, location,
     *  a rotational spring rotates a body to a particular X, Y, Z Euler angle.
     *      Note: there is no physical agent that does this in the "real world"
     *
     *  @class RotationalSpring
     *  @constructor
     *  @extends Spring
     *  @param {Object} options options to set on drag
     */
    constructor(options) {
      super(...arguments);
    }

    static DEFAULT_OPTIONS = Spring.DEFAULT_OPTIONS;
    static FORCE_FUNCTIONS = Spring.FORCE_FUNCTIONS;

    _calcStiffness() {
        var options = this.options;
        options.stiffness = Math.pow(2 * Math.PI / options.period, 2);
    }

    _calcDamping() {
        var options = this.options;
        options.damping = 4 * Math.PI * options.dampingRatio / options.period;
    }

    function _init() {
        this._calcStiffness();
        this._calcDamping();
    }

    setOptions(options) {
        // TODO fix no-console error
        /* eslint no-console: 0 */

        if (options.anchor !== undefined) {
            if (options.anchor instanceof Quaternion) this.options.anchor = options.anchor;
            if (options.anchor  instanceof Array) this.options.anchor = new Quaternion(options.anchor);
        }

        if (options.period !== undefined){
            this.options.period = options.period;
        }

        if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
        if (options.length !== undefined) this.options.length = options.length;
        if (options.forceFunction !== undefined) this.options.forceFunction = options.forceFunction;
        if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;

        _init.call(this);
        Force.prototype.setOptions.call(this, options);
    }

    /**
     * Adds a torque force to a physics body's torque accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply torque to.
     */
    applyForce(targets) {
        let force = this.force;
        let options = this.options;
        let disp = this.disp;

        let stiffness = options.stiffness;
        let damping = options.damping;
        let restLength = options.length;
        let anchor = options.anchor;
        let forceFunction = options.forceFunction;
        let maxLength = options.maxLength;

        let i;
        let target;
        let dist;
        let m;

        for (i = 0; i < targets.length; i++) {
            target = targets[i];

            disp.set(anchor.sub(target.orientation));
            dist = disp.norm() - restLength;

            if (dist === 0) return;

            //if dampingRatio specified, then override strength and damping
            m      = target.mass;
            stiffness *= m;
            damping   *= m;

            force.set(disp.normalize(stiffness * forceFunction(dist, maxLength)));

            if (damping) force.add(target.angularVelocity.mult(-damping)).put(force);

            target.applyTorque(force);
        }
    }

    /**
     * Calculates the potential energy of the rotational spring.
     *
     * @method getEnergy
     * @param [targets] target The physics body attached to the spring
     */
    getEnergy(targets) {
        let options     = this.options;
        let restLength  = options.length;
        let anchor      = options.anchor;
        let strength    = options.stiffness;

        let energy = 0.0;
        for (let i = 0; i < targets.length; i++) {
            let target = targets[i];
            let dist = anchor.sub(target.orientation).norm() - restLength;
            energy += 0.5 * strength * dist * dist;
        }
        return energy;
    }
}
