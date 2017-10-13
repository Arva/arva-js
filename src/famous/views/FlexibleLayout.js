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
import Transform from '../core/Transform.js';
import OptionsManager from '../core/OptionsManager.js';
import EventHandler from '../core/EventHandler.js';
import Transitionable from '../transitions/Transitionable.js';

export default class FlexibleLayout {
    /**
     * A layout which divides a context into sections based on a proportion
     *   of the total sum of ratios.  FlexibleLayout can either lay renderables
     *   out vertically or horizontally.
     * @class FlexibleLayout
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=0] Direction the FlexibleLayout instance should lay out renderables.
     * @param {Transition} [options.transition=false] The transiton that controls the FlexibleLayout instance's reflow.
     * @param {Ratios} [options.ratios=[]] The proportions for the renderables to maintain
     */
    constructor(options) {
        this.options = Object.create(FlexibleLayout.DEFAULT_OPTIONS);
        this.optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this.id = Entity.register(this);

        this._ratios = new Transitionable(this.options.ratios);
        this._nodes = [];
        this._size = [0, 0];

        this._cachedDirection = null;
        this._cachedLengths = [];
        this._cachedTransforms = null;
        this._ratiosDirty = false;

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);
    }

    static DIRECTION_X = 0;
    static DIRECTION_Y = 1;

    static DEFAULT_OPTIONS = {
        direction: FlexibleLayout.DIRECTION_X,
        transition: false,
        ratios : []
    }

    _reflow(ratios, length, direction) {
        let currTransform;
        let translation = 0;
        let flexLength = length;
        let ratioSum = 0;
        let ratio;
        let node;
        let i;

        this._cachedLengths = [];
        this._cachedTransforms = [];

        for (i = 0; i < ratios.length; i++){
            ratio = ratios[i];
            node = this._nodes[i];

            if (typeof ratio !== 'number')
                flexLength -= node.getSize()[direction] || 0;
            else
                ratioSum += ratio;
        }

        for (i = 0; i < ratios.length; i++) {
            node = this._nodes[i];
            ratio = ratios[i];

            length = (typeof ratio === 'number')
                ? flexLength * ratio / ratioSum
                : node.getSize()[direction];

            currTransform = (direction === FlexibleLayout.DIRECTION_X)
                ? Transform.translate(translation, 0, 0)
                : Transform.translate(0, translation, 0);

            this._cachedTransforms.push(currTransform);
            this._cachedLengths.push(length);

            translation += length;
        }
    }

    _trueSizedDirty(ratios, direction) {
        for (let i = 0; i < ratios.length; i++) {
            if (typeof ratios[i] !== 'number') {
                if (this._nodes[i].getSize()[direction] !== this._cachedLengths[i])
                    return true;
            }
        }

        return false;
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
     * Patches the FlexibleLayouts instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the FlexibleLayout instance.
     */
    setOptions(options) {
        this.optionsManager.setOptions(options);
    }

    /**
     * Sets the collection of renderables under the FlexibleLayout instance's control.  Also sets
     * the associated ratio values for sizing the renderables if given.
     *
     * @method sequenceFrom
     * @param {Array} sequence An array of renderables.
     */
    sequenceFrom(sequence) {
        this._nodes = sequence;

        if (this._ratios.get().length === 0) {
            let ratios = [];
            for (let i = 0; i < this._nodes.length; i++) ratios.push(1);
            this.setRatios(ratios);
        }
    }

    /**
     * Sets the associated ratio values for sizing the renderables.
     *
     * @method setRatios
     * @param {Array} ratios Array of ratios corresponding to the percentage sizes each renderable should be
     */
    setRatios(ratios, transition, callback) {
        if (transition === undefined) transition = this.options.transition;
        let currRatios = this._ratios;
        if (currRatios.get().length === 0) transition = undefined;
        if (currRatios.isActive()) currRatios.halt();
        currRatios.set(ratios, transition, callback);
        this._ratiosDirty = true;
    }

    /**
     * Gets the size of the context the FlexibleLayout exists within.
     *
     * @method getSize
     *
     * @return {Array} Size of the FlexibleLayout in pixels [width, height]
     */
    getSize() {
        return this._size;
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
        let parentSize = context.size;
        let parentTransform = context.transform;
        let parentOrigin = context.origin;
        let parentOpacity = context.opacity;

        let ratios = this._ratios.get();
        let direction = this.options.direction;
        let length = parentSize[direction];
        let size;

        if (length !== this._size[direction] || this._ratiosDirty || this._ratios.isActive() || direction !== this._cachedDirection || this._trueSizedDirty(ratios, direction)) {
            this._reflow(ratios, length, direction);

            if (length !== this._size[direction]) {
                this._size[0] = parentSize[0];
                this._size[1] = parentSize[1];
            }

            if (direction !== this._cachedDirection) this._cachedDirection = direction;
            if (this._ratiosDirty) this._ratiosDirty = false;
        }

        let result = [];
        for (let i = 0; i < ratios.length; i++) {
            size = [undefined, undefined];
            length = this._cachedLengths[i];
            size[direction] = length;
            result.push({
                transform : this._cachedTransforms[i],
                size: size,
                target : this._nodes[i].render()
            });
        }

        if (parentSize && (parentOrigin[0] !== 0 && parentOrigin[1] !== 0))
            parentTransform = Transform.moveThen([-parentSize[0]*parentOrigin[0], -parentSize[1]*parentOrigin[1], 0], parentTransform);

        return {
            transform: parentTransform,
            size: parentSize,
            opacity: parentOpacity,
            target: result
        };
    }
}
