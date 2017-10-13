/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import PE from '../physics/PhysicsEngine.js';
import Particle from '../physics/bodies/Particle.js';
import Spring from '../physics/constraints/Snap.js';
import Vector from '../math/Vector.js';

export default class SnapTransition {

    /**
     * SnapTransition is a method of transitioning between two values (numbers,
     * or arrays of numbers). It is similar to SpringTransition except
     * the transition can be much faster and always has a damping effect.
     *
     * @class SnapTransition
     * @constructor
     *
     * @param [state=0] {Number|Array} Initial state
     */
    constructor(state) {
        state = state || 0;

        this.endState  = new Vector(state);
        this.initState = new Vector();

        this._dimensions       = 1;
        this._restTolerance    = 1e-10;
        this._absRestTolerance = this._restTolerance;
        this._callback         = undefined;

        this.PE       = new PE();
        this.particle = new Particle();
        this.spring   = new Spring({anchor : this.endState});

        this.PE.addBody(this.particle);
        this.PE.attach(this.spring, this.particle);
    }

    static SUPPORTS_MULTIPLE = 3;

    /**
     * @property SnapTransition.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    static DEFAULT_OPTIONS = {

        /**
         * The amount of time in milliseconds taken for one complete oscillation
         * when there is no damping
         *    Range : [0, Infinity]
         *
         * @attribute period
         * @type Number
         * @default 100
         */
        period : 100,

        /**
         * The damping of the snap.
         *    Range : [0, 1]
         *
         * @attribute dampingRatio
         * @type Number
         * @default 0.2
         */
        dampingRatio : 0.2,

        /**
         * The initial velocity of the transition.
         *
         * @attribute velocity
         * @type Number|Array
         * @default 0
         */
        velocity : 0
    }

    _getEnergy() {
        return this.particle.getEnergy() + this.spring.getEnergy([this.particle]);
    }

    _setAbsoluteRestTolerance() {
        let distance = this.endState.sub(this.initState).normSquared();
        this._absRestTolerance = (distance === 0)
            ? this._restTolerance
            : this._restTolerance * distance;
    }

    _setTarget(target) {
        this.endState.set(target);
        this._setAbsoluteRestTolerance();
    }

    _wake() {
        this.PE.wake();
    }

    _sleep() {
        this.PE.sleep();
    }

    _setParticlePosition(p) {
        this.particle.position.set(p);
    }

    _setParticleVelocity(v) {
        this.particle.velocity.set(v);
    }

    _getParticlePosition() {
        return (this._dimensions === 0)
            ? this.particle.getPosition1D()
            : this.particle.getPosition();
    }

    _getParticleVelocity() {
        return (this._dimensions === 0)
            ? this.particle.getVelocity1D()
            : this.particle.getVelocity();
    }

    _setCallback(callback) {
        this._callback = callback;
    }

    _setupDefinition(definition) {
        let defaults = SnapTransition.DEFAULT_OPTIONS;
        if (definition.period === undefined)       definition.period       = defaults.period;
        if (definition.dampingRatio === undefined) definition.dampingRatio = defaults.dampingRatio;
        if (definition.velocity === undefined)     definition.velocity     = defaults.velocity;

        //setup spring
        this.spring.setOptions({
            period       : definition.period,
            dampingRatio : definition.dampingRatio
        });

        //setup particle
        this._setParticleVelocity(definition.velocity);
    }

    _update() {
        if (this.PE.isSleeping()) {
            if (this._callback) {
                let cb = this._callback;
                this._callback = undefined;
                cb();
            }
            return;
        }

        if (this._getEnergy() < this._absRestTolerance) {
            this._setParticlePosition(this.endState);
            this._setParticleVelocity([0,0,0]);
            this._sleep();
        }
    }

    /**
     * Resets the state and velocity
     *
     * @method reset
     *
     * @param state {Number|Array}      State
     * @param [velocity] {Number|Array} Velocity
     */
    reset(state, velocity) {
        this._dimensions = (state instanceof Array)
            ? state.length
            : 0;

        this.initState.set(state);
        this._setParticlePosition(state);
        this._setTarget(state);
        if (velocity) this._setParticleVelocity(velocity);
        this._setCallback(undefined);
    }

    /**
     * Getter for velocity
     *
     * @method getVelocity
     *
     * @return velocity {Number|Array}
     */
    getVelocity() {
        return this._getParticleVelocity();
    }

    /**
     * Setter for velocity
     *
     * @method setVelocity
     *
     * @return velocity {Number|Array}
     */
    setVelocity(velocity) {
        this._setParticleVelocity(velocity);
    }

    /**
     * Detects whether a transition is in progress
     *
     * @method isActive
     *
     * @return {Boolean}
     */
    isActive() {
        return !this.PE.isSleeping();
    }

    /**
     * Halt the transition
     *
     * @method halt
     */
    halt() {
        this.set(this.get());
    }

    /**
     * Get the current position of the transition
s     *
     * @method get
     *
     * @return state {Number|Array}
     */
    get() {
        this._update();
        return this._getParticlePosition();
    }

    /**
     * Set the end position and transition, with optional callback on completion.
     *
     * @method set
     *
     * @param state {Number|Array}      Final state
     * @param [definition] {Object}     Transition definition
     * @param [callback] {Function}     Callback
     */
    set(state, definition, callback) {
        if (!definition) {
            this.reset(state);
            if (callback) callback();
            return;
        }

        this._dimensions = (state instanceof Array)
            ? state.length
            : 0;

        this._wake();
        this._setupDefinition(definition);
        this._setTarget(state);
        this._setCallback(callback);
    }
}
