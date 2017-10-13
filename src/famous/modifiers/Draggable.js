/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Transform from '../core/Transform.js';
import Transitionable from '../transitions/Transitionable.js';
import EventHandler from '../core/EventHandler.js';
import Utilities from '../math/Utilities.js';

import GenericSync from '../inputs/GenericSync.js';
import MouseSync from '../inputs/MouseSync.js';
import TouchSync from '../inputs/TouchSync.js';

GenericSync.register({'mouse': MouseSync, 'touch': TouchSync});

export default class Draggable {

  //binary representation of directions for bitwise operations
  static _direction = {
    x : 0x01,         //001
    y : 0x02          //010
  }

  /**
   * Makes added render nodes responsive to drag beahvior.
   *   Emits events 'start', 'update', 'end'.
   * @class Draggable
   * @constructor
   * @param {Object} [options] options configuration object.
   * @param {Number} [options.snapX] grid width for snapping during drag
   * @param {Number} [options.snapY] grid height for snapping during drag
   * @param {Array.Number} [options.xRange] maxmimum [negative, positive] x displacement from start of drag
   * @param {Array.Number} [options.yRange] maxmimum [negative, positive] y displacement from start of drag
   * @param {Boolean} [options.outsideTouches] When set to false, touch events outside xRange and yRange are ignored. Defaults to true
   * @param {Number} [options.scale] one pixel of input motion translates to this many pixels of output drag motion
   * @param {Number} [options.projection] User should set to Draggable._direction.x or
   *    Draggable._direction.y to constrain to one axis.
   *
   */
  constructor(options) {
    this.options = Object.create(Draggable.DEFAULT_OPTIONS);
    this.projection = this.getProjectionParameter(options);
    let axis = this.getAxis();
    this.sync = new GenericSync('ontouchstart' in document.documentElement ? ['touch'] : ['mouse', 'touch'], {
      scale : this.options.scale,
      axis: axis
    });
    if (options) this.setOptions(options);

    this._positionState = new Transitionable([0,0]);
    this._differential  = [0,0];
    this._lastTouchOffset = [0,0];

    this._active = true;
    this.eventOutput = new EventHandler();
    EventHandler.setInputHandler(this,  this.sync);
    EventHandler.setOutputHandler(this, this.eventOutput);

    this._bindEvents();
  }

  static DIRECTION_X = _direction.x;
  static DIRECTION_Y = _direction.y;

  static DEFAULT_OPTIONS = {
    projection  : _direction.x | _direction.y,
    scale       : 1,
    xRange      : null,
    yRange      : null,
    snapX       : 0,
    snapY       : 0,
    outsideTouches: true,
    transition  : {duration : 0}
  }

  _mapDifferential(differential) {
    let opts        = this.options;
    let projection  = this.projection;
    let snapX       = opts.snapX;
    let snapY       = opts.snapY;
    let rangeX      = opts.xRange;
    let rangeY      = opts.yRange;
    let outsideTouches = opts.outsideTouches;
    let lastOffset  = this._lastTouchOffset;

    //axes
    let tx = (projection & _direction.x) ? differential[0] : 0;
    let ty = (projection & _direction.y) ? differential[1] : 0;

    //snapping
    if (snapX > 0) tx -= tx % snapX;
    if (snapY > 0) ty -= ty % snapY;

    //ignore touches that happen outside of the xRange and yRange areas
    let newPositionX = lastOffset[0] + tx;
    if(rangeX && !outsideTouches && (newPositionX > rangeX[1] || newPositionX < rangeX[0])) {
      let overX = (newPositionX - rangeX[1]);
      let underX = (newPositionX - rangeX[0]);
      tx = Utilities.clamp(tx, [tx - underX, tx - overX]);
    }
    let newPositionY = lastOffset[0] + ty;
    if(rangeY && !outsideTouches && (newPositionY > rangeY[1] || newPositionY < rangeY[0])) {
      let overY = (newPositionY - rangeY[1]);
      let underY = (newPositionY - rangeY[0]);
      tx = Utilities.clamp(ty, [ty - underY, ty - overY]);
    }

    lastOffset[0] += tx;
    lastOffset[1] += ty;

    return [tx, ty];
  }

  _handleStart() {
    if (!this._active) return;
    if (this._positionState.isActive()) this._positionState.halt();
    this._lastTouchOffset = [this.getPosition()[0], this.getPosition()[1]];
    this.eventOutput.emit('start', {position : this.getPosition()});
  }

