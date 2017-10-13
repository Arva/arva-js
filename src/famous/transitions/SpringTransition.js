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

export default class SpringTransition {

  /**
   * SpringTransition is a method of transitioning between two values (numbers,
   * or arrays of numbers) with a bounce. The transition will overshoot the target
   * state depending on the parameters of the transition.
   *
   * @class SpringTransition
   * @constructor
   *
   * @param {Number|Array} [state=0] Initial state
   */
  constructor(state) {
      state = state || 0;
      this.endState  = new Vector(state);
      this.initState = new Vector();

      this._dimensions       = undefined;
      this._restTolerance    = 1e-10;
      this._absRestTolerance = this._restTolerance;
      this._callback         = undefined;

      this.PE       = new PE();
      this.spring   = new Spring({anchor : this.endState});
      this.particle = new Particle();

      this.PE.addBody(this.particle);
      this.PE.attach(this.spring, this.particle);
  }

  static SUPPORTS_MULTIPLE = 3;

  /**
   * @property SpringTransition.DEFAULT_OPTIONS
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
      velocity : 0
  }

  _getEnergy() {
      return this.particle.getEnergy() + this.spring.getEnergy([this.particle]);
  }

  _setParticlePosition(p) {
      this.particle.setPosition(p);
  }

  _setParticleVelocity(v) {
      this.particle.setVelocity(v);
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

  _wake() {
      this.PE.wake();
  }

  _sleep() {
      this.PE.sleep();
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

      if (this._getEnergy() < this._absRestTolerance) {
          this._setParticlePosition(this.endState);
          this._setParticleVelocity([0,0,0]);
          this._sleep();
      }
  }

  _setupDefinition(definition) {
      // TODO fix no-console error
      /* eslint no-console: 0 */
      var defaults = SpringTransition.DEFAULT_OPTIONS;
      if (definition.period === undefined)       definition.period       = defaults.period;
      if (definition.dampingRatio === undefined) definition.dampingRatio = defaults.dampingRatio;
      if (definition.velocity === undefined)     definition.velocity     = defaults.velocity;

      if (definition.period < 150) {
          definition.period = 150;
          console.warn('The period of a SpringTransition is capped at 150 ms. Use a SnapTransition for faster transitions');
      }

      //setup spring
      this.spring.setOptions({
          period       : definition.period,
          dampingRatio : definition.dampingRatio
      });

      //setup particle
      this._setParticleVelocity(definition.velocity);
  }

  function _setAbsoluteRestTolerance() {
      var distance = this.endState.sub(this.initState).normSquared();
      this._absRestTolerance = (distance === 0)
          ? this._restTolerance
          : this._restTolerance * distance;
  }

  function _setTarget(target) {
      this.endState.set(target);
      this._setAbsoluteRestTolerance();
  }

  /**
   * Resets the position and velocity
   *
   * @method reset
   *
   * @param {Number|Array.Number} pos positional state
   * @param {Number|Array} vel velocity
   */
  reset(pos, vel) {
      this._dimensions = (pos instanceof Array)
          ? pos.length
          : 0;

      this.initState.set(pos);
      this._setParticlePosition(pos);
      this._setTarget(pos);
      if (vel) this._setParticleVelocity(vel);
      this._setCallback(undefined);
  }

  /**
   * Getter for velocity
   *
   * @method getVelocity
   *
   * @return {Number|Array} velocity
   */
  getVelocity() {
      return this._getParticleVelocity();
  }

  /**
   * Setter for velocity
   *
   * @method setVelocity
   *
   * @return {Number|Array} velocity
   */
  setVelocity(v) {
      this._setParticleVelocity(v);
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
   *
   * @method get
   *
   * @return {Number|Array} state
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
   * @param  {Number|Array} endState Final state
   * @param {Object}  definition  Transition definition
   * @param  {Function} callback Callback
   */
  set(endState, definition, callback) {
      if (!definition) {
          this.reset(endState);
          if (callback) callback();
          return;
      }

      this._dimensions = (endState instanceof Array)
          ? endState.length
          : 0;

      this._wake();
      this._setupDefinition(definition);
      this._setTarget(endState);
      this._setCallback(callback);
  }
}
