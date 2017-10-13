/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Matrix from './Matrix.js';

export default class Quaternion {
  /**
   * @class Quaternion
   * @constructor
   *
   * @param {Number} w
   * @param {Number} x
   * @param {Number} y
   * @param {Number} z
   */
  constructor(w,x,y,z) {
      if (arguments.length === 1) this.set(w);
      else {
          this.w = (w !== undefined) ? w : 1;  //Angle
          this.x = (x !== undefined) ? x : 0;  //Axis.x
          this.y = (y !== undefined) ? y : 0;  //Axis.y
          this.z = (z !== undefined) ? z : 0;  //Axis.z
      }
  }

  static register = new Quaternion(1,0,0,0);

  /**
   * Doc: TODO
   * @method add
   * @param {Quaternion} q
   * @return {Quaternion}
   */
  add(q) {
      return register.setWXYZ(
          this.w + q.w,
          this.x + q.x,
          this.y + q.y,
          this.z + q.z
      );
  }

  /*
   * Docs: TODO
   *
   * @method sub
   * @param {Quaternion} q
   * @return {Quaternion}
   */
  sub(q) {
      return register.setWXYZ(
          this.w - q.w,
          this.x - q.x,
          this.y - q.y,
          this.z - q.z
      );
  }

  /**
   * Doc: TODO
   *
   * @method scalarDivide
   * @param {Number} s
   * @return {Quaternion}
   */
  scalarDivide(s) {
      return this.scalarMultiply(1/s);
  }

  /*
   * Docs: TODO
   *
   * @method scalarMultiply
   * @param {Number} s
   * @return {Quaternion}
   */
  scalarMultiply(s) {
      return register.setWXYZ(
          this.w * s,
          this.x * s,
          this.y * s,
          this.z * s
      );
  }

  /*
   * Docs: TODO
   *
   * @method multiply
   * @param {Quaternion} q
   * @return {Quaternion}
   */
  multiply(q) {
      //left-handed coordinate system multiplication
      let x1 = this.x;
      let y1 = this.y;
      let z1 = this.z;
      let w1 = this.w;
      let x2 = q.x;
      let y2 = q.y;
      let z2 = q.z;
      let w2 = q.w || 0;

      return register.setWXYZ(
          w1*w2 - x1*x2 - y1*y2 - z1*z2,
          x1*w2 + x2*w1 + y2*z1 - y1*z2,
          y1*w2 + y2*w1 + x1*z2 - x2*z1,
          z1*w2 + z2*w1 + x2*y1 - x1*y2
      );
  }

  static conj = new Quaternion(1,0,0,0);

  /*
   * Docs: TODO
   *
   * @method rotateVector
   * @param {Vector} v
   * @return {Quaternion}
   */
  rotateVector(v) {
      conj.set(this.conj());
      return register.set(this.multiply(v).multiply(conj));
  }

  /*
   * Docs: TODO
   *
   * @method inverse
   * @return {Quaternion}
   */
  inverse() {
      return register.set(this.conj().scalarDivide(this.normSquared()));
  }

  /*
   * Docs: TODO
   *
   * @method negate
   * @return {Quaternion}
   */
  negate() {
      return this.scalarMultiply(-1);
  }

  /*
   * Docs: TODO
   *
   * @method conj
   * @return {Quaternion}
   */
  conj() {
      return register.setWXYZ(
           this.w,
          -this.x,
          -this.y,
          -this.z
      );
  }

  /*
   * Docs: TODO
   *
   * @method normalize
   * @param {Number} length
   * @return {Quaternion}
   */
  normalize(length) {
      length = (length === undefined) ? 1 : length;
      return this.scalarDivide(length * this.norm());
  }

  /*
   * Docs: TODO
   *
   * @method makeFromAngleAndAxis
   * @param {Number} angle
   * @param {Vector} v
   * @return {Quaternion}
   */
  makeFromAngleAndAxis(angle, v) {
      //left handed quaternion creation: theta -> -theta
      let n  = v.normalize();
      let ha = angle*0.5;
      let s  = -Math.sin(ha);
      this.x = s*n.x;
      this.y = s*n.y;
      this.z = s*n.z;
      this.w = Math.cos(ha);
      return this;
  }

  /*
   * Docs: TODO
   *
   * @method setWXYZ
   * @param {Number} w
   * @param {Number} x
   * @param {Number} y
   * @param {Number} z
   * @return {Quaternion}
   */
  setWXYZ(w,x,y,z) {
      register.clear();
      this.w = w;
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
  }

