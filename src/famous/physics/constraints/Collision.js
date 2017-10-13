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

export default class Collision extends Constraint {

    /**
     *  Allows for two circular bodies to collide and bounce off each other.
     *
     *  @class Collision
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Number} [options.restitution] The energy ratio lost in a collision (0 = stick, 1 = elastic) Range : [0, 1]
     *  @param {Number} [options.drift] Baumgarte stabilization parameter. Makes constraints "loosely" (0) or "tightly" (1) enforced. Range : [0, 1]
     *  @param {Number} [options.slop] Amount of penetration in pixels to ignore before collision event triggers
     *
     */
    constructor(options) {
        super(...arguments);

        this.options = Object.create(Collision.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        //registers
        this.normal   = new Vector();
        this.pDiff    = new Vector();
        this.vDiff    = new Vector();
        this.impulse1 = new Vector();
        this.impulse2 = new Vector();
    }

    static DEFAULT_OPTIONS = {
        restitution : 0.5,
        drift : 0.5,
        slop : 0
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        for (let key in options) this.options[key] = options[key];
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
        if (source === undefined) return;

        let v1 = source.velocity;
        let p1 = source.position;
        let w1 = source.inverseMass;
        let r1 = source.radius;

        let options = this.options;
        let drift = options.drift;
        let slop = -options.slop;
        let restitution = options.restitution;

        let n     = this.normal;
        let pDiff = this.pDiff;
        let vDiff = this.vDiff;
        let impulse1 = this.impulse1;
        let impulse2 = this.impulse2;

        for (let i = 0; i < targets.length; i++) {
            let target = targets[i];

            if (target === source) continue;

            let v2 = target.velocity;
            let p2 = target.position;
            let w2 = target.inverseMass;
            let r2 = target.radius;

            pDiff.set(p2.sub(p1));
            vDiff.set(v2.sub(v1));

            let dist    = pDiff.norm();
            let overlap = dist - (r1 + r2);
            let effMass = 1/(w1 + w2);
            let gamma   = 0;

            if (overlap < 0) {

                n.set(pDiff.normalize());

                if (this._eventOutput) {
                    let collisionData = {
                        target  : target,
                        source  : source,
                        overlap : overlap,
                        normal  : n
                    };

                    this._eventOutput.emit('preCollision', collisionData);
                    this._eventOutput.emit('collision', collisionData);
                }

                let lambda = (overlap <= slop)
                    ? ((1 + restitution) * n.dot(vDiff) + drift/dt * (overlap - slop)) / (gamma + dt/effMass)
                    : ((1 + restitution) * n.dot(vDiff)) / (gamma + dt/effMass);

                n.mult(dt*lambda).put(impulse1);
                impulse1.mult(-1).put(impulse2);

                source.applyImpulse(impulse1);
                target.applyImpulse(impulse2);

                //source.setPosition(p1.add(n.mult(overlap/2)));
                //target.setPosition(p2.sub(n.mult(overlap/2)));

                if (this._eventOutput) this._eventOutput.emit('postCollision', collisionData);

            }
        }
    }
}
