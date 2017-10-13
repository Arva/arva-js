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

export default class TwoFingerSync {

    /**
     * Helper to PinchSync, RotateSync, and ScaleSync.  Generalized handling of
     *   two-finger touch events.
     *   This class is meant to be overridden and not used directly.
     *
     * @class TwoFingerSync
     * @constructor
     */
    constructor() {
        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.touchAEnabled = false;
        this.touchAId = 0;
        this.posA = null;
        this.timestampA = 0;
        this.touchBEnabled = false;
        this.touchBId = 0;
        this.posB = null;
        this.timestampB = 0;

        this._eventInput.on('touchstart', this.handleStart);
        this._eventInput.on('touchmove', this.handleMove);
        this._eventInput.on('touchend', this.handleEnd);
        this._eventInput.on('touchcancel', this.handleEnd);
    }

    static calculateAngle = function(posA, posB) {
        let diffX = posB[0] - posA[0];
        let diffY = posB[1] - posA[1];
        return Math.atan2(diffY, diffX);
    };

    static calculateDistance = function(posA, posB) {
        let diffX = posB[0] - posA[0];
        let diffY = posB[1] - posA[1];
        return Math.sqrt(diffX * diffX + diffY * diffY);
    };

    static calculateCenter = function(posA, posB) {
        return [(posA[0] + posB[0]) / 2.0, (posA[1] + posB[1]) / 2.0];
    };

    // private
    handleStart(event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            if (!this.touchAEnabled) {
                this.touchAId = touch.identifier;
                this.touchAEnabled = true;
                this.posA = [touch.pageX, touch.pageY];
                this.timestampA = Date.now();
            }
            else if (!this.touchBEnabled) {
                this.touchBId = touch.identifier;
                this.touchBEnabled = true;
                this.posB = [touch.pageX, touch.pageY];
                this.timestampB = Date.now();
                this._startUpdate(event);
            }
        }
    }

    // private
    handleMove(event) {
        if (!(this.touchAEnabled && this.touchBEnabled)) return;
        let prevTimeA = this.timestampA;
        let prevTimeB = this.timestampB;
        let diffTime;
        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            if (touch.identifier === this.touchAId) {
                this.posA = [touch.pageX, touch.pageY];
                this.timestampA = Date.now();
                diffTime = this.timestampA - prevTimeA;
            }
            else if (touch.identifier === this.touchBId) {
                this.posB = [touch.pageX, touch.pageY];
                this.timestampB = Date.now();
                diffTime = this.timestampB - prevTimeB;
            }
        }
        if (diffTime) this._moveUpdate(diffTime);
    }

    // private
    handleEnd(event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            let touch = event.changedTouches[i];
            if (touch.identifier === this.touchAId || touch.identifier === this.touchBId) {
                if (this.touchAEnabled && this.touchBEnabled) {
                    this._eventOutput.emit('end', {
                        touches : [this.touchAId, this.touchBId],
                        angle   : this._angle
                    });
                }
                this.touchAEnabled = false;
                this.touchAId = 0;
                this.touchBEnabled = false;
                this.touchBId = 0;
            }
        }
    }
}
