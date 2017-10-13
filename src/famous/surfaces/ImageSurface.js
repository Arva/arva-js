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
import DOMBuffer from '../core/DOMBuffer.js';

export default class ImageSurface extends Surface {

  elementType = 'img';
  elementClass = 'famous-surface';

    /**
     * A surface containing image content.
     *   This extends the Surface class.
     *
     * @class ImageSurface
     *
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     */
    constructor(options) {
      super(...arguments);
      this._imageUrl = undefined;
      this.on('load', ()=> {
        if(this.size && (this.size[0] === true || this.size[1] === true)){
          this._eventOutput.emit('resize');
        }
      });
    }

    static urlCache = [];
    static countCache = [];
    static nodeCache = [];
    static cacheEnabled = true;

    static enableCache = function enableCache() {
        cacheEnabled = true;
    }

    static disableCache = function disableCache() {
        cacheEnabled = false;
    }

    static clearCache = function clearCache() {
        urlCache = [];
        countCache = [];
        nodeCache = [];
    }

    static getCache = function getCache() {
        return {
            urlCache: urlCache,
            countCache: countCache,
            nodeCache: nodeCache
        };
    }

    /**
     * Set content URL.  This will cause a re-rendering.
     * @method setContent
     * @param {string} imageUrl
     */
    setContent(imageUrl) {
        let urlIndex = urlCache.indexOf(this._imageUrl);
        if (urlIndex !== -1) {
            if (countCache[urlIndex] === 1) {
                urlCache.splice(urlIndex, 1);
                countCache.splice(urlIndex, 1);
                nodeCache.splice(urlIndex, 1);
            } else {
                countCache[urlIndex]--;
            }
        }

        urlIndex = urlCache.indexOf(imageUrl);
        if (urlIndex === -1) {
            urlCache.push(imageUrl);
            countCache.push(1);
        }
        else {
            countCache[urlIndex]++;
        }

        this._imageUrl = imageUrl;
        this._contentDirty = true;
    }

    /**
     * Place the document element that this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    deploy(target) {
        let urlIndex = urlCache.indexOf(this._imageUrl);
        if (nodeCache[urlIndex] === undefined && cacheEnabled) {
            let img = new Image();
            img.src = this._imageUrl || '';
            nodeCache[urlIndex] = img;
        }
        DOMBuffer.assignProperty(target, 'src', this._imageUrl || '');
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
      DOMBuffer.assignProperty(target, 'src', '');
    }
}
