/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import EventHandler from '../core/EventHandler.js';


export default class TouchTracker {

    _timestampTouch(touch, event, history) {
        return {
            x: touch.clientX,
            y: touch.clientY,
            identifier : touch.identifier,
            origin: event.origin,
            timestamp: Date.now(),
            count: event.touches.length,
            history: history
        };
    }

    _handleStart(event) {
        if (event.touches.length > this.touchLimit) return;
        this.isTouched = true;

        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            let data = this._timestampTouch(touch, event, null);
            this.eventOutput.emit('trackstart', data);
            if (!this.selective && !this.touchHistory[touch.identifier]) this.track(data);
        }
    }

    _handleMove(event) {
        if (event.touches.length > this.touchLimit) return;

        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            let history = this.touchHistory[touch.identifier];
            if (history) {
                let data = this._timestampTouch(touch, event, history);
                this.touchHistory[touch.identifier].push(data);
                this.eventOutput.emit('trackmove', data);
            }
        }
    }

    _handleEnd(event) {
        if (!this.isTouched) return;

        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            let history = this.touchHistory[touch.identifier];
            if (history) {
                let data = this._timestampTouch(touch, event, history);
                this.eventOutput.emit('trackend', data);
                delete this.touchHistory[touch.identifier];
            }
        }

        this.isTouched = false;
    }

    _handleUnpipe() {
        for (let i in this.touchHistory) {
            let history = this.touchHistory[i];
            this.eventOutput.emit('trackend', {
                touch: history[history.length - 1].touch,
                timestamp: Date.now(),
                count: 0,
                history: history
            });
            delete this.touchHistory[i];
        }
    }

    /**
     * Helper to TouchSync – tracks piped in touch events, organizes touch
     *   events by ID, and emits track events back to TouchSync.
     *   Emits 'trackstart', 'trackmove', and 'trackend' events upstream.
     *
     * @class TouchTracker
     * @constructor
     * @param {Object} options default options overrides
     * @param [options.selective] {Boolean} selective if false, saves state for each touch
     * @param [options.touchLimit] {Number} touchLimit upper bound for emitting events based on number of touches
     * @param [options.axis] {Number} 0 or 1, if only listening for movement on one axis
     */
    constructor(options) {
        this.selective = options.selective;
        this.touchLimit = options.touchLimit || 1;

        this.touchHistory = {};

        this.eventInput = new EventHandler();
        this.eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this.eventInput);
        EventHandler.setOutputHandler(this, this.eventOutput);

        this.eventInput.on('touchstart', this._handleStart, {axis: options.axis});
        this.eventInput.on('touchmove', this._handleMove, {axis: options.axis});
        this.eventInput.on('touchend', this._handleEnd,  {axis: options.axis});
        this.eventInput.on('touchcancel', this._handleEnd, {axis: options.axis});
        this.eventInput.on('unpipe', this._handleUnpipe, {axis: options.axis});

        this.isTouched = false;
    }

    /**
     * Record touch data, if selective is false.
     * @private
     * @method track
     * @param {Object} data touch data
     */
    track(data) {
        this.touchHistory[data.identifier] = [data];
    }
}
