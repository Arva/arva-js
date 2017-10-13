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
  * A library of curves which map an animation explicitly as a function of time.
  *
  * @class Easing
  */
export default class Easing {

  /**
   * @property inQuad
   * @static
   */
  static inQuad(t) {
      return t*t;
  }

  /**
   * @property outQuad
   * @static
   */
  static outQuad(t) {
      return -(t-=1)*t+1;
  }

  /**
   * @property inOutQuad
   * @static
   */
  static inOutQuad(t) {
      if ((t/=.5) < 1) return .5*t*t;
      return -.5*((--t)*(t-2) - 1);
  }

  /**
   * @property inCubic
   * @static
   */
  static inCubic(t) {
      return t*t*t;
  }

  /**
   * @property outCubic
   * @static
   */
  static outCubic(t) {
      return ((--t)*t*t + 1);
  }

  /**
   * @property inOutCubic
   * @static
   */
  static inOutCubic(t) {
      if ((t/=.5) < 1) return .5*t*t*t;
      return .5*((t-=2)*t*t + 2);
  }

  /**
   * @property inQuart
   * @static
   */
  static inQuart(t) {
      return t*t*t*t;
  }

  /**
   * @property outQuart
   * @static
   */
  static outQuart(t) {
      return -((--t)*t*t*t - 1);
  }

  /**
   * @property inOutQuart
   * @static
   */
  static inOutQuart(t) {
      if ((t/=.5) < 1) return .5*t*t*t*t;
      return -.5 * ((t-=2)*t*t*t - 2);
  }

  /**
   * @property inQuint
   * @static
   */
  static inQuint(t) {
      return t*t*t*t*t;
  }

  /**
   * @property outQuint
   * @static
   */
  static outQuint(t) {
      return ((--t)*t*t*t*t + 1);
  }

  /**
   * @property inOutQuint
   * @static
   */
  static inOutQuint(t) {
      if ((t/=.5) < 1) return .5*t*t*t*t*t;
      return .5*((t-=2)*t*t*t*t + 2);
  }

  /**
   * @property inSine
   * @static
   */
  static inSine(t) {
      return -1.0*Math.cos(t * (Math.PI/2)) + 1.0;
  }

  /**
   * @property outSine
   * @static
   */
  static outSine(t) {
      return Math.sin(t * (Math.PI/2));
  }

  /**
   * @property inOutSine
   * @static
   */
  static inOutSine(t) {
      return -.5*(Math.cos(Math.PI*t) - 1);
  }

  /**
   * @property inExpo
   * @static
   */
  static inExpo(t) {
      return (t===0) ? 0.0 : Math.pow(2, 10 * (t - 1));
  }

  /**
   * @property outExpo
   * @static
   */
  static outExpo(t) {
      return (t===1.0) ? 1.0 : (-Math.pow(2, -10 * t) + 1);
  }

  /**
   * @property inOutExpo
   * @static
   */
  static inOutExpo(t) {
      if (t===0) return 0.0;
      if (t===1.0) return 1.0;
      if ((t/=.5) < 1) return .5 * Math.pow(2, 10 * (t - 1));
      return .5 * (-Math.pow(2, -10 * --t) + 2);
  }

  /**
   * @property inCirc
   * @static
   */
  static inCirc(t) {
      return -(Math.sqrt(1 - t*t) - 1);
  }

  /**
   * @property outCirc
   * @static
   */
  static outCirc(t) {
      return Math.sqrt(1 - (--t)*t);
  }

  /**
   * @property inOutCirc
   * @static
   */
  static inOutCirc(t) {
      if ((t/=.5) < 1) return -.5 * (Math.sqrt(1 - t*t) - 1);
      return .5 * (Math.sqrt(1 - (t-=2)*t) + 1);
  }

  /**
   * @property inElastic
   * @static
   */
  static inElastic(t) {
      var s=1.70158; var p=0; var a=1.0;
      if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
      s = p/(2*Math.PI) * Math.asin(1.0/a);
      return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/ p));
  }

  /**
   * @property outElastic
   * @static
   */
  static outElastic(t) {
      var s=1.70158; var p=0; var a=1.0;
      if (t===0) return 0.0;  if (t===1) return 1.0;  if (!p) p=.3;
      s = p/(2*Math.PI) * Math.asin(1.0/a);
      return a*Math.pow(2,-10*t) * Math.sin((t-s)*(2*Math.PI)/p) + 1.0;
  }

  /**
   * @property inOutElastic
   * @static
   */
  static inOutElastic(t) {
      var s=1.70158; var p=0;   var a=1.0;
      if (t===0) return 0.0;  if ((t/=.5)===2) return 1.0;  if (!p) p=(.3*1.5);
      s = p/(2*Math.PI) * Math.asin(1.0/a);
      if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p));
      return a*Math.pow(2,-10*(t-=1)) * Math.sin((t-s)*(2*Math.PI)/p)*.5 + 1.0;
  }

  /**
   * @property inBack
   * @static
   */
  static inBack(t, s) {
      if (s === undefined) s = 1.70158;
      return t*t*((s+1)*t - s);
  }

  /**
   * @property outBack
   * @static
   */
  static outBack(t, s) {
      if (s === undefined) s = 1.70158;
      return ((--t)*t*((s+1)*t + s) + 1);
  }

  /**
   * @property inOutBack
   * @static
   */
  static inOutBack(t, s) {
      if (s === undefined) s = 1.70158;
      if ((t/=.5) < 1) return .5*(t*t*(((s*=(1.525))+1)*t - s));
      return .5*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
  }

  /**
   * @property inBounce
   * @static
   */
  static inBounce(t) {
      return 1.0 - Easing.outBounce(1.0-t);
  }

  /**
   * @property outBounce
   * @static
   */
  static outBounce(t) {
      if (t < (1/2.75)) {
          return (7.5625*t*t);
      } else if (t < (2/2.75)) {
          return (7.5625*(t-=(1.5/2.75))*t + .75);
      } else if (t < (2.5/2.75)) {
          return (7.5625*(t-=(2.25/2.75))*t + .9375);
      } else {
          return (7.5625*(t-=(2.625/2.75))*t + .984375);
      }
  }

  /**
   * @property inOutBounce
   * @static
   */
  static inOutBounce(t) {
      if (t < .5) return Easing.inBounce(t*2) * .5;
      return Easing.outBounce(t*2-1.0) * .5 + .5;
  }

}
