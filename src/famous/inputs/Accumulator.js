/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import EventHandler   from '../core/EventHandler.js';
import Transitionable from '../transitions/Transitionable.js';

export default class Accumulator {
  /**
   * Accumulates differentials of event sources that emit a `delta`
   *  attribute taking a Number or Array of Number types. The accumulated
   *  value is stored in a getter/setter.
   *
   * @class Accumulator
   * @constructor
   * @param value {Number|Array|Transitionable}   Initializing value
   * @param [eventName='update'] {String}         Name of update event
   */
  constructor(value, eventName) {
      if (eventName === undefined) eventName = 'update';

      this._state = (value && value.get && value.set)
          ? value
          : new Transitionable(value || 0);

      this._eventInput = new EventHandler();
      EventHandler.setInputHandler(this, this._eventInput);

      this._eventInput.on(eventName, _handleUpdate.bind(this));
  }

  static _handleUpdate(data) {
      let delta = data.delta;
      let state = this.get();

      if (delta.constructor === state.constructor){
          let newState = (delta instanceof Array)
              ? [state[0] + delta[0], state[1] + delta[1]]
              : state + delta;
          this.set(newState);
      }
  }

  /**
   * Basic getter
   *
   * @method get
   * @return {Number|Array} current value
   */
  get() {
      return this._state.get();
  }

  /**
   * Basic setter
   *
   * @method set
   * @param value {Number|Array} new value
   */
  set(value) {
      this._state.set(value);
  }
}
