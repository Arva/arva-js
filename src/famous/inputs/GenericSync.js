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

export default class GenericSync {
  /**
   * Combines multiple types of sync classes (e.g. mouse, touch,
   *  scrolling) into one standardized interface for inclusion in widgets.
   *
   *  Sync classes are first registered with a key, and then can be accessed
   *  globally by key.
   *
   *  Emits 'start', 'update' and 'end' events as a union of the sync class
   *  providers.
   *
   * @class GenericSync
   * @constructor
   * @param syncs {Object|Array} object with fields {sync key : sync options}
   *    or an array of registered sync keys
   * @param [options] {Object|Array} options object to set on all syncs
   */
  constructor(syncs, options) {
      this._eventInput = new EventHandler();
      this._eventOutput = new EventHandler();

      EventHandler.setInputHandler(this, this._eventInput);
      EventHandler.setOutputHandler(this, this._eventOutput);

      this._syncs = {};
      this.options = options;
      if (syncs) this.addSync(syncs);
      if (options) this.setOptions(options);
  }

  static DIRECTION_X = 0;
  static DIRECTION_Y = 1;
  static DIRECTION_Z = 2;

  // Global registry of sync classes. Append only.
  static registry = {};

  /**
   * Register a global sync class with an identifying key
   *
   * @static
   * @method register
   *
   * @param syncObject {Object} an object of {sync key : sync options} fields
   */
  static register(syncObject) {
      for (let key in syncObject){
          if (registry[key]){ // skip redundant registration
              if (registry[key] !== syncObject[key]) // only if same registered class
                  throw new Error('Conflicting sync classes for key: ' + key);
          }
          else registry[key] = syncObject[key];
      }
  }

  /**
   * Helper to set options on all sync instances
   *
   * @method setOptions
   * @param options {Object} options object
   */
  setOptions(options) {
      for (let key in this._syncs){
          this._syncs[key].setOptions(options);
      }
  }

  /**
   * Pipe events to a sync class
   *
   * @method pipeSync
   * @param key {String} identifier for sync class
   */
  pipeSync(key, options) {
      let sync = this._syncs[key];
      this._eventInput.pipe(sync, options);
      sync.pipe(this._eventOutput);
  }

  /**
   * Unpipe events from a sync class
   *
   * @method unpipeSync
   * @param key {String} identifier for sync class
   */
  unpipeSync(key) {
      let sync = this._syncs[key];
      this._eventInput.unpipe(sync);
      sync.unpipe(this._eventOutput);
  }

  _addSingleSync(key, options) {
      if (!registry[key]) return;
      let optionsToPassOn = options || this.options;
      this._syncs[key] = new (registry[key])(optionsToPassOn);
      this.pipeSync(key, optionsToPassOn);
  }

  /**
   * Add a sync class to from the registered classes
   *
   * @method addSync
   * @param syncs {Object|Array.String} an array of registered sync keys
   *    or an object with fields {sync key : sync options}
   */
  addSync(syncs) {
      if (syncs instanceof Array)
          for (let i = 0; i < syncs.length; i++)
              this._addSingleSync(syncs[i]);
      else if (syncs instanceof Object)
          for (let key in syncs)
              this._addSingleSync(key, syncs[key]);
  }
}
