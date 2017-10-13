/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Utility from '../utilities/Utility.js';
import View from '../core/View.js';
import GridLayout from '../views/GridLayout.js';
import ToggleButton from './ToggleButton.js';

/*eslint-disable new-cap */
export default class TabBar extends View {

    /**
     * A view for displaying various tabs that dispatch events
     *  based on the id of the button that was clicked
     *
     * @class TabBar
     * @extends View
     * @constructor
     *
     * @param {object} options overrides of default options
     */
    constructor(options) {
        super(...arguments);

        this.layout = new GridLayout();
        this.buttons = [];
        this._buttonIds = {};
        this._buttonCallbacks = {};

        this.layout.sequenceFrom(this.buttons);
        this._add(this.layout);

        this._optionsManager.on('change', this._updateOptions);
    }

    static DEFAULT_OPTIONS = {
        sections: [],
        widget: ToggleButton,
        size: [undefined, 50],
        direction: Utility.Direction.X,
        buttons: {
            toggleMode: ToggleButton.ON
        }
    }

    /**
     * Update the options for all components of the view
     *
     * @method _updateOptions
     *
     * @param {object} data component options
     */
    _updateOptions(data) {
        let id = data.id;
        let value = data.value;

        if (id === 'direction') {
            this.layout.setOptions({dimensions: _resolveGridDimensions.call(this.buttons.length, this.options.direction)});
        }
        else if (id === 'buttons') {
            for (let i in this.buttons) {
                this.buttons[i].setOptions(value);
            }
        }
        else if (id === 'sections') {
            for (let sectionId in this.options.sections) {
                this.defineSection(sectionId, this.options.sections[sectionId]);
            }
        }
    }

    /**
     * Return an array of the proper dimensions for the tabs
     *
     * @method _resolveGridDimensions
     *
     * @param {number} count number of buttons
     * @param {number} direction direction of the layout
     *
     * @return {array} the dimensions of the tab section
     */
    static _resolveGridDimensions(count, direction) {
        if (direction === Utility.Direction.X) return [count, 1];
        else return [1, count];
    }

    /**
     * Create a new button with the specified id.  If one already exists with
     *  that id, unbind all listeners.
     *
     * @method defineSection
     *
     * @param {string} id name of the button
     * @param {object} content data for the creation of a new ToggleButton
     */
    defineSection(id, content) {
        let button;
        let i = this._buttonIds[id];

        if (i === undefined) {
            i = this.buttons.length;
            this._buttonIds[id] = i;
            let widget = this.options.widget;
            button = new widget();
            this.buttons[i] = button;
            this.layout.setOptions({dimensions: _resolveGridDimensions(this.buttons.length, this.options.direction)});
        }
        else {
            button = this.buttons[i];
            button.unbind('select', this._buttonCallbacks[id]);
        }

        if (this.options.buttons) button.setOptions(this.options.buttons);
        button.setOptions(content);

        this._buttonCallbacks[id] = this.select.bind(this, id);
        button.on('select', this._buttonCallbacks[id]);
    }

    /**
     * Select a particular button and dispatch the id of the selection
     *  to any listeners.  Deselect all others
     *
     * @method select
     *
     * @param {string} id button id
     */
    select(id) {
        let btn = this._buttonIds[id];
        // this prevents event loop
        if (this.buttons[btn] && this.buttons[btn].isSelected()) {
            this._eventOutput.emit('select', {id: id});
        }
        else if (this.buttons[btn]) {
            this.buttons[btn].select();
        }

        for (let i = 0; i < this.buttons.length; i++) {
            if (i !== btn) this.buttons[i].deselect();
        }
    }
}
