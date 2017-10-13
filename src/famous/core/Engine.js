/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Context            from './Context.js';
import ElementAllocator   from './ElementAllocator.js';
import EventHandler       from './EventHandler.js';
import OptionsManager     from './OptionsManager.js';
import DOMBuffer          from './DOMBuffer.js';

/**
 * The singleton object initiated upon process
 *   startup which manages all active Context instances, runs
 *   the render dispatch loop, and acts as a listener and dispatcher
 *   for events.  All methods are therefore static.
 *
 *   On static initialization, window.requestAnimationFrame is called with
 *     the event loop function.
 *
 *   Note: Any window in which Engine runs will prevent default
 *     scrolling behavior on the 'touchmove' event.
 *
 * @static
 * @class Engine
 */
export default class Engine {

  static isWindowPerformance = (typeof window !== 'undefined' && window.performance && window.performance.now);

  /* Precise function for comparing time stamps*/
  static getTime() {
    return isWindowPerformance?window.performance.now():Date.now();
  }

  static contexts = [];

  static nextTickQueue = [];

  static currentFrame = 0;
  static nextTickFrame = 0;

  static deferQueue = [];

  /* The last timestamp of the previous frame */
  static lastTime = getTime();

  static frameTime;
  static frameTimeLimit;
  static loopEnabled = true;
  static eventForwarders = {};
  static eventHandler = new EventHandler();

  static initialized = false;
  static touchMoveEnabled = true;
  static canvas;

  static options = {
    containerType: 'div',
    containerClass: 'famous-container',
    fpsCap: undefined,
    runLoop: true,
    appMode: true
  }

  static optionsManager = new OptionsManager(options);

  /** @const */
  static MAX_DEFER_FRAME_TIME = 10;


  static PriorityLevels = {
    critical: Infinity,
    normal: 130,
    generous: 0
  }

  /**
   * Inside requestAnimationFrame loop, step() is called, which:
   *   calculates current FPS (throttling loop if it is over limit set in setFPSCap),
   *   emits dataless 'prerender' event on start of loop,
   *   calls in order any one-shot functions registered by nextTick on last loop,
   *   calls Context.update on all Context objects registered,
   *   and emits dataless 'postrender' event on end of loop.
   *
   * @static
   * @private
   * @method step
   */
  static step() {
    currentFrame++;
    nextTickFrame = currentFrame;

    var currentTime = getTime();

    this._lastFrameTimeDelta = currentTime - lastTime;
    // skip frame if we're over our framerate cap
    if (frameTimeLimit && this._lastFrameTimeDelta < frameTimeLimit) return;

    this._priorityLevel = Infinity;
    var priorityLevels = Object.keys(Engine.PriorityLevels);
    for (var i = 0; i < priorityLevels.length; i++) {
      var priority = priorityLevels[i];
      var priorityLevelCriteria = Engine.PriorityLevels[priority];
      if (this._lastFrameTimeDelta < priorityLevelCriteria && priorityLevelCriteria <= this._priorityLevel){
          this._priorityLevel = priorityLevelCriteria;
        }
    }

    frameTime = currentTime - lastTime;
    lastTime = currentTime;

    eventHandler.emit('prerender');

    // empty the queue
    var numFunctions = nextTickQueue.length;
    while (numFunctions--) (nextTickQueue.shift())(currentFrame);

    // limit total execution time for deferrable functions
    while (deferQueue.length && (getTime() - currentTime) < MAX_DEFER_FRAME_TIME) {
      deferQueue.shift().call(this);
    }

    for (var i = 0; i < contexts.length; i++) contexts[i].update();

    DOMBuffer.flushUpdates();

    eventHandler.emit('postrender');

  }

  /**
   * @example
   *
   * Engine.restrictAnimations({
   *  size: Engine.PriorityLevel.critical,
   *  opacity: Engine.PriorityLevel.critical
   * })
   *
   * Instructs the engine to disable the animations for the different properties passed.
   *
   * @param options
   */
  static restrictAnimations(options) {
    this._disableAnimationSpec = options;
  }

