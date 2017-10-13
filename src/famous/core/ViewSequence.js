/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 export default class ViewSequence {

   /**
    * Helper object used to iterate through items sequentially. Used in
    *   views that deal with layout.  A ViewSequence object conceptually points
    *   to a node in a linked list.
    *
    * @class ViewSequence
    *
    * @constructor
    * @param {Object|Array} options Options object, or content array.
    * @param {Number} [options.index] starting index.
    * @param {Number} [options.array] Array of elements to populate the ViewSequence
    * @param {Object} [options._] Optional backing store (internal
    * @param {Boolean} [options.loop] Whether to wrap when accessing elements just past the end
    *   (or beginning) of the sequence.
    */
   constructor(options) {
       if (!options) options = [];
       if (options instanceof Array) options = {array: options};

       this._ = null;
       this.index = options.index || 0;

       if (options.array) this._ = new Backing(options.array);
       else if (options._) this._ = options._;

       if (this.index === this._.firstIndex) this._.firstNode = this;
       if (this.index === this._.firstIndex + this._.array.length - 1) this._.lastNode = this;

       if (options.loop !== undefined) this._.loop = options.loop;

       if (options.trackSize !== undefined) this._.trackSize = options.trackSize;

       this._previousNode = null;
       this._nextNode = null;
   }



   /**
    * Return ViewSequence node previous to this node in the list, respecting looping if applied.
    *
    * @method getPrevious
    * @return {ViewSequence} previous node.
    */
   getPrevious() {
       let len = this._.array.length;
       if (!len) {
           this._previousNode = null;
       }
       else if (this.index === this._.firstIndex) {
           if (this._.loop) {
               this._previousNode = this._.lastNode || new (this.constructor)({_: this._, index: this._.firstIndex + len - 1});
               this._previousNode._nextNode = this;
           }
           else {
               this._previousNode = null;
           }
       }
       else if (!this._previousNode) {
           this._previousNode = new (this.constructor)({_: this._, index: this.index - 1});
           this._previousNode._nextNode = this;
       }
       return this._previousNode;
   }

   /**
    * Return ViewSequence node next after this node in the list, respecting looping if applied.
    *
    * @method getNext
    * @return {ViewSequence} previous node.
    */
   getNext() {
       let len = this._.array.length;
       if (!len) {
           this._nextNode = null;
       }
       else if (this.index === this._.firstIndex + len - 1) {
           if (this._.loop) {
               this._nextNode = this._.firstNode || new (this.constructor)({_: this._, index: this._.firstIndex});
               this._nextNode._previousNode = this;
           }
           else {
               this._nextNode = null;
           }
       }
       else if (!this._nextNode) {
           this._nextNode = new (this.constructor)({_: this._, index: this.index + 1});
           this._nextNode._previousNode = this;
       }
       return this._nextNode;
   }

   /**
    * Return index of the provided item in the backing array
    *
    * @method indexOf
    * @return {Number} index or -1 if not found
    */
   indexOf(item) {
       return this._.array.indexOf(item);
   }

   /**
    * Return index of this ViewSequence node.
    *
    * @method getIndex
    * @return {Number} index
    */
   getIndex() {
       return this.index;
   }

   /**
    * Return printable version of this ViewSequence node.
    *
    * @method toString
    * @return {string} this index as a string
    */
   toString() {
       return '' + this.index;
   }

   /**
    * Add one or more objects to the beginning of the sequence.
    *
    * @method unshift
    * @param {...Object} value arguments array of objects
    */
   unshift(value) {
       this._.array.unshift.apply(this._.array, arguments);
       this._.firstIndex -= arguments.length;
       if (this._.trackSize) this._.sizeDirty = true;
   }

   /**
    * Add one or more objects to the end of the sequence.
    *
    * @method push
    * @param {...Object} value arguments array of objects
    */
   push(value) {
       this._.array.push.apply(this._.array, arguments);
       if (this._.trackSize) this._.sizeDirty = true;
   }

   /**
    * Remove objects from the sequence
    *
    * @method splice
    * @param {Number} index starting index for removal
    * @param {Number} howMany how many elements to remove
    * @param {...Object} value arguments array of objects
    */
   splice(index, howMany) {
       let values = Array.prototype.slice.call(arguments, 2);
       this._.array.splice.apply(this._.array, [index - this._.firstIndex, howMany].concat(values));
       this._.reindex(index, howMany, values.length);
   }

   /**
    * Exchange this element's sequence position with another's.
    *
    * @method swap
    * @param {ViewSequence} other element to swap with.
    */
   swap(other) {
       let otherValue = other.get();
       let myValue = this.get();
       this._.setValue(this.index, otherValue);
       this._.setValue(other.index, myValue);

       let myPrevious = this._previousNode;
       let myNext = this._nextNode;
       let myIndex = this.index;
       let otherPrevious = other._previousNode;
       let otherNext = other._nextNode;
       let otherIndex = other.index;

       this.index = otherIndex;
       this._previousNode = (otherPrevious === this) ? other : otherPrevious;
       if (this._previousNode) this._previousNode._nextNode = this;
       this._nextNode = (otherNext === this) ? other : otherNext;
       if (this._nextNode) this._nextNode._previousNode = this;

       other.index = myIndex;
       other._previousNode = (myPrevious === other) ? this : myPrevious;
       if (other._previousNode) other._previousNode._nextNode = other;
       other._nextNode = (myNext === other) ? this : myNext;
       if (other._nextNode) other._nextNode._previousNode = other;

       if (this.index === this._.firstIndex) this._.firstNode = this;
       else if (this.index === this._.firstIndex + this._.array.length - 1) this._.lastNode = this;
       if (other.index === this._.firstIndex) this._.firstNode = other;
       else if (other.index === this._.firstIndex + this._.array.length - 1) this._.lastNode = other;
       if (this._.trackSize) this._.sizeDirty = true;
   }

   /**
    * Return value of this ViewSequence node.
    *
    * @method get
    * @return {Object} value of thiss
    */
   get() {
       return this._.getValue(this.index);
   }

   /**
    * Call getSize() on the contained View.
    *
    * @method getSize
    * @return {Array.Number} [width, height]
    */
   getSize() {
       let target = this.get();
       return target ? target.getSize() : null;
   }

   /**
    * Generate a render spec from the contents of this component.
    * Specifically, this will render the value at the current index.
    * @private
    * @method render
    * @return {number} Render spec for this component
    */
   render() {
       if (this._.trackSize && this._.sizeDirty) this._.calculateSize();
       let target = this.get();
       return target ? target.render.apply(target, arguments) : null;
   }

 }


 class Backing {

   // constructor for internal storage
   constructor(array) {
       this.array = array;
       this.firstIndex = 0;
       this.loop = false;
       this.firstNode = null;
       this.lastNode = null;
       this.cumulativeSizes = [[0, 0]];
       this.sizeDirty = true;
       this.trackSize = false;
   }

   // Get value "i" slots away from the first index.
   getValue(i) {
       let _i = i - this.firstIndex;
       if (_i < 0 || _i >= this.array.length) return null;
       return this.array[_i];
   }

   // Set value "i" slots away from the first index.
   setValue(i, value) {
       this.array[i - this.firstIndex] = value;
   }

   // Get sequence size from backing up to index
   // TODO: remove from viewSequence with proper abstraction
   getSize(index) {
       return this.cumulativeSizes[index];
   }

   // Calculates cumulative size
   // TODO: remove from viewSequence with proper abstraction
   calculateSize(index) {
       index = index || this.array.length;
       let size = [0, 0];
       for (let i = 0; i < index; i++) {
           let nodeSize = this.array[i].getSize();
           if (!nodeSize) return undefined;
           if (size[0] !== undefined) {
               if (nodeSize[0] === undefined) size[0] = undefined;
               else size[0] += nodeSize[0];
           }
           if (size[1] !== undefined) {
               if (nodeSize[1] === undefined) size[1] = undefined;
               else size[1] += nodeSize[1];
           }
           this.cumulativeSizes[i + 1] = size.slice();
       }
       this.sizeDirty = false;
       return size;
   }

   // After splicing into the backing store, restore the indexes of each node correctly.
   reindex(start, removeCount, insertCount) {
       if (!this.array[0]) return;

       let i = 0;
       let index = this.firstIndex;
       let indexShiftAmount = insertCount - removeCount;
       let node = this.firstNode;

       // find node to begin
       while (index < start - 1) {
           node = node.getNext();
           index++;
       }
       // skip removed nodes
       let spliceStartNode = node;
       for (i = 0; i < removeCount; i++) {
           node = node.getNext();
           if (node) node._previousNode = spliceStartNode;
       }
       let spliceResumeNode = node ? node.getNext() : null;
       // generate nodes for inserted items
       spliceStartNode._nextNode = null;
       node = spliceStartNode;
       for (i = 0; i < insertCount; i++) node = node.getNext();
       index += insertCount;
       // resume the chain
       if (node !== spliceResumeNode) {
           node._nextNode = spliceResumeNode;
           if (spliceResumeNode) spliceResumeNode._previousNode = node;
       }
       if (spliceResumeNode) {
           node = spliceResumeNode;
           index++;
           while (node && index < this.array.length + this.firstIndex) {
               if (node._nextNode) node.index += indexShiftAmount;
               else node.index = index;
               node = node.getNext();
               index++;
           }
       }
       if (this.trackSize) this.sizeDirty = true;
   }
 }
