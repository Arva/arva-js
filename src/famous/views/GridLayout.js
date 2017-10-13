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
import ViewSequence from '../core/ViewSequence.js';
import EventHandler from '../core/EventHandler.js';
import Modifier from '../core/Modifier.js';
import OptionsManager from '../core/OptionsManager.js';
import Transitionable from '../transitions/Transitionable.js';
import TransitionableTransform from '../transitions/TransitionableTransform.js';

export default class GridLayout {

    /**
     * A layout which divides a context into several evenly-sized grid cells.
     *   If dimensions are provided, the grid is evenly subdivided with children
     *   cells representing their own context, otherwise the cellSize property is used to compute
     *   dimensions so that items of cellSize will fit.
     * @class GridLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Array.Number} [options.dimensions=[1, 1]] A two value array which specifies the amount of columns
     * and rows in your Gridlayout instance.
     * @param {Array.Number} [options.gutterSize=[0, 0]] A two-value array which specifies size of the
     * horizontal and vertical gutters between items in the grid layout.
     * @param {Transition} [options.transition=false] The transiton that controls the Gridlayout instance's reflow.
     */
    constructor(options) {
        this.options = Object.create(GridLayout.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.id = Entity.register(this);

        this._modifiers = [];
        this._states = [];
        this._contextSizeCache = [0, 0];
        this._dimensionsCache = [0, 0];
        this._activeCount = 0;

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    _reflow(size, cols, rows) {
        let usableSize = [size[0], size[1]];
        usableSize[0] -= this.options.gutterSize[0] * (cols - 1);
        usableSize[1] -= this.options.gutterSize[1] * (rows - 1);

        let rowSize = Math.round(usableSize[1] / rows);
        let colSize = Math.round(usableSize[0] / cols);

        let currY = 0;
        let currX;
        let currIndex = 0;
        for (let i = 0; i < rows; i++) {
            currX = 0;
            for (let j = 0; j < cols; j++) {
                if (this._modifiers[currIndex] === undefined) {
                    this._createModifier(currIndex, [colSize, rowSize], [currX, currY, 0], 1);
                }
                else {
                    this._animateModifier(currIndex, [colSize, rowSize], [currX, currY, 0], 1);
                }

                currIndex++;
                currX += colSize + this.options.gutterSize[0];
            }

            currY += rowSize + this.options.gutterSize[1];
        }

        this._dimensionsCache = [this.options.dimensions[0], this.options.dimensions[1]];
        this._contextSizeCache = [size[0], size[1]];

        this._activeCount = rows * cols;

        for (i = this._activeCount; i < this._modifiers.length; i++) this._animateModifier(i, [Math.round(colSize), Math.round(rowSize)], [0, 0], 0);

        this._eventOutput.emit('reflow');
    }

    _createModifier(index, size, position, opacity) {
        let transitionItem = {
            transform: new TransitionableTransform(Transform.translate.apply(null, position)),
            opacity: new Transitionable(opacity),
            size: new Transitionable(size)
        };

        let modifier = new Modifier({
            transform: transitionItem.transform,
            opacity: transitionItem.opacity,
            size: transitionItem.size
        });

        this._states[index] = transitionItem;
        this._modifiers[index] = modifier;

    }

    _animateModifier(index, size, position, opacity) {
        let currState = this._states[index];

        let currSize = currState.size;
        let currOpacity = currState.opacity;
        let currTransform = currState.transform;

        let transition = this.options.transition;

        currTransform.halt();
        currOpacity.halt();
        currSize.halt();

        currTransform.setTranslate(position, transition);
        currSize.set(size, transition);
        currOpacity.set(opacity, transition);
    }

    static DEFAULT_OPTIONS = {
        dimensions: [1, 1],
        transition: false,
        gutterSize: [0, 0]
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {Object} Render spec for this component
     */
    render() {
        return this.id;
    }

    /**
     * Patches the GridLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the GridLayout instance.
     */
    setOptions(options) {
        return this.optionsManager.setOptions(options);
    }

    /**
     * Sets the collection of renderables under the Gridlayout instance's control.
     *
     * @method sequenceFrom
     * @param {Array|ViewSequence} sequence Either an array of renderables or a Famous viewSequence.
     */
    sequenceFrom(sequence) {
        if (sequence instanceof Array) sequence = new ViewSequence(sequence);
        this.sequence = sequence;
    }

    /**
     * Returns the size of the grid layout.
     *
     * @method getSize
     * @return {Array} Total size of the grid layout.
     */
    getSize() {
      return this._contextSizeCache;
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
        let transform = context.transform;
        let opacity = context.opacity;
        let origin = context.origin;
        let size = context.size;

        let cols = this.options.dimensions[0];
        let rows = this.options.dimensions[1];

        if (size[0] !== this._contextSizeCache[0] || size[1] !== this._contextSizeCache[1] || cols !== this._dimensionsCache[0] || rows !== this._dimensionsCache[1]) {
            this._reflow(size, cols, rows);
        }

        let sequence = this.sequence;
        let result = [];
        let currIndex = 0;
        while (sequence && (currIndex < this._modifiers.length)) {
            let item = sequence.get();
            let modifier = this._modifiers[currIndex];
            if (currIndex >= this._activeCount && this._states[currIndex].opacity.isActive()) {
                this._modifiers.splice(currIndex, 1);
                this._states.splice(currIndex, 1);
            }
            if (item) {
                result.push(
                    modifier.modify({
                        origin: origin,
                        target: item.render()
                    })
                );
            }
            sequence = sequence.getNext();
            currIndex++;
        }

        if (size) transform = Transform.moveThen([-size[0]*origin[0], -size[1]*origin[1], 0], transform);
        return {
            transform: transform,
            opacity: opacity,
            size: size,
            target: result
        };
    }
}
