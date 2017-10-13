/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import TwoFingerSync from './TwoFingerSync.js';
import OptionsManager from '../core/OptionsManager.js';


export default class RotateSync extends TwoFingerSync {

    /**
     * Handles piped in two-finger touch events to increase or decrease scale via pinching / expanding.
     *   Emits 'start', 'update' and 'end' events an object with position, velocity, touch ids, and angle.
     *   Useful for determining a rotation factor from initial two-finger touch.
     *
     * @class RotateSync
     * @extends TwoFingerSync
     * @constructor
     * @param {Object} options default options overrides
     * @param {Number} [options.scale] scale velocity by this factor
     */
    constructor(options) {
        super();

        this.options = Object.create(RotateSync.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._angle = 0;
        this._previousAngle = 0;
    }

    static DEFAULT_OPTIONS = {
        scale : 1
    }

    _startUpdate(event) {
        this._angle = 0;
        this._previousAngle = TwoFingerSync.calculateAngle(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);
        this._eventOutput.emit('start', {
            count: event.touches.length,
            angle: this._angle,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });
    }

    _moveUpdate(diffTime) {
        let scale = this.options.scale;

        let currAngle = TwoFingerSync.calculateAngle(this.posA, this.posB);
        let center = TwoFingerSync.calculateCenter(this.posA, this.posB);

        let diffTheta = scale * (currAngle - this._previousAngle);
        let velTheta = diffTheta / diffTime;

        this._angle += diffTheta;

        this._eventOutput.emit('update', {
            delta : diffTheta,
            velocity: velTheta,
            angle: this._angle,
            center: center,
            touches: [this.touchAId, this.touchBId]
        });

        this._previousAngle = currAngle;
    }

    /**
     * Return entire options dictionary, including defaults.
     *
     * @method getOptions
     * @return {Object} configuration options
     */
    getOptions() {
        return this.options;
    }

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Number} [options.scale] scale velocity by this factor
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }
}
