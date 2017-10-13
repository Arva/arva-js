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

export default class VideoSurface extends Surface {

  elementType = 'video';
  elementClass = 'famous-surface';

  static DEFAULT_OPTIONS = {
      autoplay: false
  }

  /**
     * Creates a famous surface containing video content. Currently adding
     *   controls and manipulating the video are not supported through the
     *   surface interface, but can be accomplished via standard JavaScript
     *   manipulation of the video DOM element.
     *   This extends the Surface class.
     *
     * @class VideoSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] default option overrides
     * @param {Array.Number} [options.size] [width, height] in pixels
     * @param {Array.string} [options.classes] CSS classes to set on inner content
     * @param {Array} [options.properties] string dictionary of HTML attributes to set on target div
     * @param {String} [options.src] videoUrl URL
     * @param {boolean} [options.autoplay] autoplay
     */
    constructor(options) {
        super(...arguments);
        this._videoUrl = undefined;
        this.options = Object.create(VideoSurface.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);
    }

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options
     * @param {Boolean} [options.autoplay] HTML autoplay
     */
    setOptions(options) {
        if (options.size) this.setSize(options.size);
        if (options.classes) this.setClasses(options.classes);
        if (options.properties) this.setProperties(options.properties);
        if (options.autoplay) this.options.autoplay = options.autoplay;
        if (options.src) {
            this._videoUrl = options.src;
            this._contentDirty = true;
        }
    }

    /**
     * Set url of the video.
     *
     * @method setContent
     * @param {string} videoUrl URL
     */
    setContent(videoUrl) {
        this._videoUrl = videoUrl;
        this._contentDirty = true;
    }

    /**
     * Place the document element this component manages into the document.
     *   Note: In the case of VideoSurface, simply changes the options on the target.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    deploy(target) {
        target.src = this._videoUrl;
        target.autoplay = this.options.autoplay;
    }

    /**
     * Remove this component and contained content from the document.
     *   Note: This doesn't actually remove the <video> element from the
     *   document.
     * @private
     * @method recall
     *
     * @param {Node} target node to which the component was deployed
     */
    recall(target) {
        target.src = '';
    }
}
