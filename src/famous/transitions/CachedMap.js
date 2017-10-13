/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

export default class CachedMap {
  /**
   * A simple in-memory object cache.  Used as a helper for Views with
   * provider functions.
   * @class CachedMap
   * @constructor
   */
  constructor(mappingFunction) {
      this._map = mappingFunction || null;
      this._cachedOutput = null;
      this._cachedInput = Number.NaN; //never valid as input
  }

  /**
   * Creates a mapping function with a cache.
   * This is the main entry point for this object.
   * @static
   * @method create
   * @param {function} mappingFunction mapping
   * @return {function} memorized mapping function
   */
  create(mappingFunction) {
      var instance = new CachedMap(mappingFunction);
      return instance.get.bind(instance);
  }

  /**
   * Retrieve items from cache or from mapping function.
   *
   * @method get
   * @param {Object} input input key
   */
  get(input) {
      if (input !== this._cachedInput) {
          this._cachedInput = input;
          this._cachedOutput = this._map(input);
      }
      return this._cachedOutput;
  }
}
