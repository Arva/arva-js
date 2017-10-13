/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Vector from '../../math/Vector.js';
import Transform from '../../core/Transform.js';
import EventHandler from '../../core/EventHandler.js';
import Integrator from '../integrators/SymplecticEuler.js';


export default class Particle {

    /**
     * A point body that is controlled by the Physics Engine. A particle has
     *   position and velocity states that are updated by the Physics Engine.
     *   Ultimately, a particle is a special type of modifier, and can be added to
     *   the Famo.us Scene Graph like any other modifier.
     *
     * @class Particle
     * @uses EventHandler
     * @extensionfor Body
     *
     * @param [options] {Options}           An object of configurable options.
     * @param [options.position] {Array}    The position of the particle.
     * @param [options.velocity] {Array}    The velocity of the particle.
     * @param [options.mass] {Number}       The mass of the particle.
     */
     constructor(options) {
        options = options || {};
        var defaults = Particle.DEFAULT_OPTIONS;

        // registers
        this.position = new Vector();
        this.velocity = new Vector();
        this.force = new Vector();

        // state variables
        this._engine = null;
        this._isSleeping = true;
        this._eventOutput = null;

        // set scalars
        this.mass = (options.mass !== undefined)
            ? options.mass
            : defaults.mass;

        this.inverseMass = 1 / this.mass;

        // set vectors
        this.setPosition(options.position || defaults.position);
        this.setVelocity(options.velocity || defaults.velocity);
        this.force.set(options.force || [0,0,0]);

        this.transform = Transform.identity.slice();

        // cached _spec
        this._spec = {
            size : [true, true],
            target : {
                transform : this.transform,
                origin : [0.5, 0.5],
                target : null
            }
        };
    }

    static DEFAULT_OPTIONS = {
        position : [0, 0, 0],
        velocity : [0, 0, 0],
        mass : 1
    }

    //Catalogue of outputted events
    static _events = {
        start : 'start',
        update : 'update',
        end : 'end'
    }

    // Cached timing function
    //TODO: this is BS right? being cached and all
    //var now = Date.now;

    /**
     * @attribute isBody
     * @type Boolean
     * @static
     */
    isBody = false;

    /**
     * Determines if particle is active
     *
     * @method isActive
     * @return {Boolean}
     */
    isActive() {
        return !this._isSleeping;
    }

    /**
     * Stops the particle from updating
     *
     * @method sleep
     */
    sleep() {
        if (this._isSleeping) return;
        this.emit(_events.end, this);
        this._isSleeping = true;
    }

    /**
     * Starts the particle update
     *
     * @method wake
     */
    wake() {
        if (!this._isSleeping) return;
        this.emit(_events.start, this);
        this._isSleeping = false;
        this._prevTime = Date.now();
        if (this._engine) this._engine.wake();
    }

    /**
     * Basic setter for position
     *
     * @method setPosition
     * @param position {Array|Vector}
     */
    setPosition(position) {
        this.position.set(position);
    }

    /**
     * 1-dimensional setter for position
     *
     * @method setPosition1D
     * @param x {Number}
     */
    setPosition1D(x) {
        this.position.x = x;
    }

    /**
     * Basic getter function for position
     *
     * @method getPosition
     * @return position {Array}
     */
    getPosition() {
        this._engine.step();
        return this.position.get();
    }

    /**
     * 1-dimensional getter for position
     *
     * @method getPosition1D
     * @return value {Number}
     */
    getPosition1D() {
        this._engine.step();
        return this.position.x;
    }

    /**
     * Basic setter function for velocity Vector
     *
     * @method setVelocity
     * @function
     */
    setVelocity(velocity) {
        this.velocity.set(velocity);
        if (!(velocity[0] === 0 && velocity[1] === 0 && velocity[2] === 0))
            this.wake();
    }

    /**
     * 1-dimensional setter for velocity
     *
     * @method setVelocity1D
     * @param x {Number}
     */
    setVelocity1D(x) {
        this.velocity.x = x;
        if (x !== 0) this.wake();
    }

