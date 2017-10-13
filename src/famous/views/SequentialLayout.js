/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */
import OptionsManager from '../core/OptionsManager.js';
import Entity from '../core/Entity.js';
import Transform from '../core/Transform.js';
import ViewSequence from '../core/ViewSequence.js';
import Utility from '../utilities/Utility.js';

export default class SequentialLayout {
    /**
     * SequentialLayout will lay out a collection of renderables sequentially in the specified direction.
     * @class SequentialLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=Utility.Direction.Y] Using the direction helper found in the famous Utility
     * module, this option will lay out the SequentialLayout instance's renderables either horizontally
     * (x) or vertically (y). Utility's direction is essentially either zero (X) or one (Y), so feel free
     * to just use integers as well.
     */
    constructor(options) {
        this._items = null;
        this._size = null;
        this._outputFunction = SequentialLayout.DEFAULT_OUTPUT_FUNCTION;

        this.options = Utility.clone(this.constructor.DEFAULT_OPTIONS || SequentialLayout.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);

        this.id = Entity.register(this);
        this.cachedSize = [undefined, undefined];

        if (options) this.setOptions(options);
    }

    static DEFAULT_OPTIONS = {
        direction: Utility.Direction.Y,
        itemSpacing: 0
    }

    static DEFAULT_OUTPUT_FUNCTION(input, offset, index) {
        let transform = (this.options.direction === Utility.Direction.X) ? Transform.translate(offset, 0) : Transform.translate(0, offset);
        return {
            size: this.cachedSize,
            transform: transform,
            target: input.render()
        };
    }

    /**
     * Returns the width and the height of the SequentialLayout instance.
     *
     * @method getSize
     * @return {Array} A two value array of the SequentialLayout instance's current width and height (in that order).
     */
    function getSize() {
        if (!this._size) this.render(); // hack size in
        return this._size;
    }

    /**
     * Sets the collection of renderables under the SequentialLayout instance's control.
     *
     * @method sequenceFrom
     * @param {Array|ViewSequence} items Either an array of renderables or a Famous viewSequence.
     * @chainable
     */
    sequenceFrom(items) {
        if (items instanceof Array) items = new ViewSequence(items);
        this._items = items;
        return this;
    }

    /**
     * Patches the SequentialLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the SequentialLayout instance.
     * @chainable
     */
    setOptions(options) {
        this.optionsManager.setOptions.apply(this.optionsManager, arguments);
        return this;
    }

    /**
     * setOutputFunction is used to apply a user-defined output transform on each processed renderable.
     *  For a good example, check out SequentialLayout's own DEFAULT_OUTPUT_FUNCTION in the code.
     *
     * @method setOutputFunction
     * @param {Function} outputFunction An output processer for each renderable in the SequentialLayout
     * instance.
     * @chainable
     */
    setOutputFunction(outputFunction) {
        this._outputFunction = outputFunction;
        return this;
    }

    /**
     * Return the id of the component
     *
     * @private
     * @method render
     * @return {number} id of the SequentialLayout
     */
    render() {
        return this.id;
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method commit
     * @param {Object} parentSpec parent render spec
     * @return {Object} Render spec for this component
     */
    commit(parentSpec) {
        let length             = 0;
        let secondaryDirection = this.options.direction ^ 1;
        let currentNode        = this._items;
        let item               = null;
        let itemSize           = [];
        let output             = {};
        let result             = [];
        let i                  = 0;

        this._size = [0, 0];
        this.cachedSize = parentSpec.size;

        while (currentNode) {
            item = currentNode.get();
            if (!item) break;

            if (item.getSize) itemSize = item.getSize();

            output = this._outputFunction.call(this, item, length, i++);
            result.push(output);

            if (itemSize) {
                if (itemSize[this.options.direction]) length += itemSize[this.options.direction];
                if (itemSize[secondaryDirection] > this._size[secondaryDirection]) this._size[secondaryDirection] = itemSize[secondaryDirection];
                if (itemSize[secondaryDirection] === 0) this._size[secondaryDirection] = undefined;
            }

            currentNode = currentNode.getNext();

            if (this.options.itemSpacing && currentNode) length += this.options.itemSpacing;
        }

        this._size[this.options.direction] = length;

        return {
            transform: parentSpec.transform,
            origin: parentSpec.origin,
            opacity: parentSpec.opacity,
            size: this.getSize(),
            target: result
        };
    }
}
