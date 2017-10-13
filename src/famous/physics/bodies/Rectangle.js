/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Body from './Body.js';
import Matrix from '../../math/Matrix.js';

export default class Rectangle extends Body {

    /**
     * Implements a rectangular geometry for an Body with
     * size = [width, height].
     *
     * @class Rectangle
     * @extends Body
     * @constructor
     */
    constructor(options) {
      super(...arguments);
      options = options || {};
      this.size = options.size || [0,0];
    }

    /**
     * Basic setter for size.
     * @method setSize
     * @param size {Array} size = [width, height]
     */
    setSize(size) {
        this.size = size;
        this.setMomentsOfInertia();
    }

    setMomentsOfInertia() {
        var m = this.mass;
        var w = this.size[0];
        var h = this.size[1];

        this.inertia = new Matrix([
            [m * h * h / 12, 0, 0],
            [0, m * w * w / 12, 0],
            [0, 0, m * (w * w + h * h) / 12]
        ]);

        this.inverseInertia = new Matrix([
            [12 / (m * h * h), 0, 0],
            [0, 12 / (m * w * w), 0],
            [0, 0, 12 / (m * (w * w + h * h))]
        ]);
    }
}
