/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


// TODO fix func-style
/*eslint func-style: [0, "declaration"] */

import FamousEngine from '../core/Engine.js';


export default class Timer {

  static _event  = 'prerender';

  /**
   * Wraps a function to be invoked after a certain amount of time.
   *  After a set duration has passed, it executes the function and
   *  removes it as a listener to 'prerender'.
   *
   * @method setTimeout
   *
   * @param {function} fn function to be run after a specified duration
   * @param {number} duration milliseconds from now to execute the function
   *
   * @return {function} function passed in as parameter
   */
  static setTimeout(fn, duration) {
      var t = FamousEngine.now();
      var callback = function() {
          var t2 = FamousEngine.now();
          if (t2 - t >= duration) {
              fn.apply(this, arguments);
              FamousEngine.removeListener(_event, callback);
          }
      };
      return _addTimerFunction(callback);
  }

  /**
   * Add a function to be run on every prerender
   *
   * @method _addTimerFunction
   *
   * @param {function} fn function to be run every prerender
   *
   * @return {function} function passed in as parameter
   */
  _addTimerFunction(fn) {
      FamousEngine.on(_event, fn);
      return fn;
  }



  /**
   * Wraps a function to be invoked after a certain amount of time.
   *  After a set duration has passed, it executes the function and
   *  resets the execution time.
   *
   * @method setInterval
   *
   * @param {function} fn function to be run after a specified duration
   * @param {number} duration interval to execute function in milliseconds
   *
   * @return {function} function passed in as parameter
   */
  static setInterval(fn, duration) {
      var t = FamousEngine.now();
      var callback = function() {
          var t2 = FamousEngine.now();
          if (t2 - t >= duration) {
              fn.apply(this, arguments);
              t = FamousEngine.now();
          }
      };
      return _addTimerFunction(callback);
  }

  /**
   * Wraps a function to be invoked after a certain amount of prerender ticks.
   *  Similar use to setTimeout but tied to the engine's run speed.
   *
   * @method after
   *
   * @param {function} fn function to be run after a specified amount of ticks
   * @param {number} numTicks number of prerender frames to wait
   *
   * @return {function} function passed in as parameter
   */
  static after(fn, numTicks) {
      if (numTicks === undefined) return undefined;
      var callback = function() {
          numTicks--;
          if (numTicks <= 0) { //in case numTicks is fraction or negative
              fn.apply(this, arguments);
              clear(callback);
          }
      };
      return _addTimerFunction(callback);
  }

  /**
   * Wraps a function to be continually invoked after a certain amount of prerender ticks.
   *  Similar use to setInterval but tied to the engine's run speed.
   *
   * @method every
   *
   * @param {function} fn function to be run after a specified amount of ticks
   * @param {number} numTicks number of prerender frames to wait
   *
   * @return {function} function passed in as parameter
   */
  static every(fn, numTicks) {
      numTicks = numTicks || 1;
      var initial = numTicks;
      var callback = function() {
          numTicks--;
          if (numTicks <= 0) { //in case numTicks is fraction or negative
              fn.apply(this, arguments);
              numTicks = initial;
          }
      };
      return _addTimerFunction(callback);
  }

  /**
   * Remove a function that gets called every prerender
   *
   * @method clear
   *
   * @param {function} fn event linstener
   */
  static clear(fn) {
      FamousEngine.removeListener(_event, fn);
  }

  /**
   * Executes a function after a certain amount of time. Makes sure
   *  the function is not run multiple times.
   *
   * @method debounce
   *
   * @param {function} func function to run after certain amount of time
   * @param {number} wait amount of time
   *
   * @return {function} function that is not able to debounce
   */
  static debounce(func, wait) {
      var timeout;
      var ctx;
      var timestamp;
      var result;
      var args;
      return function() {
          ctx = this;
          args = arguments;
          timestamp = FamousEngine.now();

          var fn = function() {
              var last = FamousEngine.now() - timestamp;

              if (last < wait) {
                  timeout = setTimeout(fn, wait - last);
              } else {
                  timeout = null;
                  result = func.apply(ctx, args);
              }
          };

          clear(timeout);
          timeout = setTimeout(fn, wait);

          return result;
      };
  }
}
