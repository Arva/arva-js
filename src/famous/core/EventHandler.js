/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

 /**
  * EventHandler forwards received events to a set of provided callback functions.
  * It allows events to be captured, processed, and optionally piped through to other event handlers.
  *
  * @class EventHandler
  * @extends EventEmitter
  * @constructor
  */
 export default class EventHandler extends EventEmitter {

   constructor() {
     super(arguments);

     this.downstream = []; // downstream event handlers
     this.downstreamFn = []; // downstream functions

     this.upstream = []; // upstream event handlers
     this.upstreamListeners = {}; // upstream listeners
   }

   /**
    * Assign an event handler to receive an object's input events.
    *
    * @method setInputHandler
    * @static
    *
    * @param {Object} object object to mix trigger, subscribe, and unsubscribe functions into
    * @param {EventHandler} handler assigned event handler
    */
   static setInputHandler(object, handler) {
     object.trigger = handler.trigger.bind(handler);
     if (handler.subscribe && handler.unsubscribe) {
       object.subscribe = handler.subscribe.bind(handler);
       object.unsubscribe = handler.unsubscribe.bind(handler);
     }
   };

   /**
    * Assign an event handler to receive an object's output events.
    *
    * @method setOutputHandler
    * @static
    *
    * @param {Object} object object to mix pipe, unpipe, on, addListener, and removeListener functions into
    * @param {EventHandler} handler assigned event handler
    */
   static setOutputHandler(object, handler) {
     if (handler instanceof EventHandler) handler.bindThis(object);
     object.pipe = handler.pipe.bind(handler);
     object.unpipe = handler.unpipe.bind(handler);
     object.on = handler.on.bind(handler);
     object.once = handler.once.bind(handler);
     object.addListener = object.on;
     object.removeListener = handler.removeListener.bind(handler);
     object.replaceListeners = handler.replaceListeners.bind(handler);
   };

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
     super.emit(type, event);
     //EventEmitter.prototype.emit.apply(this, arguments);
     let i = 0;
     for (i = 0; i < this.downstream.length; i++) {
       if (this.downstream[i].trigger) this.downstream[i].trigger(type, event);
     }
     for (i = 0; i < this.downstreamFn.length; i++) {
       this.downstreamFn[i](type, event);
     }
     return this;
   }

   /**
    * Alias for emit
    * @method addListener
    */
   trigger() {
     return this.emit(arguments);
   }
   //EventHandler.prototype.trigger = EventHandler.prototype.emit;

   /**
    * Add event handler object to set of downstream handlers.
    *
    * @method pipe
    *
    * @param {EventHandler} target event handler target object
    * @return {EventHandler} passed event handler
    */
   pipe(target) {
     if (target.subscribe instanceof Function) return target.subscribe(this);

     let downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
     let index = downstreamCtx.indexOf(target);
     if (index < 0) downstreamCtx.push(target);

     if (target instanceof Function) target('pipe', null);
     else if (target.trigger) target.trigger('pipe', null);

     return target;
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
     if (target.unsubscribe instanceof Function) return target.unsubscribe(this);

     let downstreamCtx = (target instanceof Function) ? this.downstreamFn : this.downstream;
     let index = downstreamCtx.indexOf(target);
     if (index >= 0) {
       downstreamCtx.splice(index, 1);
       if (target instanceof Function) target('unpipe', null);
       else if (target.trigger) target.trigger('unpipe', null);
       return target;
     }
     else return false;
   }

   /**
    * Bind a callback function to an event type handled by this object.
    *
    * @method "on"
    *
    * @param {string} type event type key (for example, 'click')
    * @param {function(string, Object)} handler callback
    * @param {Object} options options
    * @param {Boolean} [options.propagate] defaults to true. If the events should bubble
    * @return {EventHandler} this
    */
   on(type, handler, options) {
     options = options || {};
     let listenUpstream = options.propagate;
     if(listenUpstream === undefined){
       listenUpstream = true;
     }
     EventEmitter.prototype.on.call(this, type, handler, options);
     if (!(type in this.upstreamListeners) && listenUpstream) {
       var upstreamListener = this.emit.bind(this, type);
       /* Make sure that the options are passed along */
       upstreamListener._handlerOptions = options || handler._handlerOptions;
       this.upstreamListeners[type] = upstreamListener;
       for (var i = 0; i < this.upstream.length; i++) {
         this.upstream[i].on(type, upstreamListener, options);
       }
     }
     return this;
   }

   onOwnEvent(type, handler) {
     return this.on(type, handler, false);
   }

   onceOwnEvent(type, handler) {
     return this.once(type, handler, false);
   }

     /**
    * Listens once
    * @param type
    * @param handler
    * @param {Object} options options
    * @param {Boolean} [options.propagate] Whether we should listen for bubbled events
    * @returns {EventHandler}
    */
   once(type, handler, options) {
       options = options || {};
       let propagate = options.propagate;
       if(propagate === undefined)
         propagate = true;
       return super.once(type, handler, {propagate: propagate});
     }

   /**
    * Alias for "on"
    * @method addListener
    */
    addListener() {
      return this.on(arguments);
    }
   //EventHandler.prototype.addListener = EventHandler.prototype.on;

   /**
    * Listen for events from an upstream event handler.
    *
    * @method subscribe
    *
    * @param {EventEmitter} source source emitter object
    * @param options
    * @return {EventHandler} this
    */
   subscribe(source, options) {
     let index = this.upstream.indexOf(source);
     if (index < 0) {
       this.upstream.push(source);
       for (var type in this.upstreamListeners) {
         var handler = this.upstreamListeners[type];
         source.on(type, this.upstreamListeners[type], options);
       }
     }
     return this;
   }

   /**
    * Stop listening to events from an upstream event handler.
    *
    * @method unsubscribe
    *
    * @param {EventEmitter} source source emitter object
    * @return {EventHandler} this
    */
   unsubscribe(source) {
     let index = this.upstream.indexOf(source);
     if (index >= 0) {
       this.upstream.splice(index, 1);
       for (let type in this.upstreamListeners) {
         source.removeListener(type, this.upstreamListeners[type]);
       }
     }
     return this;
   }
 }
