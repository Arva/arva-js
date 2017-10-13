/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import ContainerSurface from './ContainerSurface.js';

export default class FormContainerSurface extends ContainerSurface {

  elementType = 'form';

  constructor(options) {
    super(...arguments);
    if (options) this._method = options.method || '';
  }

  deploy(target) {
      if (this._method) target.method = this._method;
      return super.deploy(...arguments);
  }
}
