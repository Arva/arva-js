/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import Context           from './Context.js';
 import Transform         from './Transform.js';
 import Surface           from './Surface.js';

 export default class Group extends Surface {

   static SIZE_ZERO = [0, 0];

   elementType = 'div';
   elementClass = 'famous-group';

   /**
    * A Context designed to contain surfaces and set properties
    *   to be applied to all of them at once.
    *   This is primarily used for specific performance improvements in the rendering engine.
    *   Private.
    *
    * @private
    * @class Group
    * @extends Surface
    * @constructor
    * @param {Object} [options] Surface options array (see Surface})
    */
   constructor(options) {
     super(options);
     this._shouldRecalculateSize = false;
     this._container = document.createDocumentFragment();
     this.context = new Context(this._container);
     this.setContent(this._container);
     this._groupSize = [undefined, undefined];
     this._surfaceSize = options ? (options.size || Group.SIZE_ZERO) : Group.SIZE_ZERO;
   }

   /**
    * Add renderables to this component's render tree.
    *
    * @method add
    * @private
    * @param {Object} obj renderable object
    * @return {RenderNode} Render wrapping provided object, if not already a RenderNode
    */
   add() {
     return this.context.add.apply(this.context, arguments);
   }

   /**
    * Generate a render spec from the contents of this component.
    *
    * @private
    * @method render
    * @return {Number} Render spec for this component
    */
   render() {
     return super.render(...arguments);
   }

   /**
    * Place the document element this component manages into the document.
    *
    * @private
    * @method deploy
    * @param {Node} target document parent of this container
    */
   deploy(target) {
     this.context.migrate(target);
   }


   allocate(allocator) {
     this._allocator = allocator.allocate({ type: this.elementType, isNested: true });
     return this._allocator.container;
   }

   /**
    * Place the document element this component manages into the document.
    *
    * @private
    * @method deploy
    * @param {Node} target document parent of this container
    */
   deploy(target) {
     //Do nothing
   };

   /**
    * Remove this component and contained content from the document
    *
    * @private
    * @method recall
    *
    * @param {Node} target node to which the component was deployed
    */
   recall(target) {
     /*
      * Previous recalling heuristic was this:
      * this._container = document.createDocumentFragment();
      * this.context.migrate(this._container);
      * However this was abandoned because when the same surfaces were initialized within a different context,
      * they didn't know they needed to be setup again, because their elements still existed. Instead, the
      * current solution keeps the elements in the DOM in a nested manner in case they would be needed again.
      *
      * */
   };


   deallocate(allocator) {
     this.context.cleanup(this._allocator);
     return allocator.deallocateAllocator(this._allocator);
   }


   /**
    * Apply changes from this component to the corresponding document element.
    *
    * @private
    * @method commit
    *
    * @param {Object} context update spec passed in from above in the render tree.
    */
   commit(context) {
     let transform = context.transform;
     let origin = context.origin;
     let opacity = context.opacity;
     let size = context.size;
     let result = super.commit({
       allocator: context.allocator,
       transform: Transform.thenMove(transform, [-origin[0] * size[0], -origin[1] * size[1], 0]),
       opacity: opacity,
       origin: origin,
       size: this._surfaceSize
     });
     if (size[0] !== this._groupSize[0] || size[1] !== this._groupSize[1]) {
       this._groupSize[0] = size[0];
       this._groupSize[1] = size[1];
       this.context.setSize(size);
     }
     /* Executes the commit functions of the children */
     this.context.update({
       allocator: this._allocator,
       transform: Transform.translate(-origin[0] * size[0], -origin[1] * size[1], 0),
       origin: origin,
       hide: context.opacity === 0 || context.hide,
       size: size
     });
     return result;
   }
 }
