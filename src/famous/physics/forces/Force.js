/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Vector from '../../math/Vector.js';
import EventHandler from '../../core/EventHandler.js';


export default class Force {
    /**
     * Force base class.
     *
     * @class Force
     * @uses EventHandler
     * @constructor
     */
    constructor(force) {
        this.force = new Vector(force);
        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    /**
     * Basic setter for options
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        this._eventOutput.emit('change', options);
    }

    /**
     * Adds a force to a physics body's force accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply a force to.
     */
    applyForce(targets) {
        let length = targets.length;
        while (length--) {
            targets[length].applyForce(this.force);
        }
    }

    /**
     * Getter for a force's potential energy.
     *
     * @method getEnergy
     * @return energy {Number}
     */
    getEnergy() {
        return 0.0;
    }
}
