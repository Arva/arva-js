/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 /**
  * Ordinary Differential Equation (ODE) Integrator.
  * Manages updating a physics body's state over time.
  *
  *  p = position, v = velocity, m = mass, f = force, dt = change in time
  *
  *      v <- v + dt * f / m
  *      p <- p + dt * v
  *
  *  q = orientation, w = angular velocity, L = angular momentum
  *
  *      L <- L + dt * t
  *      q <- q + dt/2 * q * w
  *
  * @class SymplecticEuler
  * @constructor
  * @param {Object} options Options to set
  */
export default class SymplecticEuler {
    /*
     * Updates the velocity of a physics body from its accumulated force.
     *      v <- v + dt * f / m
     *
     * @method integrateVelocity
     * @param {Body} physics body
     * @param {Number} dt delta time
     */
    static integrateVelocity(body, dt) {
        let v = body.velocity;
        let w = body.inverseMass;
        let f = body.force;

        if (f.isZero()) return;

        v.add(f.mult(dt * w)).put(v);
        f.clear();
    }

    /*
     * Updates the position of a physics body from its velocity.
     *      p <- p + dt * v
     *
     * @method integratePosition
     * @param {Body} physics body
     * @param {Number} dt delta time
     */
    static integratePosition(body, dt) {
        let p = body.position;
        let v = body.velocity;

        p.add(v.mult(dt)).put(p);
    }

    /*
     * Updates the angular momentum of a physics body from its accumuled torque.
     *      L <- L + dt * t
     *
     * @method integrateAngularMomentum
     * @param {Body} physics body (except a particle)
     * @param {Number} dt delta time
     */
    static integrateAngularMomentum(body, dt) {
        let L = body.angularMomentum;
        let t = body.torque;

        if (t.isZero()) return;

        L.add(t.mult(dt)).put(L);
        t.clear();
    }

    /*
     * Updates the orientation of a physics body from its angular velocity.
     *      q <- q + dt/2 * q * w
     *
     * @method integrateOrientation
     * @param {Body} physics body (except a particle)
     * @param {Number} dt delta time
     */
    static integrateOrientation(body, dt) {
        let q = body.orientation;
        let w = body.angularVelocity;

        if (w.isZero()) return;
        q.add(q.multiply(w).scalarMultiply(0.5 * dt)).put(q);
//        q.normalize.put(q);
    }
}
