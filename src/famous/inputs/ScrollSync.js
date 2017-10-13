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
import Engine from '../core/Engine.js';
import OptionsManager from '../core/OptionsManager.js';

export default class ScrollSync {

  /**
   * Handles piped in mousewheel events.
   *   Emits 'start', 'update', and 'end' events with payloads including:
   *   delta: change since last position,
   *   position: accumulated deltas,
   *   velocity: speed of change in pixels per ms,
   *   slip: true (unused).
   *
   *   Can be used as delegate of GenericSync.
   *
   * @class ScrollSync
   * @constructor
   * @param {Object} [options] overrides of default options
   * @param {Number} [options.direction] Pay attention to x changes (ScrollSync.DIRECTION_X),
   *   y changes (ScrollSync.DIRECTION_Y) or both (undefined)
   * @param {Number} [options.minimumEndSpeed] End speed calculation floors at this number, in pixels per ms
   * @param {boolean} [options.rails] whether to snap position calculations to nearest axis
   * @param {Number | Array.Number} [options.scale] scale outputs in by scalar or pair of scalars
   * @param {Number} [options.stallTime] reset time for velocity calculation in ms
   */
  constructor(options) {
    this.options = Object.create(ScrollSync.DEFAULT_OPTIONS);
    this._optionsManager = new OptionsManager(this.options);
    if (options) this.setOptions(options);

    this._payload = {
      delta    : null,
      position : null,
      velocity : null,
      slip     : true
    };

    this._eventInput = new EventHandler();
    this._eventOutput = new EventHandler();

    EventHandler.setInputHandler(this, this._eventInput);
    EventHandler.setOutputHandler(this, this._eventOutput);

    this._position = (this.options.direction === undefined) ? [0,0] : 0;
    this._prevTime = undefined;
    this._prevVel = undefined;
    this._eventInput.on('mousewheel', this._handleMove);
    this._eventInput.on('wheel', this._handleMove);
    this._inProgress = false;
    this._loopBound = false;
  }

  static DEFAULT_OPTIONS = {
    direction: undefined,
    minimumEndSpeed: Infinity,
    swapDirections: false,
    rails: false,
    scale: 1,
    stallTime: 50,
    lineHeight: 40,
    preventDefault: false
  };

  static DIRECTION_X = 0;
  static DIRECTION_Y = 1;
  static MINIMUM_TICK_TIME = 8;

  _newFrame() {
    if (this._inProgress && (Date.now() - this._prevTime) > this.options.stallTime) {
      this._inProgress = false;

      let finalVel = (Math.abs(this._prevVel) >= this.options.minimumEndSpeed)
        ? this._prevVel
        : 0;

      let payload = this._payload;
      payload.position = this._position;
      payload.velocity = finalVel;
      payload.slip = true;

      this._eventOutput.emit('end', payload);
    }
  }

  _handleMove(event) {
    if (!this._inProgress) {
      this._inProgress = true;
      this._position = (this.options.direction === undefined) ? [0,0] : 0;
      payload = this._payload;
      payload.slip = true;
      payload.position = this._position;
      payload.clientX = event.clientX;
      payload.clientY = event.clientY;
      payload.offsetX = event.offsetX;
      payload.offsetY = event.offsetY;
      this._eventOutput.emit('start', payload);
      if (!this._loopBound) {
        Engine.on('prerender', this._newFrame);
        this._loopBound = true;
      }
    }

    let currTime = Date.now();
    let prevTime = this._prevTime || currTime;

    let diffX, diffY;

    if(!event.wheelDeltaX || !event.wheelDeltaY){
      diffX = 0;
      diffY = event.wheelDelta;
    } else {
      diffX = (event.wheelDeltaX !== undefined) ? event.wheelDeltaX : -event.deltaX;
      diffY = (event.wheelDeltaY !== undefined) ? event.wheelDeltaY : -event.deltaY;
    }


    if (event.deltaMode === 1) { // units in lines, not pixels
      diffX *= this.options.lineHeight;
      diffY *= this.options.lineHeight;
    }

    if (this.options.rails) {
      if (Math.abs(diffX) > Math.abs(diffY)) diffY = 0;
      else diffX = 0;
    }

    let diffTime = Math.max(currTime - prevTime, MINIMUM_TICK_TIME); // minimum tick time

    let velX = diffX / diffTime;
    let velY = diffY / diffTime;

    let scale = this.options.scale;
    let nextVel;
    let nextDelta;

    if (this.options.direction === ScrollSync.DIRECTION_X) {
      nextDelta = scale * diffX;
      nextVel = scale * velX;
      this._position += nextDelta;
    }
    else if (this.options.direction === ScrollSync.DIRECTION_Y) {
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
    if(this.options.swapDirections){
      let temp = payload.delta[0];
      payload.delta[0] = payload.delta[1];
      payload.delta[1] = temp;
      temp = payload.velocity[0];
      payload.velocity[0] = payload.velocity[1];
      payload.velocity[1] = temp;
      temp = payload.position[0];
      payload.position[0] = payload.position[1];
      payload.position[1] = temp;
    }
    payload.slip     = true;

    this._eventOutput.emit('update', payload);

    this._prevTime = currTime;
    this._prevVel = nextVel;
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
   * @param {Number} [options.minimimEndSpeed] If final velocity smaller than this, round down to 0.
   * @param {Number} [options.stallTime] ms of non-motion before 'end' emitted
   * @param {Number} [options.rails] whether to constrain to nearest axis.
   * @param {Number} [options.direction] ScrollSync.DIRECTION_X, DIRECTION_Y -
   *    pay attention to one specific direction.
   * @param {Number} [options.scale] constant factor to scale velocity output
   */
  setOptions(options) {
    return this._optionsManager.setOptions(options);
  }
}
