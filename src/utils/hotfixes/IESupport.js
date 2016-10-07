/**
 * Created by tom on 21/01/16.
 */

import './Polyfills.js';
import './ZIndexSetter.js';
import browser                           from 'bowser';


console.log(browser.safari);
if (browser.safari) {
    !function (global) {
        var startY = 0;
        var enabled = false;
        var handleTouchmove = function (evt) {
            var el = evt.target;

            while (el !== document.body) {
                var style = window.getComputedStyle(el);
                var scrolling = style.getPropertyValue("-webkit-overflow-scrolling");
                var overflow = style.getPropertyValue("overflow");
                var height = parseInt(style.getPropertyValue("height"), 10);
                var isScrollable = scrolling === "touch" && overflow === "auto";
                var canScroll = el.scrollHeight > el.offsetHeight;
                if (isScrollable && canScroll) {
                    var curY = evt.touches ? evt.touches[0].screenY : evt.screenY;
                    var isAtTop = startY <= curY && el.scrollTop === 0;
                    var isAtBottom = startY >= curY && el.scrollHeight - el.scrollTop === height;
                    if (isAtTop || isAtBottom) {
                        evt.preventDefault();
                    }
                    return;
                }
                el = el.parentNode
            }
            evt.preventDefault()
        };
        var handleTouchstart = function (evt) {
            startY = evt.touches ? evt.touches[0].screenY : evt.screenY;
            var el = evt.target;
            while (el !== document.body) {
                var style = window.getComputedStyle(el);
                var scrolling = style.getPropertyValue("-webkit-overflow-scrolling");
                var overflow = style.getPropertyValue("overflow");
                var height = parseInt(style.getPropertyValue("height"), 10);
                var isScrollable = scrolling === "touch" && overflow === "auto";
                var canScroll = el.scrollHeight > el.offsetHeight;
                if (isScrollable && canScroll) {
                    var curY = evt.touches ? evt.touches[0].screenY : evt.screenY;
                    var isAtTop = startY <= curY && el.scrollTop === 0;
                    var isAtBottom = startY >= curY && el.scrollHeight - el.scrollTop === height;

                    if(isAtTop){
                        el.scrollTop = 1;
                    } else if(isAtBottom){
                        el.scrollTop = el.scrollHeight - height - 1;
                    }
                }
                el = el.parentNode
            }
        };
        var enable = function () {
            window.addEventListener("touchstart", handleTouchstart, false);
            window.addEventListener("touchmove", handleTouchmove, false);
            enabled = true
        };
        var disable = function () {
            window.removeEventListener("touchstart", handleTouchstart, false);
            window.removeEventListener("touchmove", handleTouchmove, false);
            enabled = false
        };
        var isEnabled = function () {
            return enabled
        };
        var scrollSupport = window.getComputedStyle(document.createElement("div"))["-webkit-overflow-scrolling"];
        if (typeof scrollSupport !== "undefined") {
            enable()
        }
        var iNoBounce = {enable: enable, disable: disable, isEnabled: isEnabled};
        if (typeof global.define === "function") {
            !function (define) {
                define(function () {
                    return iNoBounce
                })
            }(global.define)
        } else {
            global.iNoBounce = iNoBounce
        }
    }(window);
}
