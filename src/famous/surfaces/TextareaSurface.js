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

export default class TextareaSurface extends Surface {

  elementType = 'textarea';
  elementClass = 'famous-surface';

  /**
     * A Famo.us surface in the form of an HTML textarea element.
     *   This extends the Surface class.
     *
     * @class TextareaSurface
     * @extends Surface
     * @constructor
     * @param {Object} [options] overrides of default options
     * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an textarea element
     * @param {string} [options.value] value of text
     * @param {string} [options.name] specifies the name of textarea
     * @param {string} [options.wrap] specify 'hard' or 'soft' wrap for textarea
     * @param {number} [options.cols] number of columns in textarea
     * @param {number} [options.rows] number of rows in textarea
     */
    constructor(options) {
      super(...arguments);

      this._placeholder = options.placeholder || '';
      this._value       = options.value || '';
      this._name        = options.name || '';
      this._wrap        = options.wrap || '';
      this._cols        = options.cols || '';
      this._rows        = options.rows || '';

      this.on('click', this.focus);
    }

    /**
     * Set placeholder text.  Note: Triggers a repaint.
     *
     * @method setPlaceholder
     * @param {string} str Value to set the placeholder to.
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setPlaceholder(str) {
        this._placeholder = str;
        this._contentDirty = true;
        return this;
    }

    /**
     * Focus on the current input, pulling up the keyboard on mobile.
     *
     * @method focus
     * @return {TextareaSurface} this, allowing method chaining.
     */
    focus() {
        if (this._currentTarget) this._currentTarget.focus();
        return this;
    }

    /**
     * Blur the current input, hiding the keyboard on mobile.
     *
     * @method focus
     * @return {TextareaSurface} this, allowing method chaining.
     */
    blur() {
        if (this._currentTarget) this._currentTarget.blur();
        return this;
    }

    /**
     * Set the value of textarea.
     *   Note: Triggers a repaint next tick.
     *
     * @method setValue
     * @param {string} str Value to set the main textarea value to.
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setValue(str) {
        this._value = str;
        this._contentDirty = true;
        return this;
    }

    /**
     * Get the value of the inner content of the textarea (e.g. the entered text)
     *
     * @method getValue
     * @return {string} value of element
     */
    getValue() {
        if (this._currentTarget) {
            return this._currentTarget.value;
        }
        else {
            return this._value;
        }
    }

    /**
     * Set the name attribute of the element.
     *   Note: Triggers a repaint next tick.
     *
     * @method setName
     * @param {string} str element name
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setName(str) {
        this._name = str;
        this._contentDirty = true;
        return this;
    }

    /**
     * Get the name attribute of the element.
     *
     * @method getName
     * @return {string} name of element
     */
    getName() {
        return this._name;
    }

    /**
     * Set the wrap of textarea.
     *   Note: Triggers a repaint next tick.
     *
     * @method setWrap
     * @param {string} str wrap of the textarea surface (e.g. 'soft', 'hard')
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setWrap(str) {
        this._wrap = str;
        this._contentDirty = true;
        return this;
    }

    /**
     * Set the number of columns visible in the textarea.
     *   Note: Overridden by surface size; set width to true. (eg. size: [true, *])
     *         Triggers a repaint next tick.
     *
     * @method setColumns
     * @param {number} num columns in textarea surface
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setColumns(num) {
        this._cols = num;
        this._contentDirty = true;
        return this;
    }

    /**
     * Set the number of rows visible in the textarea.
     *   Note: Overridden by surface size; set height to true. (eg. size: [*, true])
     *         Triggers a repaint next tick.
     *
     * @method setRows
     * @param {number} num rows in textarea surface
     * @return {TextareaSurface} this, allowing method chaining.
     */
    setRows(num) {
        this._rows = num;
        this._contentDirty = true;
        return this;
    }

    /**
     * Place the document element this component manages into the document.
     *
     * @private
     * @method deploy
     * @param {Node} target document parent of this container
     */
    deploy(target) {
        if (this._placeholder !== '') target.placeholder = this._placeholder;
        if (this._value !== '') target.value = this._value;
        if (this._name !== '') target.name = this._name;
        if (this._wrap !== '') target.wrap = this._wrap;
        if (this._cols !== '') target.cols = this._cols;
        if (this._rows !== '') target.rows = this._rows;
    }
}
