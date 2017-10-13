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

export default class Curve extends Constraint {

    /**
     *  A constraint that keeps a physics body on a given implicit curve
     *    regardless of other physical forces are applied to it.
     *
     *    A curve constraint is two surface constraints in disguise, as a curve is
     *    the intersection of two surfaces, and is essentially constrained to both
     *
     *  @class Curve
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Function} [options.equation] An implicitly defined surface f(x,y,z) = 0 that body is constrained to e.g. function(x,y,z) { x*x + y*y - r*r } corresponds to a circle of radius r pixels
     *  @param {Function} [options.plane] An implicitly defined second surface that the body is constrained to
     *  @param {Number} [options.period] The spring-like reaction when the constraint is violated
     *  @param {Number} [options.number] The damping-like reaction when the constraint is violated
     */
    constructor(options) {
      super();
      this.options = Object.create(Curve.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);

      //registers
      this.J = new Vector();
      this.impulse = new Vector();
    }

    /** @const */ static epsilon = 1e-7;

    static DEFAULT_OPTIONS = {
        equation  : function(x,y,z) {
            return 0;
        },
        plane : function(x,y,z) {
            return z;
        },
        period : 0,
        dampingRatio : 0
    }

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
     * Adds a curve impulse to a physics body.
     *
     * @method applyConstraint
     * @param targets {Array.Body} Array of bodies to apply force to.
     * @param source {Body} Not applicable
     * @param dt {Number} Delta time
     */
    applyConstraint(targets, source, dt) {
        let options = this.options;
        let impulse = this.impulse;
        let J = this.J;

        let f = options.equation;
        let g = options.plane;
        let dampingRatio = options.dampingRatio;
        let period = options.period;

        for (let i = 0; i < targets.length; i++) {
            let body = targets[i];

            let v = body.velocity;
            let p = body.position;
            let m = body.mass;

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
            let dfx = (f(x + epsilon, y, z) - f0) / epsilon;
            let dfy = (f(x, y + epsilon, z) - f0) / epsilon;
            let dfz = (f(x, y, z + epsilon) - f0) / epsilon;

            let g0  = g(x, y, z);
            let dgx = (g(x + epsilon, y, z) - g0) / epsilon;
            let dgy = (g(x, y + epsilon, z) - g0) / epsilon;
            let dgz = (g(x, y, z + epsilon) - g0) / epsilon;

            J.setXYZ(dfx + dgx, dfy + dgy, dfz + dgz);

            let antiDrift = beta/dt * (f0 + g0);
            let lambda = -(J.dot(v) + antiDrift) / (gamma + dt * J.normSquared() / m);

            impulse.set(J.mult(dt*lambda));
            body.applyImpulse(impulse);
        }
    }
}
