/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


 export default class Vector {
   /**
    * Three-element floating point vector.
    *
    * @class Vector
    * @constructor
    *
    * @param {number} x x element value
    * @param {number} y y element value
    * @param {number} z z element value
    */
   constructor(x,y,z) {
       if (arguments.length === 1 && x !== undefined) this.set(x);
       else {
           this.x = x || 0;
           this.y = y || 0;
           this.z = z || 0;
       }
       return this;
   }

   static _register = new Vector(0,0,0);

   /**
    * Add this element-wise to another Vector, element-wise.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method add
    * @param {Vector} v addend
    * @return {Vector} vector sum
    */
   add(v) {
       return _setXYZ.call(_register,
           this.x + v.x,
           this.y + v.y,
           this.z + v.z
       );
   }

   /**
    * Subtract another vector from this vector, element-wise.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method sub
    * @param {Vector} v subtrahend
    * @return {Vector} vector difference
    */
   sub(v) {
       return _setXYZ.call(_register,
           this.x - v.x,
           this.y - v.y,
           this.z - v.z
       );
   }

   /**
    * Scale Vector by floating point r.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method mult
    *
    * @param {number} r scalar
    * @return {Vector} vector result
    */
   mult(r) {
       return _setXYZ.call(_register,
           r * this.x,
           r * this.y,
           r * this.z
       );
   }

   /**
    * Scale Vector by floating point 1/r.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method div
    *
    * @param {number} r scalar
    * @return {Vector} vector result
    */
   div(r) {
       return this.mult(1 / r);
   }

   /**
    * Given another vector v, return cross product (v)x(this).
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method cross
    * @param {Vector} v Left Hand Vector
    * @return {Vector} vector result
    */
   cross(v) {
       let x = this.x;
       let y = this.y;
       let z = this.z;
       let vx = v.x;
       let vy = v.y;
       let vz = v.z;

       return _setXYZ.call(_register,
           z * vy - y * vz,
           x * vz - z * vx,
           y * vx - x * vy
       );
   }

   /**
    * Component-wise equality test between this and Vector v.
    * @method equals
    * @param {Vector} v vector to compare
    * @return {boolean}
    */
   equals(v) {
       return (v.x === this.x && v.y === this.y && v.z === this.z);
   }

   /**
    * Rotate clockwise around x-axis by theta radians.
    *   Note: This sets the internal result register, so other references to that vector will change.
    * @method rotateX
    * @param {number} theta radians
    * @return {Vector} rotated vector
    */
   rotateX(theta) {
       let x = this.x;
       let y = this.y;
       let z = this.z;

       let cosTheta = Math.cos(theta);
       let sinTheta = Math.sin(theta);

       return _setXYZ.call(_register,
           x,
           y * cosTheta - z * sinTheta,
           y * sinTheta + z * cosTheta
       );
   }

   /**
    * Rotate clockwise around y-axis by theta radians.
    *   Note: This sets the internal result register, so other references to that vector will change.
    * @method rotateY
    * @param {number} theta radians
    * @return {Vector} rotated vector
    */
   rotateY(theta) {
       let x = this.x;
       let y = this.y;
       let z = this.z;

       let cosTheta = Math.cos(theta);
       let sinTheta = Math.sin(theta);

       return _setXYZ.call(_register,
           z * sinTheta + x * cosTheta,
           y,
           z * cosTheta - x * sinTheta
       );
   }

   /**
    * Rotate clockwise around z-axis by theta radians.
    *   Note: This sets the internal result register, so other references to that vector will change.
    * @method rotateZ
    * @param {number} theta radians
    * @return {Vector} rotated vector
    */
   rotateZ(theta) {
       let x = this.x;
       let y = this.y;
       let z = this.z;

       let cosTheta = Math.cos(theta);
       let sinTheta = Math.sin(theta);

       return _setXYZ.call(_register,
           x * cosTheta - y * sinTheta,
           x * sinTheta + y * cosTheta,
           z
       );
   }

   /**
    * Return dot product of this with a second Vector
    * @method dot
    * @param {Vector} v second vector
    * @return {number} dot product
    */
   dot(v) {
       return this.x * v.x + this.y * v.y + this.z * v.z;
   }

   /**
    * Return squared length of this vector
    * @method normSquared
    * @return {number} squared length
    */
   normSquared() {
       return this.dot(this);
   }

   /**
    * Return length of this vector
    * @method norm
    * @return {number} length
    */
   norm() {
       return Math.sqrt(this.normSquared());
   }

   /**
    * Scale Vector to specified length.
    *   If length is less than internal tolerance, set vector to [length, 0, 0].
    *   Note: This sets the internal result register, so other references to that vector will change.
    * @method normalize
    *
    * @param {number} length target length, default 1.0
    * @return {Vector}
    */
   normalize(length) {
       if (arguments.length === 0) length = 1;
       let norm = this.norm();

       if (norm > 1e-7) return _setFromVector.call(_register, this.mult(length / norm));
       else return _setXYZ.call(_register, length, 0, 0);
   }

   /**
    * Make a separate copy of the Vector.
    *
    * @method clone
    *
    * @return {Vector}
    */
   clone() {
       return new Vector(this);
   }

   /**
    * True if and only if every value is 0 (or falsy)
    *
    * @method isZero
    *
    * @return {boolean}
    */
   isZero() {
       return !(this.x || this.y || this.z);
   }

   static _setXYZ(x,y,z) {
       this.x = x;
       this.y = y;
       this.z = z;
       return this;
   }

   static _setFromArray(v) {
       return _setXYZ.call(this,v[0],v[1],v[2] || 0);
   }

   static _setFromVector(v) {
       return _setXYZ.call(this, v.x, v.y, v.z);
   }

   static _setFromNumber(x) {
       return _setXYZ.call(this,x,0,0);
   }

   /**
    * Set this Vector to the values in the provided Array or Vector.
    *
    * @method set
    * @param {object} v array, Vector, or number
    * @return {Vector} this
    */
   set(v) {
       if (v instanceof Array) return _setFromArray.call(this, v);
       if (typeof v === 'number') return _setFromNumber.call(this, v);
       return _setFromVector.call(this, v);
   }

   setXYZ(x,y,z) {
       return _setXYZ.apply(this, arguments);
   }

   set1D(x) {
       return _setFromNumber.call(this, x);
   }

   /**
    * Put result of last internal register calculation in specified output vector.
    *
    * @method put
    * @param {Vector} v destination vector
    * @return {Vector} destination vector
    */

   put(v) {
       if (this === _register) _setFromVector.call(v, _register);
       else _setFromVector.call(v, this);
   }

   /**
    * Set this vector to [0,0,0]
    *
    * @method clear
    */
   clear() {
       return _setXYZ.call(this,0,0,0);
   }

   /**
    * Scale this Vector down to specified "cap" length.
    *   If Vector shorter than cap, or cap is Infinity, do nothing.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method cap
    * @return {Vector} capped vector
    */
   cap(cap) {
       if (cap === Infinity) return _setFromVector.call(_register, this);
       let norm = this.norm();
       if (norm > cap) return _setFromVector.call(_register, this.mult(cap / norm));
       else return _setFromVector.call(_register, this);
   }

   /**
    * Return projection of this Vector onto another.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method project
    * @param {Vector} n vector to project upon
    * @return {Vector} projected vector
    */
   project(n) {
       return n.mult(this.dot(n));
   }

   /**
    * Reflect this Vector across provided vector.
    *   Note: This sets the internal result register, so other references to that vector will change.
    *
    * @method reflectAcross
    * @param {Vector} n vector to reflect across
    * @return {Vector} reflected vector
    */
   reflectAcross(n) {
       n.normalize().put(n);
       return _setFromVector(_register, this.sub(this.project(n).mult(2)));
   }

   /**
    * Convert Vector to three-element array.
    *
    * @method get
    * @return {array<number>} three-element array
    */
   get() {
       return [this.x, this.y, this.z];
   }

   get1D() {
       return this.x;
   }
 }
