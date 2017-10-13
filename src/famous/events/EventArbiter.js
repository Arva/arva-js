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

export default class EventArbiter {
  /**
   * A switch which wraps several event destinations and
   *  redirects received events to at most one of them.
   *  Setting the 'mode' of the object dictates which one
   *  of these destinations will receive events.
   *
   * @class EventArbiter
   * @constructor
   *
   * @param {Number | string} startMode initial setting of switch,
   */
  constructor(startMode) {
      this.dispatchers = {};
      this.currMode = undefined;
      this.setMode(startMode);
  }

  /**
   * Set switch to this mode, passing events to the corresponding
   *   EventHandler.  If mode has changed, emits 'change' event,
   *   emits 'unpipe' event to the old mode's handler, and emits 'pipe'
   *   event to the new mode's handler.
   *
   * @method setMode
   *
   * @param {string | number} mode indicating which event handler to send to.
   */
  setMode(mode) {
      if (mode !== this.currMode) {
          let startMode = this.currMode;

          if (this.dispatchers[this.currMode]) this.dispatchers[this.currMode].trigger('unpipe');
          this.currMode = mode;
          if (this.dispatchers[mode]) this.dispatchers[mode].emit('pipe');
          this.emit('change', {from: startMode, to: mode});
      }
  }

  /**
   * Return the existing EventHandler corresponding to this
   *   mode, creating one if it doesn't exist.
   *
   * @method forMode
   *
   * @param {string | number} mode mode to which this eventHandler corresponds
   *
   * @return {EventHandler} eventHandler corresponding to this mode
   */
  forMode(mode) {
      if (!this.dispatchers[mode]) this.dispatchers[mode] = new EventHandler();
      return this.dispatchers[mode];
  }

  /**
   * Trigger an event, sending to currently selected handler, if
   *   it is listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} eventType event type key (for example, 'click')
   * @param {Object} event event data
   * @return {EventHandler} this
   */
  emit(eventType, event) {
      if (this.currMode === undefined) return false;
      if (!event) event = {};
      var dispatcher = this.dispatchers[this.currMode];
      if (dispatcher) return dispatcher.trigger(eventType, event);
  }
}
