/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import RenderNode from './RenderNode.js';
import EventHandler from './EventHandler.js';
import ElementAllocator from './ElementAllocator.js';
import Transform from './Transform.js';
import Transitionable from '../transitions/Transitionable.js';
import DOMBuffer from './DOMBuffer.js';


const _zeroZero = [0, 0];
const usePrefix = typeof document !== 'undefined' && !('perspective' in document.documentElement.style);
const perspectiveStyle = usePrefix ? 'webkitPerspective' : 'perspective';

/**
 * A context is a group of renderables, representing one hierarchy level in the DOM.
 * Every Famous app has at least one context, which is the root context. The engine
 * can have multiple contexts, and Groups will create new contexts to nest things further.
 * The Context is not strictly bound to a specific point in the DOM, unless setPermanentElementAllocator()
 * is called. Otherwise, the context can be rendered dynamically in different parts of the document.
 *
 * @class Context
 * @constructor
 * @private
 * @param {Node} container Element in which content will be inserted
 */
export default class Context {

  static _zeroZero = [0, 0];
  static usePrefix = typeof document !== 'undefined' && !('perspective' in document.documentElement.style);
  static perspectiveStyle = usePrefix ? 'webkitPerspective' : 'perspective';

  //TODO this function is quite ugly as it depends on the last state of _nodeContext
  _getElementSize() {
    let allocator = this._permanentAllocator || this._nodeContext.allocator;
    let element = allocator.container;
    return [element.clientWidth, element.clientHeight];
  }

  _setPerspective(element, perspective) {
    DOMBuffer.assignProperty(element.style, perspectiveStyle, perspective ? perspective.toFixed() + 'px' : '');
  }

  constructor() {
    this._node = new RenderNode();
    this._eventOutput = new EventHandler();
    this._size = [0, 0];

    this._perspectiveState = new Transitionable(0);
    this._perspective = undefined;

    this._nodeContext = {
      transform: Transform.identity,
      opacity: 1,
      origin: _zeroZero,
      align: _zeroZero,
      size: this._size
    };

    this._eventOutput.on('resize', () => {
      this.setSize(this._getElementSize());
    });
  }


  /**
   * Add renderables to this Context's render tree.
   *
   * @method add
   *
   * @param {Object} obj renderable object
   * @return {RenderNode} RenderNode wrapping this object, if not already a RenderNode
   */
  add(obj) {
    return this._node.add(obj);
  }

  /**
   * Move this Context to another containing document element.
   *
   * @method migrate
   *
   * @param {Node} container Element to which content will be migrated
   */
  migrate(container) {
    throw new Error('not supported');
  }

  /**
   *  Cleans up all the RenderNode
   */
  cleanup(allocator) {
    this._node.cleanup(allocator);
  }

  /**
   * Gets viewport size for Context.
   *
   * @method getSize
   *
   * @return {Array.Number} viewport size as [width, height]
   */
  getSize() {
    return this._size;
  }

  /**
   * Sets viewport size for Context.
   *
   * @method setSize
   *
   * @param {Array.Number} size [width, height].  If unspecified, use size of root document element.
   */
  setSize(size) {
    if (!size) size = this._getElementSize();
    this._size[0] = size[0];
    this._size[1] = size[1];
  }

  /**
   * Marks the context as having a stationary root being the given elementAllocator
   * @param elementAllocator
   */
  setPermanentElementAllocator(elementAllocator) {
    if (this._permanentAllocator) {
      throw new Error('Cannot reset the permament element allocator!');
    }
    this._permanentAllocator = elementAllocator;
    this._nodeContext.allocator = elementAllocator;
  }

  /**
   * Commit this Context's content changes to the document.
   *
   * @private
   * @method update
   * @param {Object} contextParameters engine commit specification
   */
  update(contextParameters) {
    if (contextParameters) {
      if (contextParameters.transform) this._nodeContext.transform = contextParameters.transform;
      if (contextParameters.opacity) this._nodeContext.opacity = contextParameters.opacity;
      if (contextParameters.origin) this._nodeContext.origin = contextParameters.origin;
      if (contextParameters.align) this._nodeContext.align = contextParameters.align;
      if (contextParameters.size) this._nodeContext.size = contextParameters.size;
      if (contextParameters.size) this._nodeContext.size = contextParameters.size;
      this._nodeContext.hide = contextParameters.hide;
      if (contextParameters.allocator) {
        this._nodeContext.allocator = contextParameters.allocator;
      } else {
        this._nodeContext.allocator = this._permanentAllocator;
      }
    }
    var perspective = this._perspectiveState.get();
    if (perspective !== this._perspective) {
      _setPerspective(this._nodeContext.allocator.container, perspective);
      this._perspective = perspective;
    }

    this._node.commit(this._nodeContext);
  };

  /**
   * Get current perspective of this context in pixels.
   *
   * @method getPerspective
   * @return {Number} depth perspective in pixels
   */
  getPerspective() {
    return this._perspectiveState.get();
  }

  /**
   * Set current perspective of this context in pixels.
   *
   * @method setPerspective
   * @param {Number} perspective in pixels
   * @param {Object} [transition] Transitionable object for applying the change
   * @param {function(Object)} callback function called on completion of transition
   */
  setPerspective(perspective, transition, callback) {
    return this._perspectiveState.set(perspective, transition, callback);
  }

  /**
   * Trigger an event, sending to all downstream handlers
   *   listening for provided 'type' key.
   *
   * @method emit
   *
   * @param {string} type event type key (for example, 'click')
   * @param {Object} event event data
   * @return {EventHandler} this
   */
  emit(type, event) {
    return this._eventOutput.emit(type, event);
  }

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @method "on"
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function(string, Object)} handler callback
   * @return {EventHandler} this
   */
  on(type, handler) {
    return this._eventOutput.on(type, handler);
  }

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function} handler function object to remove
   * @return {EventHandler} internal event handler object (for chaining)
   */
  removeListener(type, handler) {
    return this._eventOutput.removeListener(type, handler);
  }

  /**
   * Add event handler object to set of downstream handlers.
   *
   * @method pipe
   *
   * @param {EventHandler} target event handler target object
   * @return {EventHandler} passed event handler
   */
  pipe(target) {
    return this._eventOutput.pipe(target);
  }

  /**
   * Remove handler object from set of downstream handlers.
   *   Undoes work of "pipe".
   *
   * @method unpipe
   *
   * @param {EventHandler} target target handler object
   * @return {EventHandler} provided target
   */
  unpipe(target) {
    return this._eventOutput.unpipe(target);
  }

}