  static shouldPropertyAnimate(propertyName){
    if(!this._disableAnimationSpec){
      return true;
    }
    var priorityLevel = this._disableAnimationSpec[propertyName];
    if(priorityLevel === undefined){
      return true;
    }
    return this._priorityLevel < priorityLevel;
  }


  static getFrameTimeDelta() {
    return this._lastFrameTimeDelta;
  }

  //
  // Upon main document window resize (unless on an "input" HTML element):
  //   scroll to the top left corner of the window,
  //   and for each managed Context: emit the 'resize' event and update its size.
  // @param {Object=} event document event
  //
  handleResize(event) {
    for (var i = 0; i < contexts.length; i++) {
      contexts[i].emit('resize');
    }
    eventHandler.emit('resize');
  }

  static getPriorityLevel() {
    return this._priorityLevel;
  }

  static disableTouchMove() {
    if (this.touchMoveEnabled) {
      // prevent scrolling via browser
      window.addEventListener('touchmove', function (event) {
        if (event.target.tagName === 'TEXTAREA' || this.touchMoveEnabled) {
          return true;
        } else {
          event.preventDefault();
        }
      }.bind(this), { capture: true, passive: false });
      this.touchMoveEnabled = false;
    }
  };


  /**
   * Initialize famous for app mode
   *
   * @static
   * @private
   * @method initialize
   */
  static initialize() {
    addRootClasses();
  }

  static addRootClasses() {
    if (!document.body) {
      Engine.nextTick(addRootClasses);
      return;
    }

    document.body.classList.add('famous-root');
    document.documentElement.classList.add('famous-root');
  }


  static getCachedCanvas() {
    if(!canvas){
      canvas = document.createElement('canvas');
      document.createDocumentFragment().appendChild(canvas);
    }
    return canvas;
  }

