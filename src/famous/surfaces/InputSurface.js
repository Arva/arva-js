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
 import DOMBuffer from '../core/DOMBuffer.js';

export default class InputSurface extends Surface {

  elementType = 'input';
  elementClass = 'famous-surface';

  /**
   * A Famo.us surface in the form of an HTML input element.
   *   This extends the Surface class.
   *
   * @class InputSurface
   * @extends Surface
   * @constructor
   * @param {Object} [options] overrides of default options
   * @param {string} [options.placeholder] placeholder text hint that describes the expected value of an <input> element
   * @param {string} [options.type] specifies the type of element to display (e.g. 'datetime', 'text', 'button', etc.)
   * @param {string} [options.value] value of text
   */
  constructor(options) {
    super(...arguments);
    this._placeholder = options.placeholder !== undefined ? options.placeholder : '';
    this._value = options.value !== undefined ? options.value : '';
    this._type = options.type || 'text';
    this._name = options.name || '';

    this.on('click', this.focus.bind(this));
    /* TODO: Determine if this code needs to be here and if so whether it can be integrated with DOMEventHandler */
    window.addEventListener('click', (event)=> {
      if (event.target !== this._currentTarget) this.blur();
    });
  }


  setOptions(options) {
    let newPlaceholder = options.placeholder !== undefined ? options.placeholder : '',
      newValue = options.value !== undefined ? options.value : '',
      newType = options.type || 'text',
      newName = options.name || '';
    this._contentDirty = newPlaceholder !== this._placeholder
      || newValue !== this._value
      || newType !== this._type
      || newName !== this._name;
    this._placeholder = newPlaceholder;
    this._value       = newValue;
    this._type        = newType;
    this._name        = newName;

    super.setOptions(options);
  }

  /**
   * Set placeholder text.  Note: Triggers a repaint.
   *
   * @method setPlaceholder
   * @param {string} str Value to set the placeholder to.
   * @return {InputSurface} this, allowing method chaining.
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
   * @return {InputSurface} this, allowing method chaining.
   */
  focus() {
    if (this._currentTarget) this._currentTarget.focus();
    return this;
  }

  /**
   * Blur the current input, hiding the keyboard on mobile.
   *
   * @method blur
   * @return {InputSurface} this, allowing method chaining.
   */
  blur() {
    if (this._currentTarget) this._currentTarget.blur();
    return this;
  }

  /**
   * Set the placeholder conent.
   *   Note: Triggers a repaint next tick.
   *
   * @method setValue
   * @param {string} str Value to set the main input value to.
   * @return {InputSurface} this, allowing method chaining.
   */
  setValue(str) {
    this._value = str;
    this._contentDirty = true;
    return this;
  }

  /**
   * Set the type of element to display conent.
   *   Note: Triggers a repaint next tick.
   *
   * @method setType
   * @param {string} str type of the input surface (e.g. 'button', 'text')
   * @return {InputSurface} this, allowing method chaining.
   */
  setType(str) {
    this._type = str;
    this._contentDirty = true;
    return this;
  }

  /**
   * Get the value of the inner content of the element (e.g. the entered text)
   *
   * @method getValue
   * @return {string} value of element
   */
  getValue() {
    if (!this._currentTarget || this._contentDirty) {
      return this._value;
    } else {
      return this._currentTarget.value;
    }
  }

  /**
   * Set the name attribute of the element.
   *   Note: Triggers a repaint next tick.
   *
   * @method setName
   * @param {string} str element name
   * @return {InputSurface} this, allowing method chaining.
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
   * Place the document element this component manages into the document.
   *
   * @private
   * @method deploy
   * @param {Node} target document parent of this container
   */
  deploy(target) {
    DOMBuffer.assignProperty(target, 'placeholder', this._placeholder || '');
    DOMBuffer.assignProperty(target, 'type', this._type);
    DOMBuffer.assignProperty(target, 'value', this._value);
    DOMBuffer.assignProperty(target, 'name', this._name);
  }
}