  _handleMove(event) {
    if (!this._active) return;

    let options = this.options;
    this._differential = event.position;
    let newDifferential = this._mapDifferential(this._differential);

    //buffer the differential if snapping is set
    this._differential[0] -= newDifferential[0];
    this._differential[1] -= newDifferential[1];

    let pos = this.getPosition();

    //modify position, retain reference
    pos[0] += newDifferential[0];
    pos[1] += newDifferential[1];

    //handle bounding box
    if (options.xRange){
      let xRange = [options.xRange[0] + 0.5 * options.snapX, options.xRange[1] - 0.5 * options.snapX];
      pos[0] = Utilities.clamp(pos[0], xRange);
    }

    if (options.yRange){
      let yRange = [options.yRange[0] + 0.5 * options.snapY, options.yRange[1] - 0.5 * options.snapY];
      pos[1] = Utilities.clamp(pos[1], yRange);
    }

    this.eventOutput.emit('update', {position : pos});
  }

  _handleEnd(data) {
    if (!this._active) return;
    this.eventOutput.emit('end', {data: data, position : this.getPosition()});
  }

  _bindEvents() {
    this.sync.on('start', this._handleStart);
    this.sync.on('update', this._handleMove);
    this.sync.on('end', this._handleEnd);
  }

  /**
   * Set internal options, overriding any default options
   *
   * @method setOptions
   *
   * @param {Object} [options] overrides of default options.  See constructor.
   */
  setOptions(options) {
    let currentOptions = this.options;
    if (options.scale  !== undefined) {
      currentOptions.scale  = options.scale;
      this.sync.setOptions({
        scale: options.scale
      });
    }
    if (options.xRange !== undefined) currentOptions.xRange = options.xRange;
    if (options.yRange !== undefined) currentOptions.yRange = options.yRange;
    if (options.snapX  !== undefined) currentOptions.snapX  = options.snapX;
    if (options.snapY  !== undefined) currentOptions.snapY  = options.snapY;
  }

  /**
   * Get current delta in position from where this draggable started.
   *
   * @method getPosition
   *
   * @return {array<number>} [x, y] position delta from start.
   */
  getPosition() {
    return this._positionState.get();
  }

  getProjectionParameter(options) {
    if (options.projection !== undefined) {
      let proj = options.projection || [];
      let actualProjection = 0;
      ['x', 'y'].forEach(function(val) {
        if (proj.indexOf(val) !== -1) actualProjection |= _direction[val];
      });
    }
    return actualProjection;
  }

  /**
   * Transition the element to the desired relative position via provided transition.
   *  For example, calling this with [0,0] will not change the position.
   *  Callback will be executed on completion.
   *
   * @method setRelativePosition
   *
   * @param {array<number>} position end state to which we interpolate
   * @param {transition} transition transition object specifying how object moves to new position
   * @param {function} callback zero-argument function to call on observed completion
   */
  setRelativePosition(position, transition, callback) {
    let currPos = this.getPosition();
    let relativePosition = [currPos[0] + position[0], currPos[1] + position[1]];
    this.setPosition(relativePosition, transition, callback);
  }

  /**
   * Transition the element to the desired absolute position via provided transition.
   *  Callback will be executed on completion.
   *
   * @method setPosition
   *
   * @param {array<number>} position end state to which we interpolate
   * @param {transition} transition transition object specifying how object moves to new position
   * @param {function} callback zero-argument function to call on observed completion
   */
  setPosition(position, transition, callback) {
    if (this._positionState.isActive()) this._positionState.halt();
    this._positionState.set(position, transition, callback);
  }

  /**
   * Set this draggable to respond to user input.
   *
   * @method activate
   *
   */
  activate() {
    this._active = true;
  }

  /**
   * Set this draggable to ignore user input.
   *
   * @method deactivate
   *
   */
  deactivate() {
    this._active = false;
  }

  /**
   * Switch the input response stage between active and inactive.
   *
   * @method toggle
   *
   */
  toggle() {
    this._active = !this._active;
  }


  /**
   * Gets the axis on which the Draggable is locked. If not locked, returns undefined
   *
   * @returns {Number|undefined}
   */
  getAxis() {
    let axis;
    if(this.projection === _direction.x){
      axis = 0;
    } else if(this.projection === _direction.y) {
      axis = 1
    }
    return axis;
  }
    /**
   * Return render spec for this Modifier, applying to the provided
   *    target component.  This is similar to render() for Surfaces.
   *
   * @private
   * @method modify
   *
   * @param {Object} target (already rendered) render spec to
   *    which to apply the transform.
   * @return {Object} render spec for this Modifier, including the
   *    provided target
   */
  modify(target) {
    let pos = this.getPosition();
    return {
      transform: Transform.translate(pos[0], pos[1]),
      target: target
    };
  };
}
