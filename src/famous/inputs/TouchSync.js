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
 import TouchTracker from './TouchTracker.js';
 import OptionsManager from '../core/OptionsManager.js';

export default class TouchSync {

    /**
     * Handles piped in touch events. Emits 'start', 'update', and 'events'
     *   events with delta, position, velocity, acceleration, clientX, clientY, count, and touch id.
     *   Useful for dealing with inputs on touch devices. Designed to be used either as standalone, or
     *   included in a GenericSync.
     *
     * @class TouchSync
     * @constructor
     *
     * @example
     *   var Surface = require('../core/Surface');
     *   var TouchSync = require('../inputs/TouchSync');
     *
     *   var surface = new Surface({ size: [100, 100] });
     *   var touchSync = new TouchSync();
     *   surface.pipe(touchSync);
     *
     *   touchSync.on('start', function (e) { // react to start });
     *   touchSync.on('update', function (e) { // react to update });
     *   touchSync.on('end', function (e) { // react to end });*
     *
     * @param [options] {Object}             default options overrides
     * @param [options.direction] {Number}   read from a particular axis
     * @param [options.rails] {Boolean}      read from axis with greatest differential
     * @param [options.velocitySampleLength] {Number}  Number of previous frames to check velocity against.
     * @param [options.scale] {Number}       constant factor to scale velocity output
     * @param [options.touchLimit] {Number}  touchLimit upper bound for emitting events based on number of touches
     */
    constructor(options) {
        this.options =  Object.create(TouchSync.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._eventOutput = new EventHandler();
        this._touchTracker = new TouchTracker({
            touchLimit: this.options.touchLimit,
            axis: this.options.axis
        });

        EventHandler.setOutputHandler(this, this._eventOutput);
        EventHandler.setInputHandler(this, this._touchTracker);

        this._touchTracker.on('trackstart', this._handleStart);
        this._touchTracker.on('trackmove', this._handleMove);
        this._touchTracker.on('trackend', this._handleEnd);

        this._payload = {
            delta    : null,
            position : null,
            velocity : null,
            clientX  : undefined,
            clientY  : undefined,
            count    : 0,
            touch    : undefined
        };

        this._position = null; // to be deprecated
    }

    static DEFAULT_OPTIONS = {
        direction: undefined,
        rails: false,
        touchLimit: 1,
        velocitySampleLength: 10,
        scale: 1
    }

    static DIRECTION_X = 0;
    static DIRECTION_Y = 1;

    static MINIMUM_TICK_TIME = 8;

    /**
     *  Triggered by trackstart.
     *  @method _handleStart
     *  @private
     */
    _handleStart(data) {
        let velocity;
        let delta;
        if (this.options.direction !== undefined){
            this._position = 0;
            velocity = 0;
            delta = 0;
        }
        else {
            this._position = [0, 0];
            velocity = [0, 0];
            delta = [0, 0];
        }

        let payload = this._payload;
        payload.delta = delta;
        payload.position = this._position;
        payload.velocity = velocity;
        payload.clientX = data.x;
        payload.clientY = data.y;
        payload.count = data.count;
        payload.touch = data.identifier;

        this._eventOutput.emit('start', payload);
    }

    /**
     *  Triggered by trackmove.
     *  @method _handleMove
     *  @private
     */
    _handleMove(data) {
        let history = data.history;

        let currHistory = history[history.length - 1];
        let prevHistory = history[history.length - 2];

        let distantHistory = history[history.length - this.options.velocitySampleLength] ?
          history[history.length - this.options.velocitySampleLength] :
          history[history.length - 2];

        let distantTime = distantHistory.timestamp;
        let currTime = currHistory.timestamp;

        let diffX = currHistory.x - prevHistory.x;
        let diffY = currHistory.y - prevHistory.y;

        let velDiffX = currHistory.x - distantHistory.x;
        let velDiffY = currHistory.y - distantHistory.y;

        if (this.options.rails) {
            if (Math.abs(diffX) > Math.abs(diffY)) diffY = 0;
            else diffX = 0;

            if (Math.abs(velDiffX) > Math.abs(velDiffY)) velDiffY = 0;
            else velDiffX = 0;
        }

        let diffTime = Math.max(currTime - distantTime, MINIMUM_TICK_TIME);

        let velX = velDiffX / diffTime;
        let velY = velDiffY / diffTime;

        let scale = this.options.scale;
        let nextVel;
        let nextDelta;

        if (this.options.direction === TouchSync.DIRECTION_X) {
            nextDelta = scale * diffX;
            nextVel = scale * velX;
            this._position += nextDelta;
        }
        else if (this.options.direction === TouchSync.DIRECTION_Y) {
            nextDelta = scale * diffY;
            nextVel = scale * velY;
            this._position += nextDelta;
        }
        else {
            nextDelta = [scale * diffX, scale * diffY];
            nextVel = [scale * velX, scale * velY];
            this._position[0] += nextDelta[0];
            this._position[1] += nextDelta[1];
        }

        let payload = this._payload;
        payload.delta    = nextDelta;
        payload.velocity = nextVel;
        payload.position = this._position;
        payload.clientX  = data.x;
        payload.clientY  = data.y;
        payload.count    = data.count;
        payload.touch    = data.identifier;

        this._eventOutput.emit('update', payload);
    }

    /**
     *  Triggered by trackend.
     *  @method _handleEnd
     *  @private
     */
    _handleEnd(data) {
        this._payload.count = data.count;
        this._eventOutput.emit('end', this._payload);
    }

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param [options] {Object}             default options overrides
     * @param [options.direction] {Number}   read from a particular axis
     * @param [options.rails] {Boolean}      read from axis with greatest differential
     * @param [options.scale] {Number}       constant factor to scale velocity output
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
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
}
