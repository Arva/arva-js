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
import Spring from '../physics/forces/Spring.js';
import Wall from '../physics/constraints/Wall.js';
import Vector from '../math/Vector.js';

export default class WallTransition {

    /**
     * WallTransition is a method of transitioning between two values (numbers,
     *   or arrays of numbers) with a bounce. Unlike a SpringTransition
     *   The transition will not overshoot the target, but bounce back against it.
     *   The behavior of the bounce is specified by the transition options.
     *
     * @class WallTransition
     * @constructor
     *
     * @param {Number|Array} [state=0] Initial state
     */
    constructor(state) {
        state = state || 0;

        this.endState  = new Vector(state);
        this.initState = new Vector();

        this.spring = new Spring({anchor : this.endState});
        this.wall   = new Wall();

        this._restTolerance = 1e-10;
        this._dimensions = 1;
        this._absRestTolerance = this._restTolerance;
        this._callback = undefined;

        this.PE = new PE();
        this.particle = new Particle();

        this.PE.addBody(this.particle);
        this.PE.attach([this.wall, this.spring], this.particle);
    }

    static SUPPORTS_MULTIPLE = 3;

    /**
     * @property WallTransition.DEFAULT_OPTIONS
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
         * @default 300
         */
        period : 300,

        /**
         * The damping of the snap.
         *    Range : [0, 1]
         *    0 = no damping, and the spring will oscillate forever
         *    1 = critically damped (the spring will never oscillate)
         *
         * @attribute dampingRatio
         * @type Number
         * @default 0.5
         */
        dampingRatio : 0.5,

        /**
         * The initial velocity of the transition.
         *
         * @attribute velocity
         * @type Number|Array
         * @default 0
         */
        velocity : 0,

        /**
         * The percentage of momentum transferred to the wall
         *
         * @attribute restitution
         * @type Number
         * @default 0.5
         */
        restitution : 0.5
    };

    _getEnergy() {
        return this.particle.getEnergy() + this.spring.getEnergy([this.particle]);
    }

    _setAbsoluteRestTolerance() {
        var distance = this.endState.sub(this.initState).normSquared();
        this._absRestTolerance = (distance === 0)
            ? this._restTolerance
            : this._restTolerance * distance;
    }

    _wake() {
        this.PE.wake();
    }

    _sleep() {
        this.PE.sleep();
    }

    _setTarget(target) {
        this.endState.set(target);

        var dist = this.endState.sub(this.initState).norm();

        this.wall.setOptions({
            distance : this.endState.norm(),
            normal : (dist === 0)
                ? this.particle.velocity.normalize(-1)
                : this.endState.sub(this.initState).normalize(-1)
        });

        this._setAbsoluteRestTolerance();
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

    _update() {
        if (this.PE.isSleeping()) {
            if (this._callback) {
                var cb = this._callback;
                this._callback = undefined;
                cb();
            }
            return;
        }
        var energy = this._getEnergy();
        if (energy < this._absRestTolerance) {
            this._sleep();
            this._setParticlePosition(this.endState);
            this._setParticleVelocity([0,0,0]);
        }
    }

    _setupDefinition(def) {
        var defaults = WallTransition.DEFAULT_OPTIONS;
        if (def.period === undefined) def.period = defaults.period;
        if (def.dampingRatio === undefined) def.dampingRatio = defaults.dampingRatio;
        if (def.velocity === undefined) def.velocity = defaults.velocity;
        if (def.restitution === undefined) def.restitution = defaults.restitution;
        if (def.drift === undefined) def.drift = Wall.DEFAULT_OPTIONS.drift;
        if (def.slop === undefined) def.slop = Wall.DEFAULT_OPTIONS.slop;

        //setup spring
        this.spring.setOptions({
            period : def.period,
            dampingRatio : def.dampingRatio
        });

        //setup wall
        this.wall.setOptions({
            restitution : def.restitution,
            drift: def.drift,
            slop: def.slop
        });

        //setup particle
        this._setParticleVelocity(def.velocity);
    }

    /**
     * Resets the state and velocity
     *
     * @method reset
     *
     * @param {Number|Array}  state     State
     * @param  {Number|Array} [velocity] Velocity
     */
    reset(state, velocity) {
        this._dimensions = (state instanceof Array)
            ? state.length
            : 0;

        this.initState.set(state);
        this._setParticlePosition(state);
        if (velocity) this._setParticleVelocity(velocity);
        this._setTarget(state);
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
     * Getter
     *
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
