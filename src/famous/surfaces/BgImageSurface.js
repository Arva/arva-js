/* We respect the original MIT open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Hein Rutjes, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

/**
 * BgImageSurface adds support for sizing-strategies such as AspectFit and AspectFill for displaying images with famo.us.
 * It uses a 'div' with a background-image rather than a 'img' tag.
 *
 * Can be used as a drop-in replacement for ImageSurface, in case the the size of the div is not derived
 * from the image.
 *
 * @module
 */

import Surface from '../core/Surface.js';
import DOMBuffer from '../core/DOMBuffer.js';

export default class BgImageSurface extends Surface {
  /**
   * @enum
   * @alias module:BgImageSurface.SizeMode
   */
  static SizeMode = {
    AUTO: 'auto',
    FILL: '100% 100%',
    ASPECTFILL: 'cover',
    ASPECTFIT: 'contain'
  }

  /**
   * @enum
   * @alias module:BgImageSurface.PositionMode
   */
  static PositionMode = {
    CENTER: 'center center',
    LEFT: 'left center',
    RIGHT: 'right center',
    TOP: 'center top',
    BOTTOM: 'center bottom',
    TOPLEFT: 'left top',
    TOPRIGHT: 'right top',
    BOTTOMLEFT: 'left bottom',
    BOTTOMRIGHT: 'right bottom'
  }

  /**
   * @enum
   * @alias module:BgImageSurface.RepeatMode
   */
  static RepeatMode = {
    NONE: 'no-repeat',
    VERTICAL: 'repeat-x',
    HORIZONTAL: 'repeat-y',
    BOTH: 'repeat'
  }

  elementType = 'div';
  elementClass = 'famous-surface';

  /**
   * @class
   * @param {Object} options Options.
   * @param {String} [options.content] Image-url.
   * @param {SizeMode|String} [options.sizeMode] Size-mode to use.
   * @param {PositionMode|String} [options.positionMode] Position-mode to use.
   * @param {RepeatMode|String} [options.repeatMode] Repeat-mode to use.
   * @alias module:BgImageSurface
   */
  constructor(options) {
    super(...arguments);
    this.content = undefined;


    this._updateProperties();
  }

  setNewOptions(options) {
    super.setNewOptions(options);
    this._updateProperties();
  }

  /**
   * Update the css-styles on the div.
   *
   * @private
   */
  _updateProperties() {
    let {options} = this;
    this._imageUrl = options ? options.content : undefined;
    this._sizeMode = (options && options.sizeMode) ? options.sizeMode : SizeMode.FILL;
    this._positionMode = (options && options.positionMode) ? options.positionMode : PositionMode.CENTER;
    this._repeatMode = (options && options.repeatMode) ? options.repeatMode : RepeatMode.NONE;
    let props = this.getProperties();
    if (this._imageUrl) {
      let imageUrl = this._imageUrl;
      // url encode '(' and ')'
      if ((imageUrl.indexOf('(') >= 0) || (imageUrl.indexOf(')') >= 0)) {
        imageUrl = imageUrl.split('(').join('%28');
        imageUrl = imageUrl.split(')').join('%29');
      }
      props.backgroundImage = 'url(' + imageUrl + ')';
    }
    else {
      props.backgroundImage = '';
    }
    props.backgroundSize = this._sizeMode;
    props.backgroundPosition = this._positionMode;
    props.backgroundRepeat = this._repeatMode;
    this.setProperties(props);
  }

  /**
   * @param {String} imageUrl Image-url, when set will cause re-rendering
   */
  setContent(imageUrl) {
    this.options.content = imageUrl;
    this._contentDirty = true;
    this._updateProperties();
  }

  /**
   * @return {String} Image-url
   */
  getContent() {
    return this._imageUrl;
  }

  /**
   * @param {SizeMode|String} sizeMode Sizing-mode, when set will cause re-rendering
   */
  setSizeMode(sizeMode) {
    this._sizeMode = sizeMode;
    this._updateProperties();
  }

  /**
   * @return {SizeMode|String} Size-mode
   */
  getSizeMode() {
    return this._sizeMode;
  };

  /**
   * @param {PositionMode|String} positionMode Position-mode, when set will cause re-rendering
   */
  setPositionMode(positionMode) {
    this._positionMode = positionMode;
    this._updateProperties();
  }

  /**
   * @return {RepeatMode|String} Position-mode
   */
  getPositionMode() {
    return this._positionMode;
  };

  /**
   * @param {RepeatMode|String} repeatMode Repeat-mode, when set will cause re-rendering
   */
  setRepeatMode(repeatMode) {
    this._repeatMode = repeatMode;
    this._updateProperties();
  }

  /**
   * @return {RepeatMode|String} Repeat-mode
   */
  getRepeatMode() {
    return this._repeatMode;
  }

  /**
   * Place the document element that this component manages into the document.
   *
   * NOTE: deploy and recall were added because famo.us removed the background-image
   * after the surface was removed/re-added from the DOM.
   *
   * @private
   * @param {Node} target document parent of this container
   */
  deploy(target) {
    DOMBuffer.assignProperty(target, 'innerHTML', '');
    if (this._imageUrl) {
      DOMBuffer.assignProperty(target.style, 'backgroundImage', 'url(' + this._imageUrl + ')');
    }
  }


  /**
   * Remove this component and contained content from the document
   *
   * NOTE: deploy and recall were added because famo.us removed the background-image
   * after the surface was removed/re-added from the DOM.
   *
   * @private
   * @param {Node} target node to which the component was deployed
   */
  recall(target) {
    DOMBuffer.assignProperty(target.style, 'backgroundImage', '');
  }
}
