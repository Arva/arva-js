/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Constraint from './Constraint.js';
import Vector from '../../math/Vector.js';

export default class Snap extends Constraint {

    /**
     *  A spring constraint is like a spring force, except that it is always
     *    numerically stable (even for low periods), at the expense of introducing
     *    damping (even with dampingRatio set to 0).
     *
     *    Use this if you need fast spring-like behavior, e.g., snapping
     *
     *  @class Snap
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Number} [options.period] The amount of time in milliseconds taken for one complete oscillation when there is no damping. Range : [150, Infinity]
     *  @param {Number} [options.dampingRatio] Additional damping of the spring. Range : [0, 1]. At 0 this spring will still be damped, at 1 the spring will be critically damped (the spring will never oscillate)
     *  @param {Number} [options.length] The rest length of the spring. Range: [0, Infinity].
     *  @param {Array} [options.anchor] The location of the spring's anchor, if not another physics body.
     *
     */
    constructor(options) {
        super(...arguments);

        this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.pDiff  = new Vector();
        this.vDiff  = new Vector();
        this.impulse1 = new Vector();
        this.impulse2 = new Vector();
    }

    static DEFAULT_OPTIONS = {
        period : 300,
        dampingRatio : 0.1,
        length : 0,
        anchor : undefined
    }

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects} options
     */
    setOptions(options) {
        if (options.anchor !== undefined) {
            if (options.anchor   instanceof Vector) this.options.anchor = options.anchor;
            if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
            if (options.anchor   instanceof Array)  this.options.anchor = new Vector(options.anchor);
        }
        if (options.length !== undefined) this.options.length = options.length;
        if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
        if (options.period !== undefined) this.options.period = options.period;
        super.setOptions(options);
    }

    /**
     * Calculates energy of spring
     *
     * @method getEnergy
     * @param targets {Body} target physics body
     * @param source {Body} source physics body
     * @return energy {Number}
     */
    getEnergy(targets, source) {
        let options     = this.options;
        let restLength  = options.length;
        let anchor      = options.anchor || source.position;
        let strength    = Math.pow(2 * Math.PI / options.period, 2);

        let energy = 0.0;
        for (let i = 0; i < targets.length; i++){
            let target = targets[i];
            let dist = anchor.sub(target.position).norm() - restLength;
            energy += 0.5 * strength * dist * dist;
        }
        return energy;
    }

    /**
     * Adds a spring impulse to a physics body's velocity due to the constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    applyConstraint(targets, source, dt) {
        let options      = this.options;
        let pDiff        = this.pDiff;
        let vDiff        = this.vDiff;
        let impulse1     = this.impulse1;
        let impulse2     = this.impulse2;
        let length       = options.length;
        let anchor       = options.anchor || source.position;
        let period       = options.period;
        let dampingRatio = options.dampingRatio;

        for (let i = 0; i < targets.length; i++) {
            let target = targets[i];

            let p1 = target.position;
            let v1 = target.velocity;
            let m1 = target.mass;
            let w1 = target.inverseMass;

            pDiff.set(p1.sub(anchor));
            let dist = pDiff.norm() - length;
            let effMass;

            if (source) {
                let w2 = source.inverseMass;
                let v2 = source.velocity;
                vDiff.set(v1.sub(v2));
                effMass = 1 / (w1 + w2);
            }
            else {
                vDiff.set(v1);
                effMass = m1;
            }

            let gamma;
            let beta;

            if (this.options.period === 0) {
                gamma = 0;
                beta = 1;
            }
            else {
                let k = 4 * effMass * Math.PI * Math.PI / (period * period);
                let c = 4 * effMass * Math.PI * dampingRatio / period;

                beta  = dt * k / (c + dt * k);
                gamma = 1 / (c + dt*k);
            }

            let antiDrift = beta/dt * dist;
            pDiff.normalize(-antiDrift)
                .sub(vDiff)
                .mult(dt / (gamma + dt/effMass))
                .put(impulse1);

            // var n = new Vector();
            // n.set(pDiff.normalize());
            // var lambda = -(n.dot(vDiff) + antiDrift) / (gamma + dt/effMass);
            // impulse2.set(n.mult(dt*lambda));

            target.applyImpulse(impulse1);

            if (source) {
                impulse1.mult(-1).put(impulse2);
                source.applyImpulse(impulse2);
            }
        }
    }
}
