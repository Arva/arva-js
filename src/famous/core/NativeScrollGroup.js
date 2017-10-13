/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
* any variations, changes and additions are NPOSL-3 licensed.
*
* @authors Karl Lundfall, Hans van den Akker
* @license NPOSL-3.0
* @copyright Arva 2015-2017
*/

import Group            from './Group.js';
import DOMBuffer        from './DOMBuffer.js';

export default class NativeScrollGroup extends Group {

  elementClass = 'famous-native-scroller';

  /**
   * A Context designed to contain surfaces and set properties
   *   to be applied to all of them at once with native scrolling.
   *   This is primarily used for specific performance improvements in the rendering {{.
     *   Private.
     *
   * @private
   * @class NativeScorllGroup
   * @extends Group
   * @constructor
   * @param {Object} [options] Surface options array (see Surface})
   */
  constructor(options) {
    super(options);

    this.on('deploy', () => {
      if(this._cachedScrollOffset){
        this.setScrollOffset();
      }
    });

  }

  commit(context) {
    this._surfaceSize = context.size;
    super.commit(...arguments);
  }

  /**
   * Sets the scroll offset
   * @param offset. Defaults to the old scroll offset that was set when there wasn't any element.
   */
  setScrollOffset(offset) {
    var element = this._element;
    if (element) {
      DOMBuffer.assignProperty(element, 'scrollTop', offset || this._cachedScrollOffset);
      this._cachedScrollOffset = undefined;
    } else {
      /* Save to cache and set on deploy instead */
      this._cachedScrollOffset = offset;
    }
  }

  /**
   * Hack to force an element redraw that fixes certain bug for elements getting stuck on their current scrollOffset
   */
  forceScrollOffsetInvalidation() {
    var element = this._element;
    if (element) {
      var disp = element.style.display;
      element.style.display = 'none';
      var trick = element.offsetHeight;
      element.style.display = disp;
    }
  }


  getScrollOffset() {
    var element = this._element;
    if (element) {
      return element.scrollTop;
    }
    return 0;
  }

  getMaxScrollOffset() {
    var element = this._element;
    if (element) {
      return element.scrollHeight - this._surfaceSize[1];
    }
    return 0;
  }

  getScrollHeight() {
    return this._element &&  this._element.scrollHeight || 0;
  }

  getScrollOffset() {
    var element = this._element;
    if (element) {
      this.setScrollOffset(element.scrollHeight);
    }
    return 0;
  }
}
