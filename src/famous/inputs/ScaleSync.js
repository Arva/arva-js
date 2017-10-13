/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import OptionsManager from '../core/OptionsManager.js';
 import TwoFingerSync from './TwoFingerSync.js';

export default class ScaleSync extends TwoFingerSync {

    /**
     * Handles piped in two-finger touch events to increase or decrease scale via pinching / expanding.
     *   Emits 'start', 'update' and 'end' events an object with position, velocity, touch ids, distance, and scale factor.
     *   Useful for determining a scaling factor from initial two-finger touch.
     *
     * @class ScaleSync
     * @extends TwoFingerSync
     * @constructor
     * @param {Object} options default options overrides
     * @param {Number} [options.scale] scale velocity by this factor
     */
    constructor(options) {
        super();

        this.options = Object.create(ScaleSync.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._scaleFactor = 1;
        this._startDist = 0;
        this._eventInput.on('pipe', this._reset());
    }

    static DEFAULT_OPTIONS = {
        scale : 1
    }

    _reset() {
        this.touchAId = undefined;
        this.touchBId = undefined;
    }

    // handles initial touch of two fingers
    _startUpdate(event) {
        this._scaleFactor = 1;
        this._startDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
        this._eventOutput.emit('start', {
            count: event.touches.length,
            touches: [this.touchAId, this.touchBId],
            distance: this._startDist,
            center: TwoFingerSync.calculateCenter(this.posA, this.posB)
        });
    }

    // handles movement of two fingers
    _moveUpdate(diffTime) {
        var scale = this.options.scale;

        var currDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
        var center = TwoFingerSync.calculateCenter(this.posA, this.posB);

        var delta = (currDist - this._startDist) / this._startDist;
        var newScaleFactor = Math.max(1 + scale * delta, 0);
        var veloScale = (newScaleFactor - this._scaleFactor) / diffTime;

        this._eventOutput.emit('update', {
            delta : delta,
            scale: newScaleFactor,
            velocity: veloScale,
            distance: currDist,
            center : center,
            touches: [this.touchAId, this.touchBId]
        });

        this._scaleFactor = newScaleFactor;
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
