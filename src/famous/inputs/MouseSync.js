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
 import OptionsManager from '../core/OptionsManager.js';

export default class MouseSync {

      /**
       * Handles piped in mouse drag events. Outputs an object with the position delta from last frame, position from start,
       * current velocity averaged out over the velocitySampleLength (set via options), clientX, clientY, offsetX, and offsetY.
       *
       * Emits 'start', 'update' and 'end' events. Designed to be used either as a standalone MouseSync, or as part of a
       * GenericSync.
       *
       * @class MouseSync
       * @constructor
       *
       * @example
       *   var Surface = require('../core/Surface');
       *   var MouseSync = require('../inputs/MouseSync');
       *
       *   var surface = new Surface({ size: [100, 100] });
       *   var mouseSync = new MouseSync();
       *   surface.pipe(mouseSync);
       *
       *   mouseSync.on('start', function (e) { // react to start });
       *   mouseSync.on('update', function (e) { // react to update });
       *   mouseSync.on('end', function (e) { // react to end });
       *
       * @param [options] {Object}                An object of the following configurable options.
       * @param [options.clickThreshold] {Number} Absolute distance from click origin that will still trigger a click.
       * @param [options.direction] {Number}      Read from a particular axis. Valid options are: undefined, 0 or 1. 0 corresponds to x, and 1 to y. Default is undefined, which allows both x and y.
       * @param [options.rails] {Boolean}         Read from axis with the greatest differential.
       * @param [options.velocitySampleLength] {Number}  Number of previous frames to check velocity against.
       * @param [options.propogate] {Boolean}     Add a listener to document on mouseleave. This allows drag events to continue across the entire page.
       */
      constructor(options) {
          this.options =  Object.create(MouseSync.DEFAULT_OPTIONS);
          this._optionsManager = new OptionsManager(this.options);

          if (options) this.setOptions(options);

          this._eventInput = new EventHandler();
          this._eventOutput = new EventHandler();

          EventHandler.setInputHandler(this, this._eventInput);
          EventHandler.setOutputHandler(this, this._eventOutput);

          this._eventInput.on('mousedown', _handleStart.bind(this));
          this._eventInput.on('mousemove', _handleMove.bind(this));
          this._eventInput.on('mouseup', _handleEnd.bind(this));

          if (this.options.propogate) this._eventInput.on('mouseleave', _handleLeave.bind(this));
          else this._eventInput.on('mouseleave', _handleEnd.bind(this));

          if (this.options.clickThreshold) {
              window.addEventListener('click', function(event) {
                  if (Math.sqrt(Math.pow(this._displacement[0], 2) + Math.pow(this._displacement[1], 2)) > this.options.clickThreshold) {
                      event.stopPropagation();
                  }
              }.bind(this), true);
          }

          this._payload = {
              delta    : null,
              position : null,
              velocity : null,
              clientX  : 0,
              clientY  : 0,
              offsetX  : 0,
              offsetY  : 0
          };

          this._positionHistory = [];
          this._position = null;      // to be deprecated
          this._prevCoord = undefined;
          this._prevTime = undefined;
          this._down = false;
          this._moved = false;
          this._displacement = [0,0];
          this._documentActive = false;
      }

      static DEFAULT_OPTIONS = {
          clickThreshold: undefined,
          direction: undefined,
          rails: false,
          scale: 1,
          propogate: true,  // events piped to document on mouseleave
          velocitySampleLength: 10,
          preventDefault: false
      };

      static DIRECTION_X = 0;
      static DIRECTION_Y = 1;

      static MINIMUM_TICK_TIME = 8;

      /**
       *  Triggered by mousedown.
       *
       *  @method _handleStart
       *  @private
       */
      static _handleStart(event) {
          let delta;
          let velocity;
          if (this.options.preventDefault) event.preventDefault(); // prevent drag

          let x = event.clientX;
          let y = event.clientY;

          this._prevCoord = [x, y];
          this._prevTime = Date.now();
          this._down = true;
          this._move = false;

          if (this.options.direction !== undefined) {
              this._position = 0;
              delta = 0;
              velocity = 0;
          }
          else {
              this._position = [0, 0];
              delta = [0, 0];
              velocity = [0, 0];
          }

          if (this.options.clickThreshold) {
              this._displacement = [0,0];
          }

          let payload = this._payload;
          payload.delta = delta;
          payload.position = this._position;
          payload.velocity = velocity;
          payload.clientX = x;
          payload.clientY = y;
          payload.offsetX = event.offsetX;
          payload.offsetY = event.offsetY;

          this._positionHistory.push({
              position: payload.position.slice ? payload.position.slice(0) : payload.position,
              time: this._prevTime
          });

          this._eventOutput.emit('start', payload);
          this._documentActive = false;
      }

