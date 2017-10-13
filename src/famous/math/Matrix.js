/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Vector from './Vector.js';

 export default class Matrix {
   /**
    * A library for using a 3x3 numerical matrix, represented as a two-level array.
    *
    * @class Matrix
    * @constructor
    *
    * @param {Array.Array} values array of rows
    */
   constructor(values) {
       this.values = values ||
           [
               [1,0,0],
               [0,1,0],
               [0,0,1]
           ];

       return this;
   }

   static _register = new Matrix();
   static _vectorRegister = new Vector();

   /**
    * Return the values in the matrix as an array of numerical row arrays
    *
    * @method get
    *
    * @return {Array.array} matrix values as array of rows.
    */
   get() {
       return this.values;
   }

   /**
    * Set the nested array of rows in the matrix.
    *
    * @method set
    *
    * @param {Array.array} values matrix values as array of rows.
    */
   set(values) {
       this.values = values;
   }

   /**
    * Take this matrix as A, input vector V as a column vector, and return matrix product (A)(V).
    *   Note: This sets the internal vector register.  Current handles to the vector register
    *   will see values changed.
    *
    * @method vectorMultiply
    *
    * @param {Vector} v input vector V
    * @return {Vector} result of multiplication, as a handle to the internal vector register
    */
   vectorMultiply(v) {
       let M = this.get();
       let v0 = v.x;
       let v1 = v.y;
       let v2 = v.z;

       let M0 = M[0];
       let M1 = M[1];
       let M2 = M[2];

       let M00 = M0[0];
       let M01 = M0[1];
       let M02 = M0[2];
       let M10 = M1[0];
       let M11 = M1[1];
       let M12 = M1[2];
       let M20 = M2[0];
       let M21 = M2[1];
       let M22 = M2[2];

       return _vectorRegister.setXYZ(
           M00*v0 + M01*v1 + M02*v2,
           M10*v0 + M11*v1 + M12*v2,
           M20*v0 + M21*v1 + M22*v2
       );
   }

   /**
    * Multiply the provided matrix M2 with this matrix.  Result is (this) * (M2).
    *   Note: This sets the internal matrix register.  Current handles to the register
    *   will see values changed.
    *
    * @method multiply
    *
    * @param {Matrix} M2 input matrix to multiply on the right
    * @return {Matrix} result of multiplication, as a handle to the internal register
    */
   multiply(M2) {
       let M1 = this.get();
       let result = [[]];
       for (let i = 0; i < 3; i++) {
           result[i] = [];
           for (let j = 0; j < 3; j++) {
               let sum = 0;
               for (let k = 0; k < 3; k++) {
                   sum += M1[i][k] * M2[k][j];
               }
               result[i][j] = sum;
           }
       }
       return _register.set(result);
   }

   /**
    * Creates a Matrix which is the transpose of this matrix.
    *   Note: This sets the internal matrix register.  Current handles to the register
    *   will see values changed.
    *
    * @method transpose
    *
    * @return {Matrix} result of transpose, as a handle to the internal register
    */
   transpose() {
       let result = [[], [], []];
       let M = this.get();
       for (let row = 0; row < 3; row++) {
           for (let col = 0; col < 3; col++) {
               result[row][col] = M[col][row];
           }
       }
       return _register.set(result);
   }

   /**
    * Clones the matrix
    *
    * @method clone
    * @return {Matrix} New copy of the original matrix
    */
   clone() {
       let values = this.get();
       let M = [];
       for (let row = 0; row < 3; row++)
           M[row] = values[row].slice();
       return new Matrix(M);
   }

 }
