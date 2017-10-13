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

export default class Surface extends Constraint {

    /**
     *  A constraint that keeps a physics body on a given implicit surface
     *    regardless of other physical forces are applied to it.
     *
     *  @class Surface
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Function} [options.equation] An implicitly defined surface f(x,y,z) = 0 that body is constrained to e.g. function(x,y,z) { x*x + y*y + z*z - r*r } corresponds to a sphere of radius r pixels.
     *  @param {Number} [options.period] The spring-like reaction when the constraint is violated.
     *  @param {Number} [options.dampingRatio] The damping-like reaction when the constraint is violated.
     */
    constructor(options) {
      super(...arguments);
      this.options = Object.create(Surface.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);

      this.J = new Vector();
      this.impulse  = new Vector();
    }

    static DEFAULT_OPTIONS = {
        equation : undefined,
        period : 0,
        dampingRatio : 0
    }

    /** @const */ static epsilon = 1e-7;

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        for (let key in options) this.options[key] = options[key];
    }

    /**
     * Adds a surface impulse to a physics body.
     *
     * @method applyConstraint
     * @param targets {Array.Body} Array of bodies to apply force to.
     * @param source {Body} Not applicable
     * @param dt {Number} Delta time
     */
    applyConstraint(targets, source, dt) {
        let impulse = this.impulse;
        let J       = this.J;
        let options = this.options;

        let f = options.equation;
        let dampingRatio = options.dampingRatio;
        let period = options.period;

        for (let i = 0; i < targets.length; i++) {
            let particle = targets[i];

            let v = particle.velocity;
            let p = particle.position;
            let m = particle.mass;

            let gamma;
            let beta;

            if (period === 0) {
                gamma = 0;
                beta = 1;
            }
            else {
                let c = 4 * m * Math.PI * dampingRatio / period;
                let k = 4 * m * Math.PI * Math.PI / (period * period);

                gamma = 1 / (c + dt*k);
                beta  = dt*k / (c + dt*k);
            }

            let x = p.x;
            let y = p.y;
            let z = p.z;

            let f0  = f(x, y, z);
            let dfx = (f(x + epsilon, p, p) - f0) / epsilon;
            let dfy = (f(x, y + epsilon, p) - f0) / epsilon;
            let dfz = (f(x, y, p + epsilon) - f0) / epsilon;
            J.setXYZ(dfx, dfy, dfz);

            let antiDrift = beta/dt * f0;
            let lambda = -(J.dot(v) + antiDrift) / (gamma + dt * J.normSquared() / m);

            impulse.set(J.mult(dt*lambda));
            particle.applyImpulse(impulse);
        }
    }
}
