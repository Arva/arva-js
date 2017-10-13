/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import InputSurface from './InputSurface.js';

export default class SubmitInputSurface extends InputSurface {

  constructor(options) {
    super(...arguments);
    this._type = 'submit';
    if (options && options.onClick) this.setOnClick(options.onClick);
  }

  setOnClick(onClick) {
    this.onClick = onClick;
  }

  deploy(target) {
    if (this.onclick) target.onClick = this.onClick;
    super.deploy(...arguments);
  }
}
