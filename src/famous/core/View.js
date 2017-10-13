/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 import EventHandler      from './EventHandler.js';
 import OptionsManager    from './OptionsManager.js';
 import RenderNode        from './RenderNode.js';
 import Utility           from '../utilities/Utility.js';


 export default class View {
   /**
    * Useful for quickly creating elements within applications
    *   with large event systems.  Consists of a RenderNode paired with
    *   an input EventHandler and an output EventHandler.
    *   Meant to be extended by the developer.
    *
    * @class View
    * @uses EventHandler
    * @uses OptionsManager
    * @uses RenderNode
    * @constructor
    */
   constructor(options) {
       this._node = new RenderNode();

       this._eventInput = new EventHandler();
       this._eventOutput = new EventHandler();
       EventHandler.setInputHandler(this, this._eventInput);
       EventHandler.setOutputHandler(this, this._eventOutput);

       this.options = Utility.clone(this.constructor.DEFAULT_OPTIONS || View.DEFAULT_OPTIONS);
       this._optionsManager = new OptionsManager(this.options);

       if (options) this.setOptions(options);
   }


   static DEFAULT_OPTIONS = {}; // no defaults

   /**
    * Look up options value by key
    * @method getOptions
    *
    * @param {string} key key
    * @return {Object} associated object
    */
   getOptions(key) {
       return this._optionsManager.getOptions(key);
   }

   /*
    *  Set internal options.
    *  No defaults options are set in View.
    *
    *  @method setOptions
    *  @param {Object} options
    */
   setOptions(options) {
       this._optionsManager.patch(options);
   }

   /**
    * Add a child renderable to the view.
    *   Note: This is meant to be used by an inheriting class
    *   rather than from outside the prototype chain.
    *
    * @method add
    * @return {RenderNode}
    * @protected
    */
   add() {
       return this._node.add.apply(this._node, arguments);
   }

   /**
    * duplicate for add
    * @method _add
    */
   _add() {
     return this._node.add.apply(this._node, arguments);
   }

   /**
    * Generate a render spec from the contents of this component.
    *
    * @private
    * @method render
    * @return {number} Render spec for this component
    */
   render() {
       return this._node.render();
   }

   /**
    * Return size of contained element.
    *
    * @method getSize
    * @return {Array.Number} [width, height]
    */
   getSize() {
       if (this._node && this._node.getSize) {
           return this._node.getSize.apply(this._node, arguments) || this.options.size;
       }
       else return this.options.size;
   }
 }
