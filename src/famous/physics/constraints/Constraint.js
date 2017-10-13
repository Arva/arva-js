/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


import EventHandler from '../../core/EventHandler.js';

export default class Constraint {

    /**
     *  Allows for two circular bodies to collide and bounce off each other.
     *
     *  @class Constraint
     *  @constructor
     *  @uses EventHandler
     *  @param options {Object}
     */
    constructor() {
        this.options = this.options || {};
        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        this._eventOutput.emit('change', options);
    }

    /**
     * Adds an impulse to a physics body's velocity due to the constraint
     *
     * @method applyConstraint
     */
    applyConstraint() {};

    /**
     * Getter for energy
     *
     * @method getEnergy
     * @return energy {Number}
     */
    getEnergy() {
        return 0.0;
    }
}
