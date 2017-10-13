/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import View from '../core/View.js';
import Entity from '../core/Entity.js';
import Transform from '../core/Transform.js';

export default class SizeAwareView extends View {
    /*
     *  A View that keeps track of the parent's resize, passed down from the
     *  commit function. This can be anything higher in the render tree,
     *  either the engine, or a modifier with a size, or a custom render function
     *  that changes the size.
     *
     *  Views that inherit from SizeAwareView have a .getParentSize() method
     *  that can be queried at any point as well as a 'parentResize' event on
     *  the View's '_eventInput' that can be listened to for immediate notifications
     *  of size changes.
     *
     *  @class SizeAwareView
     */
    constructor() {
        super(...arguments);
        this._id = Entity.register(this);
        this._parentSize = []; //Store reference to parent size.
    }

    /*
     * Commit the content change from this node to the document.
     * Keeps track of parent's size and fires 'parentResize' event on
     * eventInput when it changes.
     *
     * @private
     * @method commit
     * @param {Object} context
     */
    commit(context) {
        var transform = context.transform;
        var opacity = context.opacity;
        var origin = context.origin;

        // Update the reference to view's parent size if it's out of sync with
        // the commit's context. Notify the element of the resize.
        if (!this._parentSize || this._parentSize[0] !== context.size[0] ||
            this._parentSize[1] !== context.size[1]) {
            this._parentSize[0] = context.size[0];
            this._parentSize[1] = context.size[1];
            this._eventInput.emit('parentResize', this._parentSize);
            if (this.onResize) this.onResize(this._parentSize);
        }

        if (this._parentSize) {
          transform = Transform.moveThen([
              -this._parentSize[0]*origin[0],
              -this._parentSize[1]*origin[1],
              0], transform);
        }

        return {
            transform: transform,
            opacity: opacity,
            size: this._parentSize,
            target: this._node.render()
        };
    }

    /*
     * Get view's parent size.
     * @method getSize
     */
    getParentSize() {
        return this._parentSize;
    }

    /*
     * Actual rendering happens in commit.
     * @method render
     */
    render() {
        return this._id;
    }
}
