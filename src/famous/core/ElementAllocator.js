/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import Context     from './Context.js';
 import DOMBuffer   from './DOMBuffer.js';

 /**
  * Internal helper object to Context that handles the process of
  *   creating and allocating DOM elements within a managed div.
  *   Private.
  *
  * @class ElementAllocator
  * @constructor
  * @private
  * @param {Node} container document element in which Famo.us content will be inserted
  */
export default class ElementAllocator {

  constructor(container) {
    if (!container) container = document.createDocumentFragment();
    this.container = container;
    this.detachedHtmlElements = {};
    this.detachedAllocators = {};
  }

  /**
   * Move the document elements from their original container to a new one.
   *
   * @private
   * @method migrate
   *
   * @param {Node} container document element to which Famo.us content will be migrated
   */
  migrate(container) {
    throw new Error('not supported');
    let oldContainer = this.container;
    if (container === oldContainer) return;

    if (oldContainer instanceof DocumentFragment) {
      DOMBuffer.appendChild(container, oldContainer);
    }
    else {
      let children = oldContainer.childNodes || [];
      //TODO Confirm that this works
      for(var i = 0;i< children.length; i++){
        DOMBuffer.appendChild(container, children[i]);
      }
    }

    this.container = container;
  }

  /**
   * Allocate an element of specified type from the pool.
   *
   * @private
   * @method allocate
   *
   * @param {Object} options
   * @param {String} options.type type of element, e.g. 'div'
   * @param {Boolean} options.insertFirst Whether it should be allocated from the top instead of the bottom
   * or at the end. Defaults to false (at the bottom).
   * @param {Boolean} options.isNested Whether it should allocate a node that already is nested (treated separately)
   * @return {Node} allocated document element
   */
  allocate(options) {
    let type = options.type.toLocaleLowerCase();
    let insertFirst = !!options.insertFirst;
    let isNested = !!options.isNested;
    type = type.toLowerCase();
    let detachedList = isNested ? this.detachedAllocators : this.detachedHtmlElements;
    if (!(type in detachedList)) detachedList[type] = [];
    let nodeStore = detachedList[type];
    let result;
    if (nodeStore.length > 0 && !insertFirst) {
      result = nodeStore.pop();
    }
    else {
      result = this._allocateNewHtmlOutput(type, insertFirst);
      if (isNested) {
        result = this._allocateNewAllocator(result);
      }
    }
    return result;
  };

  /**
   * Allocates an allocator to nest within the current space
   * @param container
   * @returns {ElementAllocator}
   * @private
   */
  _allocateNewAllocator(container) {
    return new ElementAllocator(container);
  }

  /**
   * Allocates a DOM element
   * @param type
   * @param insertFirst
   * @returns {Element}
   * @private
   */
  _allocateNewHtmlOutput(type, insertFirst) {
    let result = document.createElement(type);
    if (insertFirst) {
      DOMBuffer.insertBefore(this.container, result, this.container.firstChild);
    } else {
      DOMBuffer.appendChild(this.container, result);
    }
    return result;
  }

  /**
   * Deallocates an allocator nested within this allocator and stores it for later usage.
   * @param allocator
   */
  deallocateAllocator(allocator) {
    let elementToDeallocate = allocator.container;
    let nodeType = elementToDeallocate.nodeName.toLocaleLowerCase();
    let nodeStore = this.detachedAllocators[nodeType];
    nodeStore.push(allocator);
  }

  /**
   * De-allocate an element of specified type to the pool.
   *
   * @private
   * @method deallocate
   *
   * @param {Node} element document element to deallocate
   */
  deallocate(element) {
    let nodeType = element.nodeName.toLowerCase();
    let nodeStore = this.detachedHtmlElements[nodeType];
    nodeStore.push(element);
  }
}
