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

export default class Circle extends Body {

    /**
     * Implements a circle, or spherical, geometry for a Body with
     * radius.
     *
     * @class Circle
     * @extends Body
     * @constructor
     */
    constructor(options) {
      super(...arguments);
      options = options || {};
      this.setRadius(options.radius || 0);
    }

    /**
     * Basic setter for radius.
     * @method setRadius
     * @param r {Number} radius
     */
    setRadius(r) {
        this.radius = r;
        this.size = [2*this.radius, 2*this.radius];
        this.setMomentsOfInertia();
    }

    setMomentsOfInertia() {
        var m = this.mass;
        var r = this.radius;

        this.inertia = new Matrix([
            [0.25 * m * r * r, 0, 0],
            [0, 0.25 * m * r * r, 0],
            [0, 0, 0.5 * m * r * r]
        ]);

        this.inverseInertia = new Matrix([
            [4 / (m * r * r), 0, 0],
            [0, 4 / (m * r * r), 0],
            [0, 0, 2 / (m * r * r)]
        ]);
    }
}
