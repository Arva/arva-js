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

export default class EventFilter extends EventHandler {

  /**
   * EventFilter regulates the broadcasting of events based on
   *  a specified condition function of standard event type: function(type, data).
   *
   * @class EventFilter
   * @constructor
   *
   * @param {function} condition function to determine whether or not
   *    events are emitted.
   */
  constructor(condition) {
    super();
    this._condition = condition;
  }

  /**
   * If filter condition is met, trigger an event, sending to all downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Object} data event data
   * @return {EventHandler} this
   */
  emit(type, data) {
      if (this._condition(type, data))
          return super.emit(...arguments);
  }

  /**
   * An alias of emit. Trigger determines whether to send
   *  events based on the return value of it's condition function
   *  when passed the event type and associated data.
   *
   * @method trigger
   * @param {string} type name of the event
   * @param {object} data associated data
   */
  trigger(type, data) {
    if (this._condition(type, data))
        return super.emit(...arguments);// EventHandler.prototype.emit.apply(this, arguments);
  }
}