      /**
       *  Triggered by mousemove.
       *
       *  @method _handleMove
       *  @private
       */
      static _handleMove(event) {
          if (!this._prevCoord) return;

          let prevCoord = this._prevCoord;
          let prevTime = this._prevTime;

          let x = event.clientX;
          let y = event.clientY;

          let currTime = Date.now();

          let diffX = x - prevCoord[0];
          let diffY = y - prevCoord[1];

          if (this.options.rails) {
              if (Math.abs(diffX) > Math.abs(diffY)) diffY = 0;
              else diffX = 0;
          }

          let diffTime = Math.max(currTime - this._positionHistory[0].time, MINIMUM_TICK_TIME); // minimum tick time

          let scale = this.options.scale;
          let nextVel;
          let nextDelta;

          if (this.options.direction === MouseSync.DIRECTION_X) {
              nextDelta = scale * diffX;
              this._position += nextDelta;
              nextVel = scale * (this._position - this._positionHistory[0].position) / diffTime;
          }
          else if (this.options.direction === MouseSync.DIRECTION_Y) {
              nextDelta = scale * diffY;
              this._position += nextDelta;
              nextVel = scale * (this._position - this._positionHistory[0].position) / diffTime;
          }
          else {
              nextDelta = [scale * diffX, scale * diffY];
              nextVel = [
                  scale * (this._position[0] - this._positionHistory[0].position[0]) / diffTime,
                  scale * (this._position[1] - this._positionHistory[0].position[1]) / diffTime
              ];
              this._position[0] += nextDelta[0];
              this._position[1] += nextDelta[1];
          }

          if (this.options.clickThreshold !== false) {
              this._displacement[0] += diffX;
              this._displacement[1] += diffY;
          }

          let payload = this._payload;
          payload.delta    = nextDelta;
          payload.position = this._position;
          payload.velocity = nextVel;
          payload.clientX  = x;
          payload.clientY  = y;
          payload.offsetX  = event.offsetX;
          payload.offsetY  = event.offsetY;

          if (this._positionHistory.length === this.options.velocitySampleLength) {
            this._positionHistory.shift();
          }

          this._positionHistory.push({
            position: payload.position.slice ? payload.position.slice(0) : payload.position,
            time: currTime
          });

          this._eventOutput.emit('update', payload);

          this._prevCoord = [x, y];
          this._prevTime = currTime;
          this._move = true;
      }

      /**
       *  Triggered by mouseup on the element or document body if propagation is enabled, or
       *  mouseleave if propagation is off.
       *
       *  @method _handleEnd
       *  @private
       */
      static _handleEnd(event) {
          if (!this._down) return;

          this._eventOutput.emit('end', this._payload);
          this._prevCoord = undefined;
          this._prevTime = undefined;
          this._down = false;
          this._move = false;
          this._positionHistory = [];
      }

      /**
       *  Switches the mousemove listener to the document body, if propagation is enabled.
       *  @method _handleLeave
       *  @private
       */
      static _handleLeave(event) {
          if (!this._down || !this._move) return;

          if (!this._documentActive) {
            let boundMove = _handleMove.bind(this);
            let boundEnd = function(event) {
                _handleEnd.call(this, event);
                document.removeEventListener('mousemove', boundMove);
                document.removeEventListener('mouseup', boundEnd);
            }.bind(this, event);
            document.addEventListener('mousemove', boundMove);
            document.addEventListener('mouseup', boundEnd);
            this._documentActive = true;
          }
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
       * @param [options] {Object}             default options overrides
       * @param [options.direction] {Number}   read from a particular axis
       * @param [options.rails] {Boolean}      read from axis with greatest differential
       * @param [options.propogate] {Boolean}  add listened to document on mouseleave
       */
      setOptions(options) {
          return this._optionsManager.setOptions(options);
      }

}
