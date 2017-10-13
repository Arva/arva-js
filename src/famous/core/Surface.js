/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import ElementOutput           from './ElementOutput.js';
import DOMBuffer               from './DOMBuffer.js';
import {RenderablePrototype}   from '../utilities/RenderablePrototype.js';



/**
 * A base class for viewable content and event
 *   targets inside a Famo.us application, containing a renderable document
 *   fragment. Like an HTML div, it can accept internal markup,
 *   properties, classes, and handle events.
 *
 * @class Surface
 * @constructor
 *
 * @param {Object} [options] default option overrides
 * @param {Array.Number} [options.size] [width, height] in pixels
 * @param {Array.string} [options.classes] CSS classes to set on target div
 * @param {Array} [options.properties] string dictionary of CSS properties to set on target div
 * @param {Array} [options.attributes] string dictionary of HTML attributes to set on target div
 * @param {string} [options.content] inner (HTML) content of surface
 */
 export default class Surface extends ElementOutput {

   static elementType = 'div';
   static elementClass = 'famous-surface';


   constructor(options) {

     super(options);

     this.options = {};

     this.properties = {};
     this.attributes = {};
     this.content = '';
     this.classList = [];
     this.size = null;

     this._classesDirty = true;
     this._stylesDirty = true;
     this._attributesDirty = true;
     this._sizeDirty = true;
     this._contentDirty = true;
     this._trueSizeCheck = true;

     this._dirtyClasses = [];
     this._dirtyAttributes = [];

     if (options) this.setOptions(options);
     this.options = options || {};

     this._currentTarget = null;
   }

   /**
    * Set HTML attributes on this Surface. Note that this will cause
    *    dirtying and thus re-rendering, even if values do not change.
    *
    * @method setAttributes
    * @param {Object} attributes property dictionary of "key" => "value"
    */
   setAttributes(attributes) {
     for (let n in attributes) {
       if (n === 'style') throw new Error('Cannot set styles via "setAttributes". Use "setProperties" instead.');
       this.attributes[n] = attributes[n];
       /* Remove the attribute that is about to be removed, if applicable */
       let attributeToBeRemovedIndex = this._dirtyAttributes.indexOf(n);
       if (attributeToBeRemovedIndex !== -1) {
         this._dirtyAttributes.splice(attributeToBeRemovedIndex, 1);
       }
     }
     this._attributesDirty = true;
   }

   /**
    * Get HTML attributes on this Surface.
    *
    * @method getAttributes
    *
    * @return {Object} Dictionary of this Surface's attributes.
    */
   getAttributes() {
     return this.attributes;
   }

   /**
    * Removes existing attributes from this Surface (e.g. needed for 'disabled').
    * @method removeAttributes
    * @param {Array} attributes List of attribute names to remove
    */
   removeAttributes(attributes) {
     for (let index in attributes) {
       let name = attributes[index];
       delete this.attributes[name];
       this._dirtyAttributes.push(name);
     }
     this._attributesDirty = true;
   }

   /**
    * Set CSS-style properties on this Surface. Note that this will cause
    *    dirtying and thus re-rendering, even if values do not change.
    *
    * @method setProperties
    * @chainable
    * @param {Object} properties property dictionary of "key" => "value"
    */
   setProperties(properties) {
     for (let n in properties) {
       if(this.properties[n] !== properties[n]){
         this.properties[n] = properties[n];
         this._stylesDirty = true;
       }
     }
     return this;
   }

   /**
    * Get CSS-style properties on this Surface.
    *
    * @method getProperties
    *
    * @return {Object} Dictionary of this Surface's properties.
    */
   getProperties() {
     return this.properties;
   }

   /**
    * Add CSS-style class to the list of classes on this Surface. Note
    *   this will map directly to the HTML property of the actual
    *   corresponding rendered <div>.
    *
    * @method addClass
    * @chainable
    * @param {string} className name of class to add
    */
   addClass(className) {
     if (this.classList.indexOf(className) < 0) {
       this.classList.push(className);
       this._classesDirty = true;
     }
     return this;
   }

   /**
    * Remove CSS-style class from the list of classes on this Surface.
    *   Note this will map directly to the HTML property of the actual
    *   corresponding rendered <div>.
    *
    * @method removeClass
    * @chainable
    * @param {string} className name of class to remove
    */
   removeClass(className) {
     let i = this.classList.indexOf(className);
     if (i >= 0) {
       this._dirtyClasses.push(this.classList.splice(i, 1)[0]);
       this._classesDirty = true;
     }
     return this;
   }

   /**
    * Toggle CSS-style class from the list of classes on this Surface.
    *   Note this will map directly to the HTML property of the actual
    *   corresponding rendered <div>.
    *
    * @method toggleClass
    * @param {string} className name of class to toggle
    */
   toggleClass(className) {
     let i = this.classList.indexOf(className);
     if (i >= 0) {
       this.removeClass(className);
     } else {
       this.addClass(className);
     }
     return this;
   }

   /**
    * Reset class list to provided dictionary.
    * @method setClasses
    * @chainable
    * @param {Array.string} classList
    */
   setClasses(classList) {
     let i = 0;
     let removal = [];
     for (i = 0; i < this.classList.length; i++) {
       if (classList.indexOf(this.classList[i]) < 0) removal.push(this.classList[i]);
     }
     for (i = 0; i < removal.length; i++) this.removeClass(removal[i]);
     // duplicates are already checked by addClass()
     for (i = 0; i < classList.length; i++) this.addClass(classList[i]);
     return this;
   }

   static with(options) {
     /* Make an inherited version of the surface */
     return new RenderablePrototype(this, options);
   }

   /**
    * Return inner (HTML) content of this surface.
    *
    * @method getContent
    *
    * @return {string} inner (HTML) content
    */
   getContent() {
     return this.content;
   }

   /**
    * Get array of CSS-style classes attached to this div.
    *
    * @method getClasslist
    * @return {Array.string} array of class names
    */
   getClassList() {
     return this.classList;
   }

   /**
    * Set or overwrite inner (HTML) content of this surface. Note that this
    *    causes a re-rendering if the content has changed.
    *
    * @method setContent
    * @chainable
    * @param {string|Document Fragment} content HTML content
    */
   setContent(content) {
     if (this.content !== content) {
       this.content = content;
       this._contentDirty = true;
     }
     return this;
   }

   /**
    * Set options for this surface
    *
    * @method setOptions
    * @chainable
    * @param {Object} [options] overrides for default options.  See constructor.
    */
   setOptions(options) {
     if(!options){
       options = {};
     }
     if (options.size) this.setSize(options.size);
     if (options.classes) this.setClasses(options.classes);
     if (options.properties) this.setProperties(options.properties);
     if (options.attributes) this.setAttributes(options.attributes);
     if (options.content !== undefined) this.setContent(options.content);
     this.options = options;
     return this;
   }

   /**
    * Set options for this surface
    *
    * @method setOptions
    * @chainable
    * @param {Object} [options] overrides for default options.  See constructor.
    */
   setNewOptions(options) {
     this.setClasses([]);
     /* Properties need to be set manually as well since setProperties only extend the properties, and not
      *  resetting them */
     this.properties = {};
     this.setProperties({});
     this.setAttributes({});
     this.setContent(null);
     this.setOptions(options);
     return this;
   }

   //  Apply to document all changes from removeClass() since last setup().
   _cleanupClasses(target) {
     for (let i = 0; i < this._dirtyClasses.length; i++) DOMBuffer.removeFromObject(target.classList, this._dirtyClasses[i]);
     this._dirtyClasses = [];
   }

   // Apply values of all Famous-managed styles to the document element.
   //  These will be deployed to the document on call to #setup().
   _applyStyles(target) {
     for (let n in this.properties) {
       DOMBuffer.assignProperty(target.style, n, this.properties[n]);
     }
   }

   // Clear all Famous-managed styles from the document element.
   // These will be deployed to the document on call to #setup().
   _cleanupStyles(target) {
     for (let n in this.properties) {
       DOMBuffer.assignProperty(target.style, n, '');
     }
   }

   //  Apply values of all Famous-managed attributes to the document element.
   //  These will be deployed to the document on call to #setup().
   _applyAttributes(target) {
     for (let n in this.attributes) {
       DOMBuffer.setAttribute(target, n, this.attributes[n]);
     }
     for (let index in this._dirtyAttributes) {
       let name = this._dirtyAttributes[index];
       DOMBuffer.removeAttribute(target, name);
       this._dirtyAttributes.shift();
     }
   }

   // Clear all Famous-managed attributes from the document element.
   // These will be deployed to the document on call to #setup().
   _cleanupAttributes(target) {
     for (let n in this.attributes) {
       DOMBuffer.removeAttribute(target, n);
     }
     DOMBuffer.removeAttribute(target, 'data-arvaid');
   }

   _xyNotEquals(a, b) {
     return (a && b) ? (a[0] !== b[0] || a[1] !== b[1]) : a !== b;
   }

   /**
    * One-time setup for an element to be ready for commits to document.
    *
    * @private
    * @method setup
    *
    * @param {ElementAllocator} allocator document element pool for this context
    */
   setup(allocator) {
     let target = this.allocate(allocator);
     if (this.elementClass) {
       if (this.elementClass instanceof Array) {
         for (var i = 0; i < this.elementClass.length; i++) {
           DOMBuffer.addToObject(target.classList, this.elementClass[i]);
         }
       }
       else {
         DOMBuffer.addToObject(target.classList, this.elementClass);
       }
     }
     DOMBuffer.assignProperty(target.style, 'display', '');
     this.attach(target);
     this._opacity = null;
     this._currentTarget = target;
     this._stylesDirty = true;
     this._classesDirty = true;
     this._attributesDirty = true;
     this._sizeDirty = true;
     this._contentDirty = true;
     this._originDirty = true;
     this._transformDirty = true;
   }

   deallocate(allocator, target) {
     return allocator.deallocate(target);
   }

   allocate(allocator) {
     return allocator.allocate({ type: this.elementType });
   }

   /**
    * Apply changes from this component to the corresponding document element.
    * This includes changes to classes, styles, size, content, opacity, origin,
    * and matrix transforms.
    *
    * @private
    * @method commit
    * @param {Context} context commit context
    */
   commit(context) {
     if (!this._currentTarget) this.setup(context.allocator);
     let target = this._currentTarget;
     let size = context.size;

     if (this._classesDirty) {
       _cleanupClasses.call(this, target);
       let classList = this.getClassList();
       for (let i = 0; i < classList.length; i++) target.classList.add(classList[i]);
       this._classesDirty = false;
       this._trueSizeCheck = true;
     }

     if (this._stylesDirty) {
       _applyStyles.call(this, target);
       this._stylesDirty = false;
       this._trueSizeCheck = true;
     }

     if (this._attributesDirty) {
       _applyAttributes.call(this, target);
       this._attributesDirty = false;
       this._trueSizeCheck = true;
     }

     if (this.size) {
       let origSize = context.size;
       size = [this.size[0], this.size[1]];
       if (size[0] === undefined) size[0] = origSize[0];
       if (size[1] === undefined) size[1] = origSize[1];
       if (size[0] === true || size[1] === true) {
         if (size[0] === true) {
           if (this._trueSizeCheck) {
             let width = target.offsetWidth;
             if (this._size && this._size[0] !== width) {
               this._size[0] = width;
               this._sizeDirty = true;
             }
             size[0] = width;
           } else {
             if (this._size) size[0] = this._size[0];
           }
         }
         if (size[1] === true) {
           if (this._trueSizeCheck) {
             let height = target.offsetHeight;
             if (this._size && this._size[1] !== height) {
               this._size[1] = height;
               this._sizeDirty = true;
             }
             size[1] = height;
           } else {
             if (this._size) size[1] = this._size[1];
           }
         }
         this._trueSizeCheck = false;
       }
     }

     if (_xyNotEquals(this._size, size)) {
       if (!this._size) this._size = [0, 0];
       this._size[0] = size[0];
       this._size[1] = size[1];

       this._sizeDirty = true;
     }

     if (this._sizeDirty) {
       if (this._size) {
         let resolvedWidth = this.size && this.size[0] === true || this._size[0] === true ? '' : this._size[0] + 'px';
         let resolvedHeight = this.size && this.size[1] === true || this._size[1] === true ? '' : this._size[1] + 'px';
         DOMBuffer.assignProperty(target.style, 'width', resolvedWidth);
         DOMBuffer.assignProperty(target.style, 'height', resolvedHeight);
       }
       this._eventOutput.emit('resize');
       this._sizeDirty = false;
     }

     if (this._contentDirty) {
       this.deploy(target);
       this._eventOutput.emit('deploy');
       this._contentDirty = false;
       this._trueSizeCheck = true;
     }

     super.commit(context);
   }

   /**
    *  Remove all Famous-relevant attributes from a document element.
    *    This is called by SurfaceManager's detach().
    *    This is in some sense the reverse of .deploy().
    *
    * @private
    * @method cleanup
    * @param {ElementAllocator} allocator
    */
   cleanup(allocator) {
     /* If clean-up done twice, return. This happens when a surface is cleaned up from
      * one context (e.g. group) and needs to be removed from another context that used to
      * display this surface. */
     if (!this._currentTarget) {
       return;
     }
     let i = 0;
     let target = this._currentTarget;
     this._eventOutput.emit('recall');
     this.recall(target);
     DOMBuffer.assignProperty(target.style, 'display', 'none');
     DOMBuffer.assignProperty(target.style, 'opacity', '');
     DOMBuffer.assignProperty(target.style, 'width', '');
     DOMBuffer.assignProperty(target.style, 'height', '');
     _cleanupStyles.call(this, target);
     _cleanupAttributes.call(this, target);
     var classList = this.getClassList();
     _cleanupClasses.call(this, target);
     for (i = 0; i < classList.length; i++) target.classList.remove(classList[i]);
     if (this.elementClass) {
       if (this.elementClass instanceof Array) {
         for (i = 0; i < this.elementClass.length; i++) {
           DOMBuffer.removeFromObject(target.classList, this.elementClass[i]);
         }
       }
       else {
         DOMBuffer.removeFromObject(target.classList, this.elementClass);
       }
     }
     this.detach(target);
     this._currentTarget = null;
     this.deallocate(allocator, target);
   }

   /**
    * Place the document element that this component manages into the document.
    *
    * @private
    * @method deploy
    * @param {Node} target document parent of this container
    */
   deploy(target) {
     var content = this.getContent();

     if (content instanceof Node) {
       var children = target.childNodes || [];
       //TODO Confirm that this works
       for (let i = 0; i < children.length; i++) {
         DOMBuffer.removeChild(target, children[i]);
       }
       DOMBuffer.appendChild(target, content);
     } else {
       /* textContent proved to be faster than innerHTML: https://jsperf.com/innerhtml-vs-textcontent-with-checks/1 */
       if (!this.options.encodeHTML && content && content.includes && content.includes('<')) {
         DOMBuffer.assignProperty(target, 'innerHTML', content);
         DOMBuffer.setAttributeOnDescendants(target, 'data-arvaid', this.id);
       } else {
         DOMBuffer.assignProperty(target, 'textContent', content);
       }
     }
   }

   /**
    * FIX for famous-bug: https://github.com/Famous/famous/issues/673
    *
    * There is a bug in recall which causes the latest setContent()
    * call to be ignored, if the element is removed from the DOM in
    * the next render-cycle.
    */
   recall(target) {
     let df = document.createDocumentFragment();
     let children = target.childNodes || [];
     //TODO Confirm that this works
     for (var i = 0; i < children.length; i++) {
       DOMBuffer.appendChild(df, children[i]);
     }
     this._contentDirty = true;
   }

   /**
    *  Get the x and y dimensions of the surface.
    *
    * @method getSize
    * @return {Array.Number} [x,y] size of surface
    */
   getSize() {
     return this._size ? this._size : this.size;
   }

   /**
    * Set x and y dimensions of the surface.
    *
    * @method setSize
    * @chainable
    * @param {Array.Number} size as [width, height]
    */
   setSize(size) {
     this.size = size ? [size[0], size[1]] : null;
     this._sizeDirty = true;
     return this;
   }
 }
