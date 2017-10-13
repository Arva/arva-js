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
import EventHandler from '../core/EventHandler.js';
import OptionsManager from '../core/OptionsManager.js';


export default class ContextualView {

    /**
     * ContextualView is an interface for creating views that need to
     *   be aware of their parent's transform, size, and/or origin.
     *   Consists of a OptionsManager paired with an input EventHandler
     *   and an output EventHandler. Meant to be extended by the developer.
     * @class ContextualView
     * @constructor
     * @param {Options} [options] An object of configurable options.
     *
     * Deprecated: Use SizeAwareView when creating views that need to be
     * aware of their parent's size.
     * @deprecated
     */
    constructor(options) {
        this.options = Object.create(this.constructor.DEFAULT_OPTIONS || ContextualView.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._id = Entity.register(this);
    }

    static DEFAULT_OPTIONS = {};

    /**
     * Patches the ContextualLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the ContextualLayout instance.
     */
    setOptions(options) {
        return this._optionsManager.setOptions(options);
    }

    /**
     * Returns ContextualLayout instance's options.
     *
     * @method setOptions
     * @param {string} key
     * @return {Options} options The instance's object of configurable options.
     */
    getOptions(key) {
        return this._optionsManager.getOptions(key);
    }

    /**
     * Return the registers Entity id for the ContextualView.
     *
     * @private
     * @method render
     * @return {Number} Registered Entity id
     */
    render() {
        return this._id;
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
    commit(context) {}

}
