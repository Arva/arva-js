/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

export default class Utility {

    /**
     * Table of direction array positions
     *
     * @property {object} Direction
     * @final
     */
    static Direction = {
        X: 0,
        Y: 1,
        Z: 2
    }

    /**
     * Return wrapper around callback function. Once the wrapper is called N
     *   times, invoke the callback function. Arguments and scope preserved.
     *
     * @method after
     *
     * @param {number} count number of calls before callback function invoked
     * @param {Function} callback wrapped callback function
     *
     * @return {function} wrapped callback with coundown feature
     */
    static after(count, callback) {
        var counter = count;
        return function() {
            counter--;
            if (counter === 0) callback.apply(this, arguments);
        };
    }

    /**
     * Load a URL and return its contents in a callback
     *
     * @method loadURL
     *
     * @param {string} url URL of object
     * @param {function} callback callback to dispatch with content
     */
    static loadURL(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function onreadystatechange() {
            if (this.readyState === 4) {
                if (callback) callback(this.responseText);
            }
        };
        xhr.open('GET', url);
        xhr.send();
    }

    /**
     * Create a document fragment from a string of HTML
     *
     * @method createDocumentFragmentFromHTML
     *
     * @param {string} html HTML to convert to DocumentFragment
     *
     * @return {DocumentFragment} DocumentFragment representing input HTML
     */
    static createDocumentFragmentFromHTML(html) {
        var element = document.createElement('div');
        element.innerHTML = html;
        var result = document.createDocumentFragment();
        while (element.hasChildNodes()) result.appendChild(element.firstChild);
        return result;
    }

    /*
     *  Deep clone an object.
     *  @param b {Object} Object to clone
     *  @return a {Object} Cloned object.
     */
    static clone(b) {
        var a;
        if (typeof b === 'object') {
            a = (b instanceof Array) ? [] : {};
            for (var key in b) {
                if (typeof b[key] === 'object' && b[key] !== null) {
                    if (b[key] instanceof Array) {
                        a[key] = new Array(b[key].length);
                        for (var i = 0; i < b[key].length; i++) {
                            a[key][i] = Utility.clone(b[key][i]);
                        }
                    }
                    else {
                      a[key] = Utility.clone(b[key]);
                    }
                }
                else {
                    a[key] = b[key];
                }
            }
        }
        else {
            a = b;
        }
        return a;
    }
}
