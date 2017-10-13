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
import Group from '../core/Group.js';
import OptionsManager from '../core/OptionsManager.js';
import Transform from '../core/Transform.js';
import Utility from '../utilities/Utility.js';
import ViewSequence from '../core/ViewSequence.js';
import EventHandler from '../core/EventHandler.js';

export default class Scroller {
    /**
     * Scroller lays out a collection of renderables, and will browse through them based on
     * accessed position. Scroller also broadcasts an 'edgeHit' event, with a position property of the location of the edge,
     * when you've hit the 'edges' of it's renderable collection.
     * @class Scroller
     * @constructor
      * @event error
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=Utility.Direction.Y] Using the direction helper found in the famous Utility
     * module, this option will lay out the Scroller instance's renderables either horizontally
     * (x) or vertically (y). Utility's direction is essentially either zero (X) or one (Y), so feel free
     * to just use integers as well.
     * @param {Number} [clipSize=undefined] The size of the area (in pixels) that Scroller will display content in.
     * @param {Number} [margin=undefined] The size of the area (in pixels) that Scroller will process renderables' associated calculations in.
     */
    constructor(options) {
        this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this._optionsManager.setOptions(options);

        this._node = null;
        this._position = 0;

        // used for shifting nodes
        this._positionOffset = 0;

        this._positionGetter = null;
        this._outputFunction = null;
        this._masterOutputFunction = null;
        this.outputFrom();

        this._onEdge = 0; // -1 for top, 1 for bottom

        this.group = new Group();
        this.group.add({render: this._innerRender});

        this._entityId = Entity.register(this);
        this._size = [undefined, undefined];
        this._contextSize = [undefined, undefined];

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    static DEFAULT_OPTIONS = {
        direction: Utility.Direction.Y,
        margin: 0,
        clipSize: undefined,
        groupScroll: false
    }

    static EDGE_TOLERANCE = 0; //slop for detecting passing the edge

    _sizeForDir(size) {
        if (!size) size = this._contextSize;
        var dimension = this.options.direction;
        return (size[dimension] === undefined) ? this._contextSize[dimension] : size[dimension];
    }

    _output(node, offset, target) {
        var size = node.getSize ? node.getSize() : this._contextSize;
        var transform = this._outputFunction(offset);
        target.push({transform: transform, target: node.render()});
        return this._sizeForDir(size);
    }

    _getClipSize() {
        if (this.options.clipSize !== undefined) return this.options.clipSize;
        if (this._contextSize[this.options.direction] > this.getCumulativeSize()[this.options.direction]) {
            return this._sizeForDir(this.getCumulativeSize());
        } else {
            return this._sizeForDir(this._contextSize);
        }
    }

    /**
    * Returns the cumulative size of the renderables in the view sequence
    * @method getCumulativeSize
    * @return {array} a two value array of the view sequence's cumulative size up to the index.
    */
    getCumulativeSize(index) {
        if (index === undefined) index = this._node._.cumulativeSizes.length - 1;
        return this._node._.getSize(index);
    }

    /**
     * Patches the Scroller instance's options with the passed-in ones.
     * @method setOptions
     * @param {Options} options An object of configurable options for the Scroller instance.
     */
    setOptions(options) {
        if (options.groupScroll !== this.options.groupScroll) {
            if (options.groupScroll)
                this.group.pipe(this._eventOutput);
            else
                this.group.unpipe(this._eventOutput);
        }
        this._optionsManager.setOptions(options);
    }

    /**
     * Tells you if the Scroller instance is on an edge.
     * @method onEdge
     * @return {Boolean} Whether the Scroller instance is on an edge or not.
     */
    onEdge() {
        return this._onEdge;
    }

    /**
     * Allows you to overwrite the way Scroller lays out it's renderables. Scroller will
     * pass an offset into the function. By default the Scroller instance just translates each node
     * in it's direction by the passed-in offset.
     * Scroller will translate each renderable down
     * @method outputFrom
     * @param {Function} fn A function that takes an offset and returns a transform.
     * @param {Function} [masterFn]
     */
    outputFrom(fn, masterFn) {
        if (!fn) {
            fn = function(offset) {
                return (this.options.direction === Utility.Direction.X) ? Transform.translate(offset, 0) : Transform.translate(0, offset);
            }.bind(this);
            if (!masterFn) masterFn = fn;
        }
        this._outputFunction = fn;
        this._masterOutputFunction = masterFn ? masterFn : function(offset) {
            return Transform.inverse(fn(-offset));
        };
    }

    /**
     * The Scroller instance's method for reading from an external position. Scroller uses
     * the external position to actually scroll through it's renderables.
     * @method positionFrom
     * @param {Getter} position Can be either a function that returns a position,
     * or an object with a get method that returns a position.
     */
    positionFrom(position) {
        if (position instanceof Function) this._positionGetter = position;
        else if (position && position.get) this._positionGetter = position.get.bind(position);
        else {
            this._positionGetter = null;
            this._position = position;
        }
        if (this._positionGetter) this._position = this._positionGetter.call(this);
    }

    /**
     * Sets the collection of renderables under the Scroller instance's control.
     *
     * @method sequenceFrom
     * @param node {Array|ViewSequence} Either an array of renderables or a Famous viewSequence.
     * @chainable
     */
    sequenceFrom(node) {
        if (node instanceof Array) node = new ViewSequence({array: node});
        this._node = node;
        this._positionOffset = 0;
    }

    /**
     * Returns the width and the height of the Scroller instance.
     *
     * @method getSize
     * @return {Array} A two value array of the Scroller instance's current width and height (in that order).
     */
    getSize(actual) {
        return actual ? this._contextSize : this._size;
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    render() {
        if (!this._node) return null;
        if (this._positionGetter) this._position = this._positionGetter.call(this);
        return this._entityId;
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
        var opacity = context.opacity;
        var origin = context.origin;
        var size = context.size;

        // reset edge detection on size change
        if (!this.options.clipSize && (size[0] !== this._contextSize[0] || size[1] !== this._contextSize[1])) {
            this._onEdge = 0;
            this._contextSize[0] = size[0];
            this._contextSize[1] = size[1];

            if (this.options.direction === Utility.Direction.X) {
                this._size[0] = this._getClipSize();
                this._size[1] = undefined;
            }
            else {
                this._size[0] = undefined;
                this._size[1] = this._getClipSize();
            }
        }

        var scrollTransform = this._masterOutputFunction(-this._position);

        return {
            transform: Transform.multiply(transform, scrollTransform),
            size: size,
            opacity: opacity,
            origin: origin,
            target: this.group.render()
        };
    }

    _innerRender() {
        var size = null;
        var position = this._position;
        var result = [];

        var offset = -this._positionOffset;
        var clipSize = this._getClipSize();
        var currNode = this._node;
        while (currNode && offset - position < clipSize + this.options.margin) {
            offset += this._output(currNode, offset, result);
            currNode = currNode.getNext ? currNode.getNext() : null;
        }

        var sizeNode = this._node;
        var nodesSize = this._sizeForDir(sizeNode.getSize());
        if (offset < clipSize) {
            while (sizeNode && nodesSize < clipSize) {
                sizeNode = sizeNode.getPrevious();
                if (sizeNode) nodesSize += this._sizeForDir(sizeNode.getSize());
            }
            sizeNode = this._node;
            while (sizeNode && nodesSize < clipSize) {
                sizeNode = sizeNode.getNext();
                if (sizeNode) nodesSize += this._sizeForDir(sizeNode.getSize());
            }
        }

        if (!currNode && offset - position < clipSize - EDGE_TOLERANCE) {
            if (this._onEdge !== 1){
                this._onEdge = 1;
                this._eventOutput.emit('onEdge', {
                    position: offset - clipSize
                });
            }
        }
        else if (!this._node.getPrevious() && position < -EDGE_TOLERANCE) {
            if (this._onEdge !== -1) {
                this._onEdge = -1;
                this._eventOutput.emit('onEdge', {
                    position: 0
                });
            }
        }
        else {
            if (this._onEdge !== 0){
                this._onEdge = 0;
                this._eventOutput.emit('offEdge');
            }
        }

        // backwards
        currNode = (this._node && this._node.getPrevious) ? this._node.getPrevious() : null;
        offset = -this._positionOffset;
        if (currNode) {
            size = currNode.getSize ? currNode.getSize() : this._contextSize;
            offset -= this._sizeForDir(size);
        }

        while (currNode && ((offset - position) > -(clipSize + this.options.margin))) {
            this._output(currNode, offset, result);
            currNode = currNode.getPrevious ? currNode.getPrevious() : null;
            if (currNode) {
                size = currNode.getSize ? currNode.getSize() : this._contextSize;
                offset -= this._sizeForDir(size);
            }
        }

        return result;
    }
}
