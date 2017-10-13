/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import ContainerSurface from '../surfaces/ContainerSurface.js';
import EventHandler from '../core/EventHandler.js';
import Scrollview from './Scrollview.js';
import Utility from '../utilities/Utility.js';
import OptionsManager from '../core/OptionsManager.js';

export default class ScrollContainer {
    /**
     * A Container surface with a scrollview automatically added. The convenience of ScrollContainer lies in
     * being able to clip out portions of the associated scrollview that lie outside the bounding surface,
     * and in being able to move the scrollview more easily by applying modifiers to the parent container
     * surface.
     * @class ScrollContainer
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Options} [options.container=undefined] Options for the ScrollContainer instance's surface.
     * @param {Options} [options.scrollview={direction:Utility.Direction.X}]  Options for the ScrollContainer instance's scrollview.
     */
    constructor(options) {
        this.options = Object.create(ScrollContainer.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);

        if (options) this.setOptions(options);

        this.container = new ContainerSurface(this.options.container);
        this.scrollview = new Scrollview(this.options.scrollview);

        this.container.add(this.scrollview);

        this._eventInput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);

        this._eventInput.pipe(this.scrollview);

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.container.pipe(this._eventOutput);
        this.scrollview.pipe(this._eventOutput);
    }


    static DEFAULT_OPTIONS = {
        container: {
            properties: {overflow : 'hidden'}
        },
        scrollview: {}
    }

    /**
     * Patches the ScrollContainer instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the ScrollContainer instance.
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }

    /**
     * Sets the collection of renderables under the ScrollContainer instance scrollview's control.
     *
     * @method sequenceFrom
     * @param {Array|ViewSequence} sequence Either an array of renderables or a Famous ViewSequence.
     */
    sequenceFrom() {
        return this.scrollview.sequenceFrom.apply(this.scrollview, arguments);
    }

    /**
     * Returns the width and the height of the ScrollContainer instance.
     *
     * @method getSize
     * @return {Array} A two value array of the ScrollContainer instance's current width and height (in that order).
     */
    getSize() {
        return this.container.getSize.apply(this.container, arguments);
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    render() {
        return this.container.render();
    }
}
