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

export default class CanvasSurface extends Surface {

  elementType = 'canvas';
  elementClass = 'famous-surface';
  /**
   * A surface containing an HTML5 Canvas element.
   *   This extends the Surface class.
   *
   * @class CanvasSurface
   * @extends Surface
   * @constructor
   * @param {Object} [options] overrides of default options
   * @param {Array.Number} [options.canvasSize] [width, height] for document element
   */
  constructor(options) {
      super(...arguments);
      if (options && options.canvasSize) this._canvasSize = options.canvasSize;
      if (!this._canvasSize) this._canvasSize = this.getSize();
      this._backBuffer = document.createElement('canvas');
      if (this._canvasSize) {
          this._backBuffer.width = this._canvasSize[0];
          this._backBuffer.height = this._canvasSize[1];
      }
      this._contextId = undefined;
  }


  /**
   * Set inner document content.  Note that this is a noop for CanvasSurface.
   *
   * @method setContent
   *
   */
  setContent() {console.warn('Cannot set content in a CanvasSurface')};

  /**
   * Place the document element this component manages into the document.
   *    This will draw the content to the document.
   *
   * @private
   * @method deploy
   * @param {Node} target document parent of this container
   */
  deploy(target) {
      if (this._canvasSize) {
          target.width = this._canvasSize[0];
          target.height = this._canvasSize[1];
      }
      if (this._contextId === '2d') {
          target.getContext(this._contextId).drawImage(this._backBuffer, 0, 0);
          this._backBuffer.width = 0;
          this._backBuffer.height = 0;
      }
  }

  /**
   * Remove this component and contained content from the document
   *
   * @private
   * @method recall
   *
   * @param {Node} target node to which the component was deployed
   */
  recall(target) {
      let size = this.getSize();

      this._backBuffer.width = target.width;
      this._backBuffer.height = target.height;

      if (this._contextId === '2d') {
          this._backBuffer.getContext(this._contextId).drawImage(target, 0, 0);
          target.width = 0;
          target.height = 0;
      }
  }

  /**
   * Returns the canvas element's context
   *
   * @method getContext
   * @param {string} contextId context identifier
   */
  getContext(contextId) {
      this._contextId = contextId;
      return this._currentTarget ? this._currentTarget.getContext(contextId) : this._backBuffer.getContext(contextId);
  }

  /**
   *  Set the size of the surface and canvas element.
   *
   *  @method setSize
   *  @param {Array.number} size [width, height] of surface
   *  @param {Array.number} canvasSize [width, height] of canvas surface
   */
  setSize(size, canvasSize) {
    super.setSize(...arguments);
    if (canvasSize) this._canvasSize = [canvasSize[0], canvasSize[1]];
    if (this._currentTarget) {
        this._currentTarget.width = this._canvasSize[0];
        this._currentTarget.height = this._canvasSize[1];
    }
  }
}