  /**
   * Add event handler object to set of downstream handlers.
   *
   * @method pipe
   *
   * @param {EventHandler} target event handler target object
   * @return {EventHandler} passed event handler
   */
  static pipe(target) {
    if (target.subscribe instanceof Function) return target.subscribe(Engine);
    else return eventHandler.pipe(target);
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
  static unpipe(target) {
    if (target.unsubscribe instanceof Function) return target.unsubscribe(Engine);
    else return eventHandler.unpipe(target);
  };

  /**
   * Bind a callback function to an event type handled by this object.
   *
   * @static
   * @method "on"
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function(string, Object)} handler callback
   * @return {EventHandler} this
   */
  static on(type, handler) {
    if (!(type in eventForwarders)) {
      eventForwarders[type] = eventHandler.emit.bind(eventHandler, type);

      addEngineListener(type, eventForwarders[type]);
    }
    return eventHandler.on(type, handler);
  };

  addEngineListener(type, forwarder) {
    if (!document.body) {
      Engine.nextTick(addEventListener.bind(this, type, forwarder));
      return;
    }

    document.body.addEventListener(type, forwarder);
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
  static emit(type, event) {
    return eventHandler.emit(type, event);
  }

  /**
   * Unbind an event by type and handler.
   *   This undoes the work of "on".
   *
   * @static
   * @method removeListener
   *
   * @param {string} type event type key (for example, 'click')
   * @param {function} handler function object to remove
   * @return {EventHandler} internal event handler object (for chaining)
   */
  static removeListener(type, handler) {
    return eventHandler.removeListener(type, handler);
  }

  /**
   * Return the current calculated frames per second of the Engine.
   *
   * @static
   * @method getFPS
   *
   * @return {Number} calculated fps
   */
  static getFPS() {
    return 1000 / frameTime;
  }

  /**
   * Set the maximum fps at which the system should run. If internal render
   *    loop is called at a greater frequency than this FPSCap, Engine will
   *    throttle render and update until this rate is achieved.
   *
   * @static
   * @method setFPSCap
   *
   * @param {Number} fps maximum frames per second
   */
  static setFPSCap(fps) {
    frameTimeLimit = Math.floor(1000 / fps);
  } //TODO: check for trail

  /**
   * Return engine options.
   *
   * @static
   * @method getOptions
   * @param {string} key
   * @return {Object} engine options
   */
  static getOptions(key) {
    return optionsManager.getOptions(key);
  };

  /**
   * Set engine options
   *
   * @static
   * @method setOptions
   *
   * @param {Object} [options] overrides of default options
   * @param {Number} [options.fpsCap]  maximum fps at which the system should run
   * @param {boolean} [options.runLoop=true] whether the run loop should continue
   * @param {string} [options.containerType="div"] type of container element.  Defaults to 'div'.
   * @param {string} [options.containerClass="famous-container"] type of container element.  Defaults to 'famous-container'.
   */
  static setOptions(options) {
    return optionsManager.setOptions.apply(optionsManager, arguments);
  };

  /**
   * Creates a new Context for rendering and event handling with
   *    provided document element as top of each tree. This will be tracked by the
   *    process-wide Engine.
   *
   * @static
   * @method createContext
   *
   * @param {Node} el will be top of Famo.us document element tree
   * @return {Context} new Context within el
   */
  static createContext(el) {

    this._priorityLevel = Engine.PriorityLevels.critical;

    if (!initialized && options.appMode) Engine.nextTick(initialize.bind(this));

    var needMountContainer = false;
    if (!el) {
      el = document.createElement(options.containerType);
      el.classList.add(options.containerClass);
      needMountContainer = true;
    }

    var context = new Context();
    context.setPermanentElementAllocator(new ElementAllocator(el));
    Engine.registerContext(context);

    if (needMountContainer) mount(context, el);

    return context;
  };

  mount(context, el) {
    if (!document.body) {
      Engine.nextTick(mount.bind(this, context, el));
      return;
    }

    document.body.appendChild(el);
    context.emit('resize');
  }

  /**
   * Registers an existing context to be updated within the run loop.
   *
   * @static
   * @method registerContext
   *
   * @param {Context} context Context to register
   * @return {FamousContext} provided context
   */
  static registerContext(context) {
    contexts.push(context);
    return context;
  }

  /**
   * Returns a list of all contexts.
   *
   * @static
   * @method getContexts
   * @return {Array} contexts that are updated on each tick
   */
  static getContexts() {
    return contexts;
  }

  /**
   * Removes a context from the run loop. Note: this does not do any
   *     cleanup.
   *
   * @static
   * @method deregisterContext
   *
   * @param {Context} context Context to deregister
   */
  static deregisterContext(context) {
    var i = contexts.indexOf(context);
    if (i >= 0) contexts.splice(i, 1);
  }

  /**
   * Queue a function to be executed on the next tick of the
   *    Engine.
   *
   * @static
   * @method nextTick
   *
   * @param {function(Object)} fn function accepting window object
   */
  static nextTick(fn) {
    nextTickQueue.push(fn);
  }

  static now() {
    return getTime(...arguments);
  }

  /**
   * Queue a function to be executed sometime soon, at a time that is
   *    unlikely to affect frame rate.
   *
   * @static
   * @method defer
   *
   * @param {Function} fn
   */
  static defer(fn) {
    deferQueue.push(fn);
  }
}

// engage requestAnimationFrame
function loop() {
  if (options.runLoop) {
    Engine.step();
    window.requestAnimationFrame(loop);
  }
  else loopEnabled = false;
}

if (typeof window !== 'undefined') {
  window.requestAnimationFrame(loop);

  window.addEventListener('resize', Engine.handleResize, false);
  Engine.handleResize();

  //window.addEventListener('resize', handleResize, false);
  //handleResize();


  Engine.optionsManager.on('change', function (data) {
    if (data.id === 'fpsCap') Engine.setFPSCap(data.value);
    else if (data.id === 'runLoop') {
      // kick off the loop only if it was stopped
      if (!loopEnabled && data.value) {
        loopEnabled = true;
        window.requestAnimationFrame(loop);
      }
    }
  });
}
