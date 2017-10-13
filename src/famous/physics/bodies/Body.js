/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Particle from './Particle.js';
import Transform from '../../core/Transform.js';
import Vector from '../../math/Vector.js';
import Quaternion from '../../math/Quaternion.js';
import Matrix from '../../math/Matrix.js';
import Integrator from '../integrators/SymplecticEuler.js';
import OptionsManager from '../../core/OptionsManager.js';

export default class Body extends Particle {

    /**
     * A unit controlled by the physics engine which extends the zero-dimensional
     *   Particle to include geometry. In addition to maintaining the state
     *   of a Particle its state includes orientation, angular velocity
     *   and angular momentum and responds to torque forces.
     *
     * @class Body
     * @extends Particle
     * @constructor
     */
    constructor(options) {
      super(...arguments);
      options = options || {};

      this.orientation     = new Quaternion();
      this.angularVelocity = new Vector();
      this.angularMomentum = new Vector();
      this.torque          = new Vector();

      if (options.orientation)     this.orientation.set(options.orientation);
      if (options.angularVelocity) this.angularVelocity.set(options.angularVelocity);
      if (options.angularMomentum) this.angularMomentum.set(options.angularMomentum);
      if (options.torque)          this.torque.set(options.torque);

      this.angularVelocity.w = 0;        //quaternify the angular velocity
      this.setMomentsOfInertia();

      // registers
      this.pWorld = new Vector();        //placeholder for world space position
    }

    static DEFAULT_OPTIONS = OptionsManager.patch(Particle.DEFAULT_OPTIONS, {
        orientation = [0, 0, 0, 1],
        angularVelocity = [0, 0, 0]
    })

    static isBody = true;

    setMass() {
      super.setMass(...arguments);
      this.setMomentsOfInertia();
    }

    /**
     * Setter for moment of inertia, which is necessary to give proper
     *   angular inertia depending on the geometry of the body.
     *
     * @method setMomentsOfInertia
     */
    setMomentsOfInertia() {
        this.inertia = new Matrix();
        this.inverseInertia = new Matrix();
    }

    /**
     * Update the angular velocity from the angular momentum state.
     *
     * @method updateAngularVelocity
     */
    updateAngularVelocity() {
        this.angularVelocity.set(this.inverseInertia.vectorMultiply(this.angularMomentum));
    }

    /**
     * Determine world coordinates from the local coordinate system. Useful
     *   if the Body has rotated in space.
     *
     * @method toWorldCoordinates
     * @param localPosition {Vector} local coordinate vector
     * @return global coordinate vector {Vector}
     */
    toWorldCoordinates(localPosition) {
        return this.pWorld.set(this.orientation.rotateVector(localPosition));
    }

    /**
     * Calculates the kinetic and intertial energy of a body.
     *
     * @method getEnergy
     * @return energy {Number}
     */
    getEnergy() {
        return super.getEnergy()
            + 0.5 * this.inertia.vectorMultiply(this.angularVelocity).dot(this.angularVelocity);
    }

    /**
     * Extends Particle.reset to reset orientation, angular velocity
     *   and angular momentum.
     *
     * @method reset
     * @param [p] {Array|Vector} position
     * @param [v] {Array|Vector} velocity
     * @param [q] {Array|Quaternion} orientation
     * @param [L] {Array|Vector} angular momentum
     */
    reset(p, v, q, L) {
        super.reset(p, v);
        this.angularVelocity.clear();
        this.setOrientation(q || [1,0,0,0]);
        this.setAngularMomentum(L || [0,0,0]);
    }

    /**
     * Setter for orientation
     *
     * @method setOrientation
     * @param q {Array|Quaternion} orientation
     */
    setOrientation(q) {
        this.orientation.set(q);
    }

    /**
     * Setter for angular velocity
     *
     * @method setAngularVelocity
     * @param w {Array|Vector} angular velocity
     */
    setAngularVelocity(w) {
        this.wake();
        this.angularVelocity.set(w);
    }

    /**
     * Setter for angular momentum
     *
     * @method setAngularMomentum
     * @param L {Array|Vector} angular momentum
     */
    setAngularMomentum(L) {
        this.wake();
        this.angularMomentum.set(L);
    }

    /**
     * Extends Particle.applyForce with an optional argument
     *   to apply the force at an off-centered location, resulting in a torque.
     *
     * @method applyForce
     * @param force {Vector} force
     * @param [location] {Vector} off-center location on the body
     */
    applyForce(force, location) {
        super.applyForce(force);
        if (location !== undefined) this.applyTorque(location.cross(force));
    }

    /**
     * Applied a torque force to a body, inducing a rotation.
     *
     * @method applyTorque
     * @param torque {Vector} torque
     */
    applyTorque(torque) {
        this.wake();
        this.torque.set(this.torque.add(torque));
    }

    /**
     * Extends Particle.getTransform to include a rotational component
     *   derived from the particle's orientation.
     *
     * @method getTransform
     * @return transform {Transform}
     */
    getTransform() {
        return Transform.thenMove(
            this.orientation.getTransform(),
            Transform.getTranslate(super.getTransform())
        );
    }

    /**
     * Extends Particle._integrate to also update the rotational states
     *   of the body.
     *
     * @method getTransform
     * @protected
     * @param dt {Number} delta time
     */
    _integrate(dt) {
        super._integrate(dt);
        this.integrateAngularMomentum(dt);
        this.updateAngularVelocity(dt);
        this.integrateOrientation(dt);
    }

    /**
     * Updates the angular momentum via the its integrator.
     *
     * @method integrateAngularMomentum
     * @param dt {Number} delta time
     */
    integrateAngularMomentum(dt) {
        Integrator.integrateAngularMomentum(this, dt);
    }

    /**
     * Updates the orientation via the its integrator.
     *
     * @method integrateOrientation
     * @param dt {Number} delta time
     */
    integrateOrientation(dt) {
        Integrator.integrateOrientation(this, dt);
    }
}