    /**
     * Basic getter function for velocity Vector
     *
     * @method getVelocity
     * @return velocity {Array}
     */
    getVelocity() {
        return this.velocity.get();
    }

    /**
     * Basic setter function for force Vector
     *
     * @method setForce
     * @return force {Array}
     */
    setForce(force) {
        this.force.set(force);
        this.wake();
    }

    /**
     * 1-dimensional getter for velocity
     *
     * @method getVelocity1D
     * @return velocity {Number}
     */
    getVelocity1D() {
        return this.velocity.x;
    }

    /**
     * Basic setter function for mass quantity
     *
     * @method setMass
     * @param mass {Number} mass
     */
    setMass(mass) {
        this.mass = mass;
        this.inverseMass = 1 / mass;
    }

    /**
     * Basic getter function for mass quantity
     *
     * @method getMass
     * @return mass {Number}
     */
    getMass() {
        return this.mass;
    }

    /**
     * Reset position and velocity
     *
     * @method reset
     * @param position {Array|Vector}
     * @param velocity {Array|Vector}
     */
    reset(position, velocity) {
        this.setPosition(position || [0,0,0]);
        this.setVelocity(velocity || [0,0,0]);
    }

    /**
     * Add force vector to existing internal force Vector
     *
     * @method applyForce
     * @param force {Vector}
     */
    applyForce(force) {
        if (force.isZero()) return;
        this.force.add(force).put(this.force);
        this.wake();
    }

    /**
     * Add impulse (change in velocity) Vector to this Vector's velocity.
     *
     * @method applyImpulse
     * @param impulse {Vector}
     */
    applyImpulse(impulse) {
        if (impulse.isZero()) return;
        var velocity = this.velocity;
        velocity.add(impulse.mult(this.inverseMass)).put(velocity);
    }

    /**
     * Update a particle's velocity from its force accumulator
     *
     * @method integrateVelocity
     * @param dt {Number} Time differential
     */
    integrateVelocity(dt) {
        Integrator.integrateVelocity(this, dt);
    }

    /**
     * Update a particle's position from its velocity
     *
     * @method integratePosition
     * @param dt {Number} Time differential
     */
    integratePosition(dt) {
        Integrator.integratePosition(this, dt);
    }

    /**
     * Update the position and velocity of the particle
     *
     * @method _integrate
     * @protected
     * @param dt {Number} Time differential
     */
    _integrate(dt) {
        this.integrateVelocity(dt);
        this.integratePosition(dt);
    }

    /**
     * Get kinetic energy of the particle.
     *
     * @method getEnergy
     * @function
     */
    getEnergy() {
        return 0.5 * this.mass * this.velocity.normSquared();
    }

    /**
     * Generate transform from the current position state
     *
     * @method getTransform
     * @return Transform {Transform}
     */
    getTransform() {
        this._engine.step();

        var position = this.position;
        var transform = this.transform;

        transform[12] = position.x;
        transform[13] = position.y;
        transform[14] = position.z;
        return transform;
    }

    /**
     * The modify interface of a Modifier
     *
     * @method modify
     * @param target {Spec}
     * @return Spec {Spec}
     */
    modify(target) {
        var _spec = this._spec.target;
        _spec.transform = this.getTransform();
        _spec.target = target;
        return this._spec;
    }

    // private
    _createEventOutput() {
        this._eventOutput = new EventHandler();
        this._eventOutput.bindThis(this);
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    emit(type, data) {
        if (!this._eventOutput) return;
        this._eventOutput.emit(type, data);
    }

    // TODO: this might totally blow because of the ES6 transpiler behaviour
    on() {
        this._createEventOutput();
        return this.on(...arguments);
    }

    // TODO: this might totally blow because of the ES6 transpiler behaviour
    removeListener() {
        this._createEventOutput();
        return this.removeListener(...arguments);
    }

    // TODO: this might totally blow because of the ES6 transpiler behaviour
    pipe() {
        this._createEventOutput();
        return this.pipe(...arguments);
    }

    // TODO: this might totally blow because of the ES6 transpiler behaviour
    unpipe() {
        this._createEventOutput();
        return this.unpipe(...arguments);
    }
}