  /*
   * Docs: TODO
   *
   * @method set
   * @param {Array|Quaternion} v
   * @return {Quaternion}
   */
  set(v) {
      if (v instanceof Array) {
          this.w = 0;
          this.x = v[0];
          this.y = v[1];
          this.z = v[2];
      }
      else {
          this.w = v.w;
          this.x = v.x;
          this.y = v.y;
          this.z = v.z;
      }
      if (this !== register) register.clear();
      return this;
  }

  /**
   * Docs: TODO
   *
   * @method put
   * @param {Quaternion} q
   * @return {Quaternion}
   */
  put(q) {
      q.set(register);
  }

  /**
   * Doc: TODO
   *
   * @method clone
   * @return {Quaternion}
   */
  clone() {
      return new Quaternion(this);
  }

  /**
   * Doc: TODO
   *
   * @method clear
   * @return {Quaternion}
   */
  clear() {
      this.w = 1;
      this.x = 0;
      this.y = 0;
      this.z = 0;
      return this;
  }

  /**
   * Doc: TODO
   *
   * @method isEqual
   * @param {Quaternion} q
   * @return {Boolean}
   */
  isEqual(q) {
      return q.w === this.w && q.x === this.x && q.y === this.y && q.z === this.z;
  }

  /**
   * Doc: TODO
   *
   * @method dot
   * @param {Quaternion} q
   * @return {Number}
   */
  dot(q) {
      return this.w * q.w + this.x * q.x + this.y * q.y + this.z * q.z;
  }

  /**
   * Doc: TODO
   *
   * @method normSquared
   * @return {Number}
   */
  normSquared() {
      return this.dot(this);
  }

  /**
   * Doc: TODO
   *
   * @method norm
   * @return {Number}
   */
  norm() {
      return Math.sqrt(this.normSquared());
  }

  /**
   * Doc: TODO
   *
   * @method isZero
   * @return {Boolean}
   */
  isZero() {
      return !(this.x || this.y || this.z);
  }

  /**
   * Doc: TODO
   *
   * @method getTransform
   * @return {Transform}
   */
  getTransform() {
      let temp = this.normalize(1);
      let x = temp.x;
      let y = temp.y;
      let z = temp.z;
      let w = temp.w;

      //LHC system flattened to column major = RHC flattened to row major
      return [
          1 - 2*y*y - 2*z*z,
              2*x*y - 2*z*w,
              2*x*z + 2*y*w,
          0,
              2*x*y + 2*z*w,
          1 - 2*x*x - 2*z*z,
              2*y*z - 2*x*w,
          0,
              2*x*z - 2*y*w,
              2*y*z + 2*x*w,
          1 - 2*x*x - 2*y*y,
          0,
          0,
          0,
          0,
          1
      ];
  }

  static matrixRegister = new Matrix();

  /**
   * Doc: TODO
   *
   * @method getMatrix
   * @return {Transform}
   */
  getMatrix() {
      let temp = this.normalize(1);
      let x = temp.x;
      let y = temp.y;
      let z = temp.z;
      let w = temp.w;

      //LHC system flattened to row major
      return matrixRegister.set([
          [
              1 - 2*y*y - 2*z*z,
                  2*x*y + 2*z*w,
                  2*x*z - 2*y*w
          ],
          [
                  2*x*y - 2*z*w,
              1 - 2*x*x - 2*z*z,
                  2*y*z + 2*x*w
          ],
          [
                  2*x*z + 2*y*w,
                  2*y*z - 2*x*w,
              1 - 2*x*x - 2*y*y
          ]
      ]);
  }

  static epsilon = 1e-5;

  /**
   * Doc: TODO
   *
   * @method slerp
   * @param {Quaternion} q
   * @param {Number} t
   * @return {Transform}
   */
  slerp(q, t) {
      let omega;
      let cosomega;®
      let sinomega;
      let scaleFrom;
      let scaleTo;

      cosomega = this.dot(q);
      if ((1.0 - cosomega) > epsilon) {
          omega       = Math.acos(cosomega);
          sinomega    = Math.sin(omega);
          scaleFrom   = Math.sin((1.0 - t) * omega) / sinomega;
          scaleTo     = Math.sin(t * omega) / sinomega;
      }
      else {
          scaleFrom   = 1.0 - t;
          scaleTo     = t;
      }
      return register.set(this.scalarMultiply(scaleFrom/scaleTo).add(q).scalarMultiply(scaleTo));
  }
}
