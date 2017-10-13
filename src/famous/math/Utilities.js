/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

export default class Utilities {

  /**
   * A few static methods.
   *
   * @class Utilities
   * @static
   */
  static Utilities = {};

  /**
   * Constrain input to range.
   *
   * @method clamp
   * @param {Number} value input
   * @param {Array.Number} range [min, max]
   * @static
   */
  static clamp(value, range) {
      return Math.max(Math.min(value, range[1]), range[0]);
  }

  /**
   * Euclidean length of numerical array.
   *
   * @method length
   * @param {Array.Number} array array of numbers
   * @static
   */
  static length(array) {
      let distanceSquared = 0;
      for (let i = 0; i < array.length; i++) {
          distanceSquared += array[i] * array[i];
      }
      return Math.sqrt(distanceSquared);
  }
}
