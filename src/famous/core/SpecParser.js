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

export default class SpecParser {

  /**
   *
   * This object translates the rendering instructions ("render specs")
   *   that renderable components generate into document update
   *   instructions ("update specs").  Private.
   *
   * @private
   * @class SpecParser
   * @constructor
   */
  constructor() {
      this.result = {};
  }

  static _instance = new SpecParser();

  /**
   * Convert a render spec coming from the context's render chain to an
   *    update spec for the update chain. This is the only major entry point
   *    for a consumer of this class.
   *
   * @method parse
   * @static
   * @private
   *
   * @param {renderSpec} spec input render spec
   * @param {Object} context context to do the parse in
   * @return {Object} the resulting update spec (if no callback
   *   specified, else none)
   */
  static parse(spec, context) {
      return SpecParser._instance.parse(spec, context);
  }

  /**
   * Convert a renderSpec coming from the context's render chain to an update
   *    spec for the update chain. This is the only major entrypoint for a
   *    consumer of this class.
   *
   * @method parse
   *
   * @private
   * @param {renderSpec} spec input render spec
   * @param {Context} context
   * @return {updateSpec} the resulting update spec
   */
  parse(spec, context) {
      this.reset();
      this._parseSpec(spec, context, Transform.identity);
      return this.result;
  }

  /**
   * Prepare SpecParser for re-use (or first use) by setting internal state
   *  to blank.
   *
   * @private
   * @method reset
   */
  reset() {
      this.result = {};
  }

  // Multiply matrix M by vector v
  static _vecInContext(v, m) {
      return [
          v[0] * m[0] + v[1] * m[4] + v[2] * m[8],
          v[0] * m[1] + v[1] * m[5] + v[2] * m[9],
          v[0] * m[2] + v[1] * m[6] + v[2] * m[10]
      ];
  }

  static _zeroZero = [0, 0];

  // From the provided renderSpec tree, recursively compose opacities,
  //    origins, transforms, and sizes corresponding to each surface id from
  //    the provided renderSpec tree structure. On completion, those
  //    properties of 'this' object should be ready to use to build an
  //    updateSpec.
  _parseSpec(spec, parentContext, sizeContext) {
      let id;
      let target;
      let transform;
      let opacity;
      let origin;
      let align;
      let size;

      if (typeof spec === 'number') {
          id = spec;
          let hide = parentContext.hide || parentContext.opacity === 0;
          transform = hide ? Transform.scale(0, 0, 0) : parentContext.transform;
          align = parentContext.align || _zeroZero;
          if (parentContext.size && align && (align[0] || align[1])) {
              let alignAdjust = [align[0] * parentContext.size[0], align[1] * parentContext.size[1], 0];
              transform = Transform.thenMove(transform, _vecInContext(alignAdjust, sizeContext));
          }
          this.result[id] = {
              hide: hide,
              transform: transform,
              opacity: parentContext.opacity,
              origin: parentContext.origin || _zeroZero,
              align: parentContext.align || _zeroZero,
              size: parentContext.size
          };
      }
      else if (!spec) { // placed here so 0 will be cached earlier
          return;
      }
      else if (spec instanceof Array) {
          for (let i = 0; i < spec.length; i++) {
              this._parseSpec(spec[i], parentContext, sizeContext);
          }
      }
      else {
          target = spec.target;
          transform = parentContext.transform;
          opacity = parentContext.opacity;
          origin = parentContext.origin;
          align = parentContext.align;
          size = parentContext.size;
          /* If parent is hidden, also this element should be hidden */
          let hide = spec.hide || parentContext.hide || opacity === 0;
          let nextSizeContext = sizeContext;

          if (spec.opacity !== undefined) opacity = parentContext.opacity * spec.opacity;
          if (hide) transform = Transform.scale(0, 0, 0);
          else if (spec.transform) transform = Transform.multiply(parentContext.transform, spec.transform);

          if (spec.origin) {
              origin = spec.origin;
              nextSizeContext = parentContext.transform;
          }
          if (spec.align) align = spec.align;

          if (spec.size || spec.proportions) {
              let parentSize = size;
              size = [size[0], size[1]];

              if (spec.size) {
                  if (spec.size[0] !== undefined) size[0] = spec.size[0];
                  if (spec.size[1] !== undefined) size[1] = spec.size[1];
              }

              if (spec.proportions) {
                  if (spec.proportions[0] !== undefined) size[0] = size[0] * spec.proportions[0];
                  if (spec.proportions[1] !== undefined) size[1] = size[1] * spec.proportions[1];
              }

              if (parentSize) {
                  if (align && (align[0] || align[1])) transform = Transform.thenMove(transform, _vecInContext([align[0] * parentSize[0], align[1] * parentSize[1], 0], sizeContext));
                  if (origin && (origin[0] || origin[1])) transform = Transform.moveThen([-origin[0] * size[0], -origin[1] * size[1], 0], transform);
              }

              nextSizeContext = parentContext.transform;
              origin = null;
              align = null;
          }

          this._parseSpec(target, {
              transform: transform,
              opacity: opacity,
              origin: origin,
              align: align,
              size: size,
              hide: hide
          }, nextSizeContext);
      }
  }
}
