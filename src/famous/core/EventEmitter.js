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
  * EventEmitter represents a channel for events.
  *
  * @class EventEmitter
  * @constructor
  */
export default class EventEmitter {

  constructor() {
    this.listeners = {};
    this._owner = this;
  }

  /**
   * Trigger an event, sending to all downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Objects} event event data
   * @param {Objects}(opt) event event data
   * @param {Objects}(opt) event event data
   * @param {Objects}(opt) event event data
   * @return {EventHandler} this
   */
   emit() {
    let type = arguments[0];
    let args = [];
    for (let i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
    let handlers = this.listeners[type];
    let suppressedHandlers = this.determineSurpressedTouchMoveEvents(type, handlers, args[0]);
    if (handlers) {
      for (let i = 0; i < handlers.length; i++) {
        if (!suppressedHandlers[i]) {
          handlers[i].apply(this._owner, args);
        }
      }
    }
    return this;
  }


  determineSurpressedTouchMoveEvents(eventType, handlers, event) {
    /* If the number of touches is more than 2, then we should not surpress any events */
    let numberOfHandlers = handlers ? handlers.length : 0;
    if (numberOfHandlers < 2 || !(event instanceof window.TouchEvent) || event.touches.length > 1 || !['touchstart', 'touchmove', 'touchend'].includes(eventType)) {
      return new Array(numberOfHandlers).fill(false);
    }

    /* Plural of axis is axes */
    let axes = handlers.map((handler) => handler._handlerOptions ? handler._handlerOptions.axis : undefined);
    let firstAxis = axes[0];
    /* If all the axes are the same */
    if (axes.every((axis) => axis === firstAxis || axis === undefined)) {
      return new Array(numberOfHandlers).fill(false);
    }
    let touch = event.touches[0];

    if (eventType === 'touchstart') {
      this._currentTouchMoveStartPosition = [touch.clientX, touch.clientY];
    }

    if (eventType === 'touchend') {
      this._currentTouchMoveDirection = undefined;
    }

    if(eventType !== 'touchmove'){
      return new Array(numberOfHandlers).fill(false);
    }


    /* event type is touchmove. Analyze the touches and see if some events need to be surpressed */

    let startPosition = this._currentTouchMoveStartPosition, currentMoveDirection = this._currentTouchMoveDirection;

    if (!startPosition && currentMoveDirection === undefined) {
      /* No information about start position, we can't ignore this one */
      return new Array(numberOfHandlers).fill(false);
    }
    if (currentMoveDirection === undefined) {
      let xDiff = startPosition[0] - touch.clientX, yDiff = startPosition[1] - touch.clientY;
      let absDiffs = [Math.abs(xDiff), Math.abs(yDiff)];
      this._currentTouchMoveDirection = currentMoveDirection = absDiffs.indexOf(Math.max.apply(null, absDiffs));
    }

    let surpressArray = new Array(numberOfHandlers);

    for (let i = 0; i < numberOfHandlers; i++) {
      surpressArray[i] = axes[i] !== undefined && axes[i] !== currentMoveDirection;
    }

    return surpressArray;
  }

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @method "on"
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function(string, Object)} handler callback
   * @param [options]
   * @return {EventHandler} this
   */
  on(type, handler, options) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    /* Adds the options to the handler itself, in order to be able to pass to the DOMEventHandler.js */
    options && (handler._handlerOptions = options);
    let index = this.listeners[type].indexOf(handler);
    if (index < 0) this.listeners[type].push(handler);
    return this;
  }

  /**
   * Listens once
   * @param type
   * @param handler
   * @param {Object} options
   * @param {Boolean} options.propagate Whether we should listen for bubbled events
   * @returns {Mocked Promise}
   */
  once(type, handler, options) {
    let resolvers = [], resolveValue, isResolved = false;
    let promise = {
      then: function (resolveFunction) {
        if (isResolved) {
          resolveFunction(resolveValue)
        } else {
          resolvers.push(resolveFunction);
        }
      }
    };
    this.on(type, function onceWrapper() {
      this.removeListener(type, onceWrapper);
      handler && handler.apply(this._owner, arguments);
      resolveValue = arguments[0];
      isResolved = true;
      for (let i = 0; i < resolvers.length; i++) {
        resolvers[i](resolveValue);
      }
    }, options);

    return promise;
  }

  /**
   * Alias for "on".
   * @method addListener
   */
  addListener() {
    this.on(...arguments);
  }

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function} handler function object to remove
   * @return {EventEmitter} this
   */
  removeListener(type, handler) {
    let listener = this.listeners[type];
    if (listener !== undefined) {
      let index = listener.indexOf(handler);
      if (index >= 0) listener.splice(index, 1);
    }
    return this;
  }

  replaceListeners(type, handler) {
    this.listeners[type] = [];
    return this.on(type, handler);
  }

  /**
   * Call event handlers with this set to owner.
   *
   * @method bindThis
   *
   * @param {Object} owner object this EventEmitter belongs to
   */
  bindThis(owner) {
    this._owner = owner;
  }
}
