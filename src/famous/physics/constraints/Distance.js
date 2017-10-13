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

export default class Distance extends Constraint {

    /**
     *  A constraint that keeps a physics body a given distance away from a given
     *  anchor, or another attached body.
     *
     *
     *  @class Distance
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Array} [options.anchor] The location of the anchor
     *  @param {Number} [options.length] The amount of distance from the anchor the constraint should enforce
     *  @param {Number} [options.minLength] The minimum distance before the constraint is activated. Use this property for a "rope" effect.
     *  @param {Number} [options.period] The spring-like reaction when the constraint is broken.
     *  @param {Number} [options.dampingRatio] The damping-like reaction when the constraint is broken.
     *
     */
    constructor(options) {
      super(...arguments);
      this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);

      //registers
      this.impulse  = new Vector();
      this.normal   = new Vector();
      this.diffP    = new Vector();
      this.diffV    = new Vector();
    }

    static DEFAULT_OPTIONS = {
        anchor : null,
        length : 0,
        minLength : 0,
        period : 0,
        dampingRatio : 0
    }

    /** @const */ var pi = Math.PI;

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        if (options.anchor) {
            if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
            if (options.anchor   instanceof Vector)  this.options.anchor = options.anchor;
            if (options.anchor   instanceof Array)  this.options.anchor = new Vector(options.anchor);
        }
        if (options.length !== undefined) this.options.length = options.length;
        if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
        if (options.period !== undefined) this.options.period = options.period;
        if (options.minLength !== undefined) this.options.minLength = options.minLength;
    }

    /**
     * Set the anchor position
     *
     * @method setOptions
     * @param anchor {Array}
     */
    setAnchor(anchor) {
        if (!this.options.anchor) this.options.anchor = new Vector();
        this.options.anchor.set(anchor);
    }

    /**
     * Adds an impulse to a physics body's velocity due to the constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    applyConstraint(targets, source, dt) {
        var n        = this.normal;
        var diffP    = this.diffP;
        var diffV    = this.diffV;
        var impulse  = this.impulse;
        var options  = this.options;

        var dampingRatio = options.dampingRatio;
        var period       = options.period;
        var minLength    = options.minLength;

        var p2;
        var w2;

        if (source) {
            var v2 = source.velocity;
            p2 = source.position;
            w2 = source.inverseMass;
        }
        else {
            p2 = this.options.anchor;
            w2 = 0;
        }

        var length = this.options.length;

        for (var i = 0; i < targets.length; i++) {
            var body = targets[i];

            var v1 = body.velocity;
            var p1 = body.position;
            var w1 = body.inverseMass;

            diffP.set(p1.sub(p2));
            n.set(diffP.normalize());

            var dist = diffP.norm() - length;

            //rope effect
            if (Math.abs(dist) < minLength) return;

            if (source) diffV.set(v1.sub(v2));
            else diffV.set(v1);

            var effMass = 1 / (w1 + w2);
            var gamma;
            var beta;

            if (period === 0) {
                gamma = 0;
                beta  = 1;
            }
            else {
                var c = 4 * effMass * pi * dampingRatio / period;
                var k = 4 * effMass * pi * pi / (period * period);

                gamma = 1 / (c + dt*k);
                beta  = dt*k / (c + dt*k);
            }

            var antiDrift = beta/dt * dist;
            var lambda    = -(n.dot(diffV) + antiDrift) / (gamma + dt/effMass);

            impulse.set(n.mult(dt*lambda));
            body.applyImpulse(impulse);

            if (source) source.applyImpulse(impulse.mult(-1));
        }
    }
}
