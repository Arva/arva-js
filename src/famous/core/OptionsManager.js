/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import EventHandler from './EventHandler.js';


/**
 *  A collection of methods for setting options which can be extended
 *  onto other classes.
 *
 *
 *  **** WARNING ****
 *  You can only pass through objects that will compile into valid JSON.
 *
 *  Valid options:
 *      Strings,
 *      Arrays,
 *      Objects,
 *      Numbers,
 *      Nested Objects,
 *      Nested Arrays.
 *
 *    This excludes:
 *        Document Fragments,
 *        Functions
 * @class OptionsManager
 * @constructor
 * @param {Object} value options dictionary
 */
export default class OptionsManager {

  constructor(value) {
    this._value = value;
    this.eventOutput = null;
  }

  /**
   * Create options manager from source dictionary with arguments overriden by patch dictionary.
   *
   * @static
   * @method OptionsManager.patch
   *
   * @param {Object} source source arguments
   * @param {...Object} data argument additions and overwrites
   * @return {Object} source object
   */
  static patch(source, data) {
      let manager = new OptionsManager(source);
      for (let i = 1; i < arguments.length; i++) manager.patch(arguments[i]);
      return source;
  }

  _createEventOutput() {
      this.eventOutput = new EventHandler();
      this.eventOutput.bindThis(this);
      EventHandler.setOutputHandler(this, this.eventOutput);
  }

  /**
   * Create OptionsManager from source with arguments overriden by patches.
   *   Triggers 'change' event on this object's event handler if the state of
   *   the OptionsManager changes as a result.
   *
   * @method patch
   *
   * @param {...Object} arguments list of patch objects
   * @return {OptionsManager} this
   */
  patch() {
      let myState = this._value;
      for (let i = 0; i < arguments.length; i++) {
          let data = arguments[i];
          for (let k in data) {
              if ((k in myState) && (data[k] && data[k].constructor === Object) && (myState[k] && myState[k].constructor === Object)) {
                  if (!myState.hasOwnProperty(k)) myState[k] = Object.create(myState[k]);
                  this.key(k).patch(data[k]);
                  if (this.eventOutput) this.eventOutput.emit('change', {id: k, value: this.key(k).value()});
              }
              else this.set(k, data[k]);
          }
      }
      return this;
  }

  /**
   * Alias for patch
   *
   * @method setOptions
   *
   */
  setOptions() {
    return this.patch(...arguments);
  }

  /**
   * Return OptionsManager based on sub-object retrieved by key
   *
   * @method key
   *
   * @param {string} identifier key
   * @return {OptionsManager} new options manager with the value
   */
  key(identifier) {
      let result = new OptionsManager(this._value[identifier]);
      if (!(result._value instanceof Object) || result._value instanceof Array) result._value = {};
      return result;
  }

  /**
   * Look up value by key or get the full options hash
   * @method get
   *
   * @param {string} key key
   * @return {Object} associated object or full options hash
   */
  get(key) {
      return key ? this._value[key] : this._value;
  }

  /**
   * Alias for get
   * @method getOptions
   */
  getOptions() {
    return this.get(...arguments);
  }

  /**
   * Set key to value.  Outputs 'change' event if a value is overwritten.
   *
   * @method set
   *
   * @param {string} key key string
   * @param {Object} value value object
   * @return {OptionsManager} new options manager based on the value object
   */
  set(key, value) {
      let originalValue = this.get(key);
      this._value[key] = value;
      if (this.eventOutput && value !== originalValue) this.eventOutput.emit('change', {id: key, value: value});
      return this;
  }

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @method "on"
   *
   * @param {string} type event type key (for example, 'change')
   * @param {function(string, Object)} handler callback
   * @return {EventHandler} this
   */
  on() {
      this._createEventOutput();
      return this.on.apply(this, arguments);
  }

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'change')
   * @param {function} handler function object to remove
   * @return {EventHandler} internal event handler object (for chaining)
   */
  removeListener() {
      this._createEventOutput();
      return this.removeListener.apply(this, arguments);
  }

  /**
   * Add event handler object to set of downstream handlers.
   *
   * @method pipe
   *
   * @param {EventHandler} target event handler target object
   * @return {EventHandler} passed event handler
   */
  pipe() {
      this._createEventOutput();
      return this.pipe.apply(this, arguments);
  }

  /**
   * Remove handler object from set of downstream handlers.
   * Undoes work of "pipe"
   *
   * @method unpipe
   *
   * @param {EventHandler} target target handler object
   * @return {EventHandler} provided target
   */
  unpipe() {
      this._createEventOutput();
      return this.unpipe.apply(this, arguments);
  }
}
