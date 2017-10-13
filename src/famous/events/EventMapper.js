/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import EventHandler from '../core/EventHandler.js';

export default class EventMapper extends EventHandler {

  /**
   * EventMapper routes events to various event destinations
   *  based on custom logic.  The function signature is arbitrary.
   *
   * @class EventMapper
   * @constructor
   *
   * @param {function} mappingFunction function to determine where
   *  events are routed to.
   */
  constructor(mappingFunction) {
      super();
      this._mappingFunction = mappingFunction;
  }

  subscribe = null;
  unsubscribe = null;

  /**
   * Trigger an event, sending to all mapped downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Object} data event data
   * @return {EventHandler} this
   */
  emit(type, data) {
      var target = this._mappingFunction.apply(this, arguments);
      if (target && (target.emit instanceof Function)) target.emit(type, data);
  }

  /**
   * Alias of emit.
   * @method trigger
   */
  trigger(type, data) {
    var target = this._mappingFunction.apply(this, arguments);
    if (target && (target.emit instanceof Function)) target.emit(type, data);
  }
}
