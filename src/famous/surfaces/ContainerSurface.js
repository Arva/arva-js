/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Surface from '../core/Surface.js';
import Context from '../core/Context.js';
import ElementAllocator from '../core/ElementAllocator.js';

export default class ContainerSurface extends Surface {

  elementType = 'div';
  elementClass = 'famous-surface';

  /**
   * ContainerSurface is an object designed to contain surfaces and
   *   set properties to be applied to all of them at once.
   *   This extends the Surface class.
   *   A container surface will enforce these properties on the
   *   surfaces it contains:
   *
   *   size (clips contained surfaces to its own width and height);
   *
   *   origin;
   *
   *   its own opacity and transform, which will be automatically
   *   applied to  all Surfaces contained directly and indirectly.
   *
   * @class ContainerSurface
   * @extends Surface
   * @constructor
   * @param {Array.Number} [options.size] [width, height] in pixels
   * @param {Array.string} [options.classes] CSS classes to set on all inner content
   * @param {Array} [options.properties] string dictionary of HTML attributes to set on target div
   * @param {string} [options.content] inner (HTML) content of surface (should not be used)
   */
  constructor(options) {
    super(...arguments);
    this._container = document.createElement('div');
    this._container.classList.add('famous-group');
    this._container.classList.add('famous-container-group');
    this._shouldRecalculateSize = false;
    this.context = new Context(this._container);
    this.context.setPermanentElementAllocator(new ElementAllocator(this._container));
    this.setContent(this._container);
  }

  /**
   * Add renderables to this object's render tree
   *
   * @method add
   *
   * @param {Object} obj renderable object
   * @return {RenderNode} RenderNode wrapping this object, if not already a RenderNode
   */
  add() {
    return this.context.add.apply(this.context, arguments);
  }

  /**
   * Return spec for this surface.  Note: Can result in a size recalculation.
   *
   * @private
   * @method render
   *
   * @return {Object} render spec for this surface (spec id)
   */
  render() {
    if (this._sizeDirty) this._shouldRecalculateSize = true;
    return super.render(...arguments);
  }

  /**
   * Place the document element this component manages into the document.
   *
   * @private
   * @method deploy
   * @param {Node} target document parent of this container
   */
  deploy() {
    this._shouldRecalculateSize = true;
    return super.deploy(...arguments);
  }

  /**
   * Apply changes from this component to the corresponding document element.
   * This includes changes to classes, styles, size, content, opacity, origin,
   * and matrix transforms.
   *
   * @private
   * @method commit
   * @param {Context} context commit context
   * @return {undefined} TODO returns an undefined value
   */
  commit(context) {
    let previousSize = this._size ? [this._size[0], this._size[1]] : null;
    let result = super.commit(...arguments);
    this.context.setSize(context.size);
    this.context.update({hide: context.opacity === 0 || context.hide});
    return result;
  }
}
