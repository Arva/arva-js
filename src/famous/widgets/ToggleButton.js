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
import EventHandler from '../core/EventHandler.js';
import RenderController from '../views/RenderController.js';


export default class ToggleButton {
    /**
     * A view for transitioning between two surfaces based
     *  on a 'on' and 'off' state
     *
     * @class TabBar
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    constructor(options) {
        this.options = {
            content: ['', ''],
            offClasses: ['off'],
            onClasses: ['on'],
            size: undefined,
            outTransition: {curve: 'easeInOut', duration: 300},
            inTransition: {curve: 'easeInOut', duration: 300},
            toggleMode: ToggleButton.TOGGLE,
            crossfade: true
        };

        this._eventOutput = new EventHandler();
        EventHandler.setOutputHandler(this, this._eventOutput);

        this.offSurface = new Surface();
        this.offSurface.on('click', ()=> {
            if (this.options.toggleMode !== ToggleButton.OFF) this.select();
        });
        this.offSurface.pipe(this._eventOutput);

        this.onSurface = new Surface();
        this.onSurface.on('click', ()=> {
            if (this.options.toggleMode !== ToggleButton.ON) this.deselect();
        });
        this.onSurface.pipe(this._eventOutput);

        this.arbiter = new RenderController({
            overlap : this.options.crossfade
        });

        this.deselect();

        if (options) this.setOptions(options);
    }

    static with() {
      return Surface.with(...arguments);
    }

    static OFF = 0;
    static ON = 1;
    static TOGGLE = 2;

    /**
     * Transition towards the 'on' state and dispatch an event to
     *  listeners to announce it was selected. Accepts an optional
     *  argument, `suppressEvent`, which, if truthy, prevents the
     *  event from being dispatched.
     *
     * @method select
     * @param [suppressEvent] {Boolean} When truthy, prevents the
     *   widget from emitting the 'select' event.
     */
    select(suppressEvent) {
        this.selected = true;
        this.arbiter.show(this.onSurface, this.options.inTransition);
//        this.arbiter.setMode(ToggleButton.ON, this.options.inTransition);
        if (!suppressEvent) {
            this._eventOutput.emit('select');
        }
    }

    /**
     * Transition towards the 'off' state and dispatch an event to
     *  listeners to announce it was deselected. Accepts an optional
     *  argument, `suppressEvent`, which, if truthy, prevents the
     *  event from being dispatched.
     *
     * @method deselect
     * @param [suppressEvent] {Boolean} When truthy, prevents the
     *   widget from emitting the 'deselect' event.
     */
    deselect(suppressEvent) {
        this.selected = false;
        this.arbiter.show(this.offSurface, this.options.outTransition);
        if (!suppressEvent) {
            this._eventOutput.emit('deselect');
        }
    }

    /**
     * Return the state of the button
     *
     * @method isSelected
     *
     * @return {boolean} selected state
     */
    isSelected() {
        return this.selected;
    }

    /**
     * Override the current options
     *
     * @method setOptions
     *
     * @param {object} options JSON
     */
    setOptions(options) {
        if (options.content !== undefined) {
            if (!(options.content instanceof Array))
                options.content = [options.content, options.content];
            this.options.content = options.content;
            this.offSurface.setContent(this.options.content[0]);
            this.onSurface.setContent(this.options.content[1]);
        }
        if (options.offClasses) {
            this.options.offClasses = options.offClasses;
            this.offSurface.setClasses(this.options.offClasses);
        }
        if (options.onClasses) {
            this.options.onClasses = options.onClasses;
            this.onSurface.setClasses(this.options.onClasses);
        }
        if (options.size !== undefined) {
            this.options.size = options.size;
            this.onSurface.setSize(this.options.size);
            this.offSurface.setSize(this.options.size);
        }
        if (options.toggleMode !== undefined) this.options.toggleMode = options.toggleMode;
        if (options.outTransition !== undefined) this.options.outTransition = options.outTransition;
        if (options.inTransition !== undefined) this.options.inTransition = options.inTransition;
        if (options.crossfade !== undefined) {
            this.options.crossfade = options.crossfade;
            this.arbiter.setOptions({overlap: this.options.crossfade});
        }
    }

    /**
     * Return the size defined in the options object
     *
     * @method getSize
     *
     * @return {array} two element array [height, width]
     */
    getSize() {
        return this.options.size;
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    render() {
        return this.arbiter.render();
    }
}
