/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Entity from '../core/Entity.js';
import RenderNode from '../core/RenderNode.js';
import Transform from '../core/Transform.js';
import OptionsManager from '../core/OptionsManager.js';

export default class HeaderFooterLayout {
    /**
     * A layout which will arrange three renderables into a header and footer area of defined size,
      and a content area of flexible size.
     * @class HeaderFooterLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=HeaderFooterLayout.DIRECTION_Y] A direction of HeaderFooterLayout.DIRECTION_X
     * lays your HeaderFooterLayout instance horizontally, and a direction of HeaderFooterLayout.DIRECTION_Y
     * lays it out vertically.
     * @param {Number} [options.headerSize=undefined]  The amount of pixels allocated to the header node
     * in the HeaderFooterLayout instance's direction.
     * @param {Number} [options.footerSize=undefined] The amount of pixels allocated to the footer node
     * in the HeaderFooterLayout instance's direction.
     */
    constructor(options) {
        this.options = Object.create(HeaderFooterLayout.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._entityId = Entity.register(this);

        this.header = new RenderNode();
        this.footer = new RenderNode();
        this.content = new RenderNode();
    }

    /**
     *  When used as a value for your HeaderFooterLayout's direction option, causes it to lay out horizontally.
     *
     *  @attribute DIRECTION_X
     *  @type Number
     *  @static
     *  @default 0
     *  @protected
     */
    static DIRECTION_X = 0;

    /**
     *  When used as a value for your HeaderFooterLayout's direction option, causes it to lay out vertically.
     *
     *  @attribute DIRECTION_Y
     *  @type Number
     *  @static
     *  @default 1
     *  @protected
     */
    static DIRECTION_Y = 1;

    static DEFAULT_OPTIONS = {
        direction: HeaderFooterLayout.DIRECTION_Y,
        headerSize: undefined,
        footerSize: undefined,
        defaultHeaderSize: 0,
        defaultFooterSize: 0
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Object} Render spec for this component
     */
    render() {
        return this._entityId;
    }

    /**
     * Patches the HeaderFooterLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the HeaderFooterLayout instance.
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }

    _resolveNodeSize(node, defaultSize) {
        var nodeSize = node.getSize();
        return nodeSize ? nodeSize[this.options.direction] : defaultSize;
    }

    _outputTransform(offset) {
        if (this.options.direction === HeaderFooterLayout.DIRECTION_X) return Transform.translate(offset, 0, 0);
        else return Transform.translate(0, offset, 0);
    }

    _finalSize(directionSize, size) {
        if (this.options.direction === HeaderFooterLayout.DIRECTION_X) return [directionSize, size[1]];
        else return [size[0], directionSize];
    }

    /**
     * Apply changes from this component to the corresponding document element.
     * This includes changes to classes, styles, size, content, opacity, origin,
     * and matrix transforms.
     *
     * @private
     * @method commit
     * @param {Context} context commit context
     */
    commit(context) {
      var transform = context.transform;
      var origin = context.origin;
      var size = context.size;
      var opacity = context.opacity;

      var headerSize = (this.options.headerSize !== undefined) ? this.options.headerSize : this._resolveNodeSize(this.header, this.options.defaultHeaderSize);
      var footerSize = (this.options.footerSize !== undefined) ? this.options.footerSize : this._resolveNodeSize(this.footer, this.options.defaultFooterSize);
      var contentSize = size[this.options.direction] - headerSize - footerSize;

      if (size) transform = Transform.moveThen([-size[0]*origin[0], -size[1]*origin[1], 0], transform);

      var result = [
          {
              size: this._finalSize(headerSize, size),
              target: this.header.render()
          },
          {
              transform: this._outputTransform(headerSize),
              size: this._finalSize(contentSize, size),
              target: this.content.render()
          },
          {
              transform: this._outputTransform(headerSize + contentSize),
              size: this._finalSize(footerSize, size),
              target: this.footer.render()
          }
      ];

      return {
          transform: transform,
          opacity: opacity,
          size: size,
          target: result
      };
    }
}
