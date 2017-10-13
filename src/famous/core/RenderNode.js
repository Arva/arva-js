/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


import Entity        from './Entity.js';
import SpecParser    from './SpecParser.js';

export default class RenderNode {
  /**
   * A wrapper for inserting a renderable component (like a Modifer or
   *   Surface) into the render tree.
   *
   * @class RenderNode
   * @constructor
   *
   * @param {Object} object Target renderable component
   */
  constructor(object) {
      this._object = null;
      this._child = null;
      this._hasMultipleChildren = false;
      this._isRenderable = false;
      this._isModifier = false;

      this._resultCache = {};
      this._prevResults = {};

      this._childResult = null;

      if (object) this.set(object);
  }

  /**
   * Append a renderable to the list of this node's children.
   *   This produces a new RenderNode in the tree.
   *   Note: Does not double-wrap if child is a RenderNode already.
   *
   * @method add
   * @param {Object} child renderable object
   * @return {RenderNode} new render node wrapping child
   */
  add(child) {
      let childNode = (child instanceof RenderNode) ? child : new RenderNode(child);
      if (this._child instanceof Array) this._child.push(childNode);
      else if (this._child) {
          this._child = [this._child, childNode];
          this._hasMultipleChildren = true;
          this._childResult = []; // to be used later
      }
      else this._child = childNode;

      return childNode;
  }

  /**
   * Return the single wrapped object.  Returns null if this node has multiple child nodes.
   *
   * @method get
   *
   * @return {Object} contained renderable object
   */
  get() {
      return this._object || (this._hasMultipleChildren ? null : (this._child ? this._child.get() : null));
  }

  /**
   * Overwrite the list of children to contain the single provided object
   *
   * @method set
   * @param {Object} child renderable object
   * @return {RenderNode} this render node, or child if it is a RenderNode
   */
  set(child) {
      this._childResult = null;
      this._hasMultipleChildren = false;
      this._isRenderable = child.render ? true : false;
      this._isModifier = child.modify ? true : false;
      this._object = child;
      this._child = null;
      if (child instanceof RenderNode) return child;
      else return this;
  }

  /**
   * Get render size of contained object.
   *
   * @method getSize
   * @return {Array.Number} size of this or size of single child.
   */
  getSize() {
      let result = null;
      let target = this.get();
      if (target && target.getSize) result = target.getSize();
      if (!result && this._child && this._child.getSize) result = this._child.getSize();
      return result;
  }

  // apply results of rendering this subtree to the document
  static _applyCommit(spec, context, cacheStorage) {
      let result = SpecParser.parse(spec, context);
      let keys = Object.keys(result);
      for (let i = 0; i < keys.length; i++) {
          let id = keys[i];
          let childNode = Entity.get(id);
          let commitParams = result[id];
          commitParams.allocator = context.allocator;
          let commitResult = childNode.commit(commitParams);
          if (commitResult) RenderNode._applyCommit(commitResult, context, cacheStorage);
          else cacheStorage[id] = commitParams;
      }
  }

  /**
   * Commit the content change from this node to the document.
   *
   * @private
   * @method commit
   * @param {Context} context render context
   */
  commit(context) {
      // free up some divs from the last loop
      let prevKeys = Object.keys(this._prevResults);
      for (let i = 0; i < prevKeys.length; i++) {
          let id = prevKeys[i];
          if (this._resultCache[id] === undefined) {
              let object = Entity.get(id);
              if (object.cleanup) object.cleanup(context.allocator);
          }
      }

      this._prevResults = this._resultCache;
      this._resultCache = {};
      RenderNode._applyCommit(this.render(), context, this._resultCache);
  }

  /**
   * Cleans up all current renderables
   * @param context
   */
  cleanup(allocator) {
      let prevKeys = Object.keys(this._prevResults);
      for (let i = 0; i < prevKeys.length; i++) {
          let id = prevKeys[i];
          let object = Entity.get(id);
          if (object.cleanup) object.cleanup(allocator);
      }
  }


  /**
   * Generate a render spec from the contents of the wrapped component.
   *
   * @private
   * @method render
   *
   * @return {Object} render specification for the component subtree
   *    only under this node.
   */
  render() {
      if (this._isRenderable) return this._object.render();

      let result = null;
      if (this._hasMultipleChildren) {
          result = this._childResult;
          let children = this._child;
          for (let i = 0; i < children.length; i++) {
              result[i] = children[i].render();
          }
      }
      else if (this._child) result = this._child.render();

      return this._isModifier ? this._object.modify(result) : result;
  }
}
