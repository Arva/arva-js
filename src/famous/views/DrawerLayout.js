/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import RenderNode from '../core/RenderNode.js';
import Transform from '../core/Transform.js';
import OptionsManager from '../core/OptionsManager.js';
import Transitionable from '../transitions/Transitionable.js';
import EventHandler from '../core/EventHandler.js';

export default class DrawerLayout {
    /**
     * A layout which will arrange two renderables: a featured content, and a
     *   concealed drawer. The drawer can be revealed from any side of the
     *   content (left, top, right, bottom) by dragging the content.
     *
     *   A @link{Sync} must be piped in to recieve user input.
     *
     *   Events:
     *     broadcasts: 'open', 'close'
     *     listens to: 'update', 'end'
     *
     * @class DrawerLayout
     *
     * @constructor
     *
     * @param [options] {Object}                                An object of configurable options
     * @param [options.side=DrawerLayout.SIDES.LEFT] {Number}   The side of the content the drawer is placed.
     *                                                          Choice of DrawerLayout.SIDES.LEFT/RIGHT/TOP/BOTTOM
     * @param [options.drawerLength=0] {Number}                 The default length of the drawer
     * @param [options.velocityThreshold=0] {Number}            The velocity threshold to trigger a toggle
     * @param [options.positionThreshold=0] {Number}            The position threshold to trigger a toggle
     * @param [options.transition=true] {Boolean|Object}        The toggle transition
     */
    constructor(options) {
        this.options = Object.create(DrawerLayout.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._position = new Transitionable(0);
        this._direction = _getDirectionFromSide(this.options.side);
        this._orientation = _getOrientationFromSide(this.options.side);
        this._isOpen = false;
        this._cachedLength = 0;

        this.drawer = new RenderNode();
        this.content = new RenderNode();

        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();
        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._eventInput.on('update', this._handleUpdate);
        this._eventInput.on('end', this._handleEnd);
    }

    static DIRECTION_X = 0;
    static DIRECTION_Y = 1;

    static SIDES = {
        LEFT   : 0,
        TOP    : 1,
        RIGHT  : 2,
        BOTTOM : 3
    }

    static DEFAULT_OPTIONS = {
        side: DrawerLayout.SIDES.LEFT,
        drawerLength : 0,
        velocityThreshold : 0,
        positionThreshold : 0,
        transition : true
    }

    static _getDirectionFromSide(side) {
        let SIDES = DrawerLayout.SIDES;
        return (side === SIDES.LEFT || side === SIDES.RIGHT) ? DIRECTION_X : DIRECTION_Y;
    }

    static _getOrientationFromSide(side) {
        let SIDES = DrawerLayout.SIDES;
        return (side === SIDES.LEFT || side === SIDES.TOP) ? 1 : -1;
    }

    _resolveNodeSize(node) {
        let options = this.options;
        let size;
        if (options.drawerLength) size = options.drawerLength;
        else {
            let nodeSize = node.getSize();
            size = nodeSize ? nodeSize[this._direction] : options.drawerLength;
        }
        return this._orientation * size;
    }

    _handleUpdate(data) {
        let newPosition = this.getPosition() + data.delta;

        let MIN_LENGTH;
        let MAX_LENGTH;
        this._cachedLength = this._resolveNodeSize(this.drawer);

        if (this._orientation === 1){
            MIN_LENGTH = 0;
            MAX_LENGTH = this._cachedLength;
        }
        else {
            MIN_LENGTH = this._cachedLength;
            MAX_LENGTH = 0;
        }

        if (newPosition > MAX_LENGTH) newPosition = MAX_LENGTH;
        else if (newPosition < MIN_LENGTH) newPosition = MIN_LENGTH;

        this.setPosition(newPosition);
    }

    _handleEnd(data) {
        let velocity = data.velocity;
        let position = this._orientation * this.getPosition();
        let options = this.options;

        let MAX_LENGTH = this._orientation * this._cachedLength;
        let positionThreshold = options.positionThreshold || MAX_LENGTH / 2;
        let velocityThreshold = options.velocityThreshold;

        if (options.transition instanceof Object)
            options.transition.velocity = data.velocity;

        if (position === 0) {
            this._isOpen = false;
            return;
        }

        if (position === MAX_LENGTH) {
            this._isOpen = true;
            return;
        }

        let shouldToggle = Math.abs(velocity) > velocityThreshold || (!this._isOpen && position > positionThreshold) || (this._isOpen && position < positionThreshold);
        if (shouldToggle) this.toggle();
        else this.reset();
    }

    /**
     * Patches the DrawerLayout instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param options {Object} options
     */
    setOptions(options) {
        this._optionsManager.setOptions(options);
        if (options.side !== undefined) {
            this._direction = _getDirectionFromSide(options.side);
            this._orientation = _getOrientationFromSide(options.side);
        }
    }

    /**
     * Reveals the drawer with a transition
     *   Emits an 'open' event when an opening transition has been committed to.
     *
     * @method open
     * @param [transition] {Boolean|Object} transition definition
     * @param [callback] {Function}         callback
     */
    open(transition, callback) {
        if (transition instanceof Function) callback = transition;
        if (transition === undefined) transition = this.options.transition;
        this._cachedLength = _resolveNodeSize.call(this, this.drawer);
        this.setPosition(this._cachedLength, transition, callback);
        if (!this._isOpen) {
            this._isOpen = true;
            this._eventOutput.emit('open');
        }
    }

    /**
     * Conceals the drawer with a transition
     *   Emits a 'close' event when an closing transition has been committed to.
     *
     * @method close
     * @param [transition] {Boolean|Object} transition definition
     * @param [callback] {Function}         callback
     */
    close(transition, callback) {
        if (transition instanceof Function) callback = transition;
        if (transition === undefined) transition = this.options.transition;
        this.setPosition(0, transition, callback);
        if (this._isOpen){
            this._isOpen = false;
            this._eventOutput.emit('close');
        }
    }

    /**
     * Sets the position in pixels for the content's displacement
     *
     * @method setPosition
     * @param position {Number}             position
     * @param [transition] {Boolean|Object} transition definition
     * @param [callback] {Function}         callback
     */
    setPosition(position, transition, callback) {
        if (this._position.isActive()) this._position.halt();
        this._position.set(position, transition, callback);
    }

    /**
     * Gets the position in pixels for the content's displacement
     *
     * @method getPosition
     * @return position {Number} position
     */
    getPosition() {
        return this._position.get();
    }

    /**
     * Sets the progress (between 0 and 1) for the content's displacement
     *
     * @method setProgress
     * @param progress {Number}             position
     * @param [transition] {Boolean|Object} transition definition
     * @param [callback] {Function}         callback
     */
    setProgress(progress, transition, callback) {
        return this._position.set(progress * this._cachedLength, transition, callback);
    }

    /**
     * Gets the progress (between 0 and 1) for the content's displacement
     *
     * @method getProgress
     * @return position {Number} position
     */
    getProgress() {
        return this._position.get() / this._cachedLength;
    }

    /**
     * Toggles between open and closed states
     *
     * @method toggle
     * @param [transition] {Boolean|Object} transition definition
     */
    toggle(transition) {
        if (this._isOpen) this.close(transition);
        else this.open(transition);
    }

    /**
     * Resets to last state of being open or closed
     *
     * @method reset
     * @param [transition] {Boolean|Object} transition definition
     */
    reset(transition) {
        if (this._isOpen) this.open(transition);
        else this.close(transition);
    }

    /**
     * Returns if drawer is committed to being open or closed
     *
     * @method isOpen
     * @return {Boolean}
     */
    isOpen(transition) {
        return this._isOpen;
    }

    /**
     * Generates a Render Spec from the contents of this component
     *
     * @private
     * @method render
     * @return {Spec}
     */
    render() {
        let position = this.getPosition();

        // clamp transition on close
        if (!this._isOpen && (position < 0 && this._orientation === 1) || (position > 0 && this._orientation === -1)) {
            position = 0;
            this.setPosition(position);
        }

        let contentTransform = (this._direction === DIRECTION_X)
            ? Transform.translate(position, 0, 0)
            : Transform.translate(0, position, 0);

        return [
            {
                transform : Transform.behind,
                target: this.drawer.render()
            },
            {
                transform: contentTransform,
                target: this.content.render()
            }
        ];
    }
}
