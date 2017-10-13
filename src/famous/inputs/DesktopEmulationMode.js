/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


var hasTouch = 'ontouchstart' in window;

function kill(type) {
    window.addEventListener(type, function(event) {
        event.stopPropagation();
        return false;
    }, true);
}

if (hasTouch) {
    kill('mousedown');
    kill('mousemove');
    kill('mouseup');
    kill('mouseleave');
}
