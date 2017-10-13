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


export default class PinchSync extends TwoFingerSync {
  /**
   * Handles piped in two-finger touch events to change position via pinching / expanding.
   *   Emits 'start', 'update' and 'end' events with
   *   position, velocity, touch ids, and distance between fingers.
   *
   * @class PinchSync
   * @extends TwoFingerSync
   * @constructor
   * @param {Object} options default options overrides
   * @param {Number} [options.scale] scale velocity by this factor
   */
  constructor(options) {
      super();

      this.options = Object.create(PinchSync.DEFAULT_OPTIONS);
      this._optionsManager = new OptionsManager(this.options);
      if (options) this.setOptions(options);

      this._displacement = 0;
      this._previousDistance = 0;
  }


  static DEFAULT_OPTIONS = {
      scale : 1
  }

  _startUpdate(event) {
      this._previousDistance = TwoFingerSync.calculateDistance(this.posA, this.posB);
      this._displacement = 0;

      this._eventOutput.emit('start', {
          count: event.touches.length,
          touches: [this.touchAId, this.touchBId],
          distance: this._dist,
          center: TwoFingerSync.calculateCenter(this.posA, this.posB)
      });
  }

  _moveUpdate(diffTime) {
      let currDist = TwoFingerSync.calculateDistance(this.posA, this.posB);
      let center = TwoFingerSync.calculateCenter(this.posA, this.posB);

      let scale = this.options.scale;
      let delta = scale * (currDist - this._previousDistance);
      let velocity = delta / diffTime;

      this._previousDistance = currDist;
      this._displacement += delta;

      this._eventOutput.emit('update', {
          delta : delta,
          velocity: velocity,
          distance: currDist,
          displacement: this._displacement,
          center: center,
          touches: [this.touchAId, this.touchBId]
      });
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
