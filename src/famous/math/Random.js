/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


export default class Random {

  static RAND = Math.random;

  static _randomFloat(min, max) {
      return min + RAND() * (max - min);
  }

  static _randomInteger(min, max) {
      return min + ((RAND() * (max - min + 1)) >> 0);
  }

  static _range(randomFunction, min, max, dim) {
      min = (min !== undefined) ? min : 0;
      max = (max !== undefined) ? max : 1;
      if (dim !== undefined) {
          let result = [];
          for (let i = 0; i < dim; i++) result.push(randomFunction(min, max));
          return result;
      }
      else return randomFunction(min, max);
  }

  /**
   * Very simple uniform random number generator library wrapping Math.random().
   *
   * @class Random
   * @static
   */
  static Random = {};

  /**
   * Get single random integer between min and max (inclusive), or array
   *   of size dim if specified.
   *
   * @method integer
   *
   * @param {Number} min lower bound, default 0
   * @param {Number} max upper bound, default 1
   * @param {Number} dim (optional) dimension of output array, if specified
   * @return {number | array<number>} random integer, or optionally, an array of random integers
   */
  static integer(min, max, dim) {
      return _range(_randomInteger, min, max, dim);
  }

  /**
   * Get single random float between min and max (inclusive), or array
   *   of size dim if specified
   *
   * @method range
   *
   * @param {Number} min lower bound, default 0
   * @param {Number} max upper bound, default 1
   * @param {Number} [dim] dimension of output array, if specified
   * @return {Number} random float, or optionally an array
   */
  static range(min, max, dim) {
      return _range(_randomFloat, min, max, dim);
  }

  /**
   * Return random number among the set {-1 ,1}
   *
   * @method sign
   *
   * @param {Number} prob probability of returning 1, default 0.5
   * @return {Number} random sign (-1 or 1)
   */
  static sign(prob) {
      return Random.bool(prob) ? 1 : -1;
  }

  /**
   * Return random boolean value, true or false.
   *
   * @method bool
   *
   * @param {Number} prob probability of returning true, default 0.5
   * @return {Boolean} random boolean
   */
  static bool(prob) {
      prob = (prob !== undefined) ? prob : 0.5;
      return RAND() < prob;
  }
}
