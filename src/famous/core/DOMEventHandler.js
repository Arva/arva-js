/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
* any variations, changes and additions are NPOSL-3 licensed.
*
* @authors Karl Lundfall, Hans van den Akker
* @license NPOSL-3.0
* @copyright Famous Industries, Inc. 2015, Arva 2015-2017
* This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
* this class to ES6 for purpose of unifying Arva's development environment.
*/
import EventEmitter   from './EventEmitter.js';
import DOMBuffer      from './DOMBuffer.js';


export default class DOMEventHandler {

  static iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  static singleElementEvents = [
      'submit', 'focus', 'blur', 'load', 'unload', 'change', 'reset', 'scroll'
    ].concat(DOMEventHandler.iOS ? ['click', 'touchstart', 'touchend'] : []);

    static initializedListeners = {};

    static isNativeEvent(eventName) {
      return typeof document.body["on" + eventName] !== "undefined"
        ||
          /* Needed because otherwise not able to use mobile emulation in browser! */
        ['touchmove', 'touchstart', 'touchend'].includes(eventName)
    }

    static addEventListener(id, element, type, callback){
      if(!DOMEventHandler.isNativeEvent(type)){
        return;
      }

      if(singleElementEvents.includes(type)){
        return element.addEventListener(type, callback);
      }
      DOMBuffer.setAttribute(element, 'data-arvaid', id); //TODO see if this can be replaced by symbols for performance
      let eventEmitter = DOMEventHandler.initializedListeners[type];
      if(!eventEmitter){
        eventEmitter = DOMEventHandler.initializedListeners[type] = new EventEmitter();
        window.addEventListener(type, function (event) {
          let target = event.target;
          let receivedID = target && target.getAttribute && target.getAttribute('data-arvaid');
          if(receivedID){
            eventEmitter.emit(receivedID, event);
          }
        }, {passive: true});
      }
      eventEmitter.on(id, callback);
    }

    static removeEventListener(element, id, type, callback) {
      if(singleElementEvents.includes(type)){
        return element.removeEventListener(type, callback);
      }
      if(DOMEventHandler.initializedListeners[type]){
        DOMEventHandler.initializedListeners[type].removeListener(id, callback);
      }
    }
}
