/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Transform    from './Transform.js';
import Modifier     from './Modifier.js';
import RenderNode   from './RenderNode.js';

export default class Scene {

  /**
   * Builds and renders a scene graph based on a declarative structure definition.
   * See the Scene examples in the examples distribution (http://github.com/Famous/examples.git).
   *
   * @class Scene
   * @constructor
   * @param {Object|Array|Spec} definition in the format of a render spec.
   */
  constructor(definition) {
      this.id = null;
      this._objects = null;

      this.node = new RenderNode();
      this._definition = null;

      if (definition) this.load(definition);
  }

  static _MATRIX_GENERATORS = {
      'translate': Transform.translate,
      'rotate': Transform.rotate,
      'rotateX': Transform.rotateX,
      'rotateY': Transform.rotateY,
      'rotateZ': Transform.rotateZ,
      'rotateAxis': Transform.rotateAxis,
      'scale': Transform.scale,
      'skew': Transform.skew,
      'matrix3d': function() {
          return arguments;
      }
  }

  /**
   * Clone this scene
   *
   * @method create
   * @return {Scene} deep copy of this scene
   */
  create() {
      return new Scene(this._definition);
  }

  static _resolveTransformMatrix(matrixDefinition) {
      for (let type in _MATRIX_GENERATORS) {
          if (type in matrixDefinition) {
              let args = matrixDefinition[type];
              if (!(args instanceof Array)) args = [args];
              return _MATRIX_GENERATORS[type].apply(this, args);
          }
      }
  }

  // parse transform into tree of render nodes, doing matrix multiplication
  // when available
  static _parseTransform(definition) {
      let transformDefinition = definition.transform;
      let opacity = definition.opacity;
      let origin = definition.origin;
      let align = definition.align;
      let size = definition.size;
      let transform = Transform.identity;
      if (transformDefinition instanceof Array) {
          if (transformDefinition.length === 16 && typeof transformDefinition[0] === 'number') {
              transform = transformDefinition;
          }
          else {
              for (let i = 0; i < transformDefinition.length; i++) {
                  transform = Transform.multiply(transform, _resolveTransformMatrix(transformDefinition[i]));
              }
          }
      }
      else if (transformDefinition instanceof Function) {
          transform = transformDefinition;
      }
      else if (transformDefinition instanceof Object) {
          transform = _resolveTransformMatrix(transformDefinition);
      }

      let result = new Modifier({
          transform: transform,
          opacity: opacity,
          origin: origin,
          align: align,
          size: size
      });
      return result;
  }

  static _parseArray(definition) {
      let result = new RenderNode();
      for (let i = 0; i < definition.length; i++) {
          let obj = _parse.call(this, definition[i]);
          if (obj) result.add(obj);
      }
      return result;
  }

  // parse object directly into tree of RenderNodes
  static _parse(definition) {
      let result;
      let id;
      if (definition instanceof Array) {
          result = _parseArray.call(this, definition);
      }
      else {
          id = this._objects.length;
          if (definition.render && (definition.render instanceof Function)) {
              result = definition;
          }
          else if (definition.target) {
              let targetObj = _parse.call(this, definition.target);
              let obj = _parseTransform.call(this, definition);

              result = new RenderNode(obj);
              result.add(targetObj);
              if (definition.id) this.id[definition.id] = obj;
          }
          else if (definition.id) {
              result = new RenderNode();
              this.id[definition.id] = result;
          }
      }
      this._objects[id] = result;
      return result;
  }

  /**
   * Builds and renders a scene graph based on a canonical declarative scene definition.
   * See examples/Scene/example.js.
   *
   * @method load
   * @param {Object} definition definition in the format of a render spec.
   */
  load(definition) {
      this._definition = definition;
      this.id = {};
      this._objects = [];
      this.node.set(_parse.call(this, definition));
  }

  /**
   * Add renderables to this component's render tree
   *
   * @method add
   *
   * @param {Object} obj renderable object
   * @return {RenderNode} Render wrapping provided object, if not already a RenderNode
   */
  add() {
      return this.node.add.apply(this.node, arguments);
  }

  /**
   * Generate a render spec from the contents of this component.
   *
   * @private
   * @method render
   * @return {number} Render spec for this component
   */
  render() {
      return this.node.render.apply(this.node, arguments);
  }

}
