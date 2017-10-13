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

export default class Wall extends Constraint {

    /**
     *  A wall describes an infinite two-dimensional plane that physics bodies
     *    can collide with. To define a wall, you must give it a distance (from
     *    the center of the physics engine's origin, and a normal defining the plane
     *    of the wall.
     *
     *    (wall)
     *      |
     *      | (normal)     (origin)
     *      | --->            *
     *      |
     *      |    (distance)
     *      ...................
     *            (100px)
     *
     *      e.g., Wall({normal : [1,0,0], distance : 100})
     *      would be a wall 100 pixels to the left, whose normal points right
     *
     *  @class Wall
     *  @constructor
     *  @extends Constraint
     *  @param {Options} [options] An object of configurable options.
     *  @param {Number} [options.restitution] The energy ratio lost in a collision (0 = stick, 1 = elastic). Range : [0, 1]
     *  @param {Number} [options.drift] Baumgarte stabilization parameter. Makes constraints "loosely" (0) or "tightly" (1) enforced. Range : [0, 1]
     *  @param {Number} [options.slop] Amount of penetration in pixels to ignore before collision event triggers.
     *  @param {Array} [options.normal] The normal direction to the wall.
     *  @param {Number} [options.distance] The distance from the origin that the wall is placed.
     *  @param {onContact} [options.onContact] How to handle collision against the wall.
     *
     */
    constructor(options) {
      super(...arguments);
      this.options = Object.create(Wall.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);

      //registers
      this.diff = new Vector();
      this.impulse = new Vector();
    }

    /**
     * @property Wall.ON_CONTACT
     * @type Object
     * @protected
     * @static
     */
    static ON_CONTACT = {

        /**
         * Physical bodies bounce off the wall
         * @attribute REFLECT
         */
        REFLECT : 0,

        /**
         * Physical bodies are unaffected. Usecase is to fire events on contact.
         * @attribute SILENT
         */
        SILENT : 1
    }

    static DEFAULT_OPTIONS = {
        restitution : 0.5,
        drift : 0.5,
        slop : 0,
        normal : [1, 0, 0],
        distance : 0,
        onContact : Wall.ON_CONTACT.REFLECT
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        if (options.normal !== undefined) {
            if (options.normal instanceof Vector) this.options.normal = options.normal.clone();
            if (options.normal instanceof Array)  this.options.normal = new Vector(options.normal);
        }
        if (options.restitution !== undefined) this.options.restitution = options.restitution;
        if (options.drift !== undefined) this.options.drift = options.drift;
        if (options.slop !== undefined) this.options.slop = options.slop;
        if (options.distance !== undefined) this.options.distance = options.distance;
        if (options.onContact !== undefined) this.options.onContact = options.onContact;
    }

    _getNormalVelocity(n, v) {
        return v.dot(n);
    }

    _getDistanceFromOrigin(p) {
        let n = this.options.normal;
        let d = this.options.distance;
        return p.dot(n) + d;
    }

    _onEnter(particle, overlap, dt) {
        let p = particle.position;
        let v = particle.velocity;
        let m = particle.mass;
        let n = this.options.normal;
        let action = this.options.onContact;
        let restitution = this.options.restitution;
        let impulse = this.impulse;

        let drift = this.options.drift;
        let slop = -this.options.slop;
        let gamma = 0;

        if (this._eventOutput) {
            let data = {particle : particle, wall : this, overlap : overlap, normal : n};
            this._eventOutput.emit('preCollision', data);
            this._eventOutput.emit('collision', data);
        }

        switch (action) {
            case Wall.ON_CONTACT.REFLECT:
                let lambda = (overlap < slop)
                    ? -((1 + restitution) * n.dot(v) + drift / dt * (overlap - slop)) / (m * dt + gamma)
                    : -((1 + restitution) * n.dot(v)) / (m * dt + gamma);

                impulse.set(n.mult(dt * lambda));
                particle.applyImpulse(impulse);
                particle.setPosition(p.add(n.mult(-overlap)));
                break;
        }

        if (this._eventOutput) this._eventOutput.emit('postCollision', data);
    }

    _onExit(particle, overlap, dt) {
        let action = this.options.onContact;
        let p = particle.position;
        let n = this.options.normal;

        if (action === Wall.ON_CONTACT.REFLECT) {
            particle.setPosition(p.add(n.mult(-overlap)));
        }
    }

    /**
     * Adds an impulse to a physics body's velocity due to the wall constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    applyConstraint(targets, source, dt) {
        let n = this.options.normal;

        for (let i = 0; i < targets.length; i++) {
            let particle = targets[i];
            let p = particle.position;
            let v = particle.velocity;
            let r = particle.radius || 0;

            let overlap = this._getDistanceFromOrigin(p.add(n.mult(-r)));
            let nv = this._getNormalVelocity(n, v);

            if (overlap <= 0) {
                if (nv < 0) this._onEnter(particle, overlap, dt);
                else this._onExit(particle, overlap, dt);
            }
        }
    }
}
