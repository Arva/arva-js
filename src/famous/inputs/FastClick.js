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
 * FastClick is an override shim which maps event pairs of
 *   'touchstart' and 'touchend' which differ by less than a certain
 *   threshold to the 'click' event.
 *   This is used to speed up clicks on some browsers.
 */
(function() {
  if (!window.CustomEvent) return;
  var clickThreshold = 300;
  var clickWindow = 500;
  var potentialClicks = {};
  var recentlyDispatched = {};
  var _now = Date.now;

  window.addEventListener('touchstart', function(event) {
      var timestamp = _now();
      for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          potentialClicks[touch.identifier] = timestamp;
      }
  });

  window.addEventListener('touchmove', function(event) {
      for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          delete potentialClicks[touch.identifier];
      }
  });

  window.addEventListener('touchend', function(event) {
      var currTime = _now();
      for (var i = 0; i < event.changedTouches.length; i++) {
          var touch = event.changedTouches[i];
          var startTime = potentialClicks[touch.identifier];
          if (startTime && currTime - startTime < clickThreshold) {
              var clickEvt = new window.CustomEvent('click', {
                  'bubbles': true,
                  'detail': touch
              });
              recentlyDispatched[currTime] = event;
              event.currentTarget.dispatchEvent(clickEvt);
          }
          delete potentialClicks[touch.identifier];
      }
  });

  window.addEventListener('click', function(event) {
      var currTime = _now();
      for (var i in recentlyDispatched) {
          var previousEvent = recentlyDispatched[i];
          if (currTime - i < clickWindow) {
              if (event instanceof window.MouseEvent && event.currentTarget === previousEvent.currentTarget) event.stopPropagation();
          }
          else delete recentlyDispatched[i];
      }
  }, true);
})();
