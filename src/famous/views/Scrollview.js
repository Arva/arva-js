/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */


import PhysicsEngine from '../physics/PhysicsEngine.js';
import Particle from '../physics/Particle.js';
import Drag from '../physics/Drag.js';
import Spring from '../physics/Spring.js';

import EventHandler from '../core/EventHandler.js';
import OptionsManager from '../core/OptionsManager.js';
import ViewSequence from '../core/ViewSequence.js';
import Scroller from '../views/Scroller.js';
import Utility from '../utilities/Utility.js';

import GenericSync from '../inputs/GenericSync.js';
import MouseSync from '../inputs/MouseSync.js';
import TouchSync from '../inputs/TouchSync.js';

GenericSync.register({scroll : ScrollSync, touch : TouchSync});


export default class ScrollView {


    /** @const */
    static TOLERANCE = 0.5;

    /** @enum */
    static SpringStates = {
        NONE: 0,
        EDGE: 1,
        PAGE: 2
    };

    /** @enum */
    static EdgeStates = {
        TOP:   -1,
        NONE:   0,
        BOTTOM: 1
    };

    /**
     * Scrollview will lay out a collection of renderables sequentially in the specified direction, and will
     * allow you to scroll through them with mousewheel or touch events.
     * @class Scrollview
     * @constructor
     * @param {Options} [options] An object of configurable options.
     * @param {Number} [options.direction=Utility.Direction.Y] Using the direction helper found in the famous Utility
     * module, this option will lay out the Scrollview instance's renderables either horizontally
     * (x) or vertically (y). Utility's direction is essentially either zero (X) or one (Y), so feel free
     * to just use integers as well.
     * @param {Boolean} [options.rails=true] When true, Scrollview's genericSync will only process input in it's primary access.
     * @param {Number} [clipSize=undefined] The size of the area (in pixels) that Scrollview will display content in.
     * @param {Number} [margin=undefined] The size of the area (in pixels) that Scrollview will process renderables' associated calculations in.
     * @param {Number} [friction=0.001] Input resistance proportional to the velocity of the input.
     * Controls the feel of the Scrollview instance at low velocities.
     * @param {Number} [drag=0.0001] Input resistance proportional to the square of the velocity of the input.
     * Affects Scrollview instance more prominently at high velocities.
     * @param {Number} [edgeGrip=0.5] A coefficient for resistance against after-touch momentum.
     * @param {Number} [egePeriod=300] Sets the period on the spring that handles the physics associated
     * with hitting the end of a scrollview.
     * @param {Number} [edgeDamp=1] Sets the damping on the spring that handles the physics associated
     * with hitting the end of a scrollview.
     * @param {Boolean} [paginated=false] A paginated scrollview will scroll through items discretely
     * rather than continously.
     * @param {Number} [pagePeriod=500] Sets the period on the spring that handles the physics associated
     * with pagination.
     * @param {Number} [pageDamp=0.8] Sets the damping on the spring that handles the physics associated
     * with pagination.
     * @param {Number} [pageStopSpeed=Infinity] The threshold for determining the amount of velocity
     * required to trigger pagination. The lower the threshold, the easier it is to scroll continuosly.
     * @param {Number} [pageSwitchSpeed=1] The threshold for momentum-based velocity pagination.
     * @param {Number} [speedLimit=10] The highest scrolling speed you can reach.
     */
    constructor(options) {
        // patch options with defaults
        this.options = Object.create(Scrollview.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);

        // create sub-components
        this._scroller = new Scroller(this.options);

        this.sync = new GenericSync(
            ['scroll', 'touch'],
            {
                direction : this.options.direction,
                scale : this.options.syncScale,
                rails: this.options.rails,
                preventDefault: this.options.preventDefault !== undefined
                    ? this.options.preventDefault
                    : this.options.direction !== Utility.Direction.Y
            }
        );

        this._physicsEngine = new PhysicsEngine();
        this._particle = new Particle();
        this._physicsEngine.addBody(this._particle);

        this.spring = new Spring({
            anchor: [0, 0, 0],
            period: this.options.edgePeriod,
            dampingRatio: this.options.edgeDamp
        });
        this.drag = new Drag({
            forceFunction: Drag.FORCE_FUNCTIONS.QUADRATIC,
            strength: this.options.drag
        });
        this.friction = new Drag({
            forceFunction: Drag.FORCE_FUNCTIONS.LINEAR,
            strength: this.options.friction
        });

        // state
        this._node = null;
        this._touchCount = 0;
        this._springState = SpringStates.NONE;
        this._onEdge = EdgeStates.NONE;
        this._pageSpringPosition = 0;
        this._edgeSpringPosition = 0;
        this._touchVelocity = 0;
        this._earlyEnd = false;
        this._needsPaginationCheck = false;
        this._displacement = 0;
        this._totalShift = 0;
        this._cachedIndex = 0;

        // subcomponent logic
        this._scroller.positionFrom(this.getPosition);

        // eventing
        this._eventInput = new EventHandler();
        this._eventOutput = new EventHandler();

        this._eventInput.pipe(this.sync);
        this.sync.pipe(this._eventInput);

        EventHandler.setInputHandler(this, this._eventInput);
        EventHandler.setOutputHandler(this, this._eventOutput);

        this._bindEvents();

        // override default options with passed-in custom options
        if (options) this.setOptions(options);
    }

    Scrollview.DEFAULT_OPTIONS = {
        direction: Utility.Direction.Y,
        rails: true,
        friction: 0.005,
        drag: 0.0001,
        edgeGrip: 0.2,
        edgePeriod: 300,
        edgeDamp: 1,
        margin: 1000,       // mostly safe
        paginated: false,
        pagePeriod: 500,
        pageDamp: 0.8,
        pageStopSpeed: 10,
        pageSwitchSpeed: 0.5,
        speedLimit: 5,
        groupScroll: false,
        syncScale: 1
    }

    _handleStart(event) {
        this._touchCount = event.count;
        if (event.count === undefined) this._touchCount = 1;

        this._detachAgents();

        this.setVelocity(0);
        this._touchVelocity = 0;
        this._earlyEnd = false;
    }

    _handleMove(event) {
        let velocity = -event.velocity;
        let delta = -event.delta;

        if (this._onEdge !== EdgeStates.NONE && event.slip) {
            if ((velocity < 0 && this._onEdge === EdgeStates.TOP) || (velocity > 0 && this._onEdge === EdgeStates.BOTTOM)) {
                if (!this._earlyEnd) {
                    this._handleEnd(event);
                    this._earlyEnd = true;
                }
            }
            else if (this._earlyEnd && (Math.abs(velocity) > Math.abs(this.getVelocity()))) {
                this._handleStart(event);
            }
        }
        if (this._earlyEnd) return;
        this._touchVelocity = velocity;

        if (event.slip) {
            let speedLimit = this.options.speedLimit;
            if (velocity < -speedLimit) velocity = -speedLimit;
            else if (velocity > speedLimit) velocity = speedLimit;

            this.setVelocity(velocity);

            let deltaLimit = speedLimit * 16;
            if (delta > deltaLimit) delta = deltaLimit;
            else if (delta < -deltaLimit) delta = -deltaLimit;
        }

        this.setPosition(this.getPosition() + delta);
        this._displacement += delta;

        if (this._springState === SpringStates.NONE) this._normalizeState();
    }

    _handleEnd(event) {
        this._touchCount = event.count || 0;
        if (!this._touchCount) {
            this._detachAgents();
            if (this._onEdge !== EdgeStates.NONE) this._setSpring(this._edgeSpringPosition, SpringStates.EDGE);
            this._attachAgents();
            let velocity = -event.velocity;
            let speedLimit = this.options.speedLimit;
            if (event.slip) speedLimit *= this.options.edgeGrip;
            if (velocity < -speedLimit) velocity = -speedLimit;
            else if (velocity > speedLimit) velocity = speedLimit;
            this.setVelocity(velocity);
            this._touchVelocity = 0;
            this._needsPaginationCheck = true;
        }
    }

    _bindEvents() {
        this._eventInput.bindThis(this);
        this._eventInput.on('start', this._handleStart);
        this._eventInput.on('update', this._handleMove);
        this._eventInput.on('end', this._handleEnd);

        this._eventInput.on('resize', () => {
            this._node._.calculateSize();
        });

        this._scroller.on('onEdge', (data) => {
            this._edgeSpringPosition = data.position;
            this._handleEdge(this._scroller.onEdge());
            this._eventOutput.emit('onEdge');
        });

        this._scroller.on('offEdge', () => {
            this.sync.setOptions({scale: this.options.syncScale});
            this._onEdge = this._scroller.onEdge();
            this._eventOutput.emit('offEdge');
        });

        this._particle.on('update', (particle) => {
            if (this._springState === SpringStates.NONE) this._normalizeState();
            this._displacement = particle.position.x - this._totalShift;
        });

        this._particle.on('end', () => {
            if (!this.options.paginated || (this.options.paginated && this._springState !== SpringStates.NONE))
                this._eventOutput.emit('settle');
        });
    }

    _attachAgents() {
        if (this._springState) this._physicsEngine.attach([this.spring], this._particle);
        else this._physicsEngine.attach([this.drag, this.friction], this._particle);
    }

    _detachAgents() {
        this._springState = SpringStates.NONE;
        this._physicsEngine.detachAll();
    }

    _nodeSizeForDirection(node) {
        let direction = this.options.direction;
        let nodeSize = node.getSize();
        return (!nodeSize) ? this._scroller.getSize()[direction] : nodeSize[direction];
    }

    _handleEdge(edge) {
        this.sync.setOptions({scale: this.options.edgeGrip});
        this._onEdge = edge;

        if (!this._touchCount && this._springState !== SpringStates.EDGE) {
            this._setSpring(this._edgeSpringPosition, SpringStates.EDGE);
        }

        if (this._springState && Math.abs(this.getVelocity()) < 0.001) {
            // reset agents, detaching the spring
            this._detachAgents();
            this._attachAgents();
        }
    }

    _handlePagination() {
        if (this._touchCount) return;
        if (this._springState === SpringStates.EDGE) return;

        let velocity = this.getVelocity();
        if (Math.abs(velocity) >= this.options.pageStopSpeed) return;

        let position = this.getPosition();
        let velocitySwitch = Math.abs(velocity) > this.options.pageSwitchSpeed;

        // parameters to determine when to switch
        let nodeSize = this._nodeSizeForDirection(this._node);
        let positionNext = position > 0.5 * nodeSize;
        let positionPrev = position < 0.5 * nodeSize;

        let velocityNext = velocity > 0;
        let velocityPrev = velocity < 0;

        this._needsPaginationCheck = false;

        if ((positionNext && !velocitySwitch) || (velocitySwitch && velocityNext)) {
            this.goToNextPage();
        }
        else if (velocitySwitch && velocityPrev) {
            this.goToPreviousPage();
        }
        else this._setSpring(0, SpringStates.PAGE);
    }

    _setSpring(position, springState) {
        let springOptions;
        if (springState === SpringStates.EDGE) {
            this._edgeSpringPosition = position;
            springOptions = {
                anchor: [this._edgeSpringPosition, 0, 0],
                period: this.options.edgePeriod,
                dampingRatio: this.options.edgeDamp
            };
        }
        else if (springState === SpringStates.PAGE) {
            this._pageSpringPosition = position;
            springOptions = {
                anchor: [this._pageSpringPosition, 0, 0],
                period: this.options.pagePeriod,
                dampingRatio: this.options.pageDamp
            };
        }

        this.spring.setOptions(springOptions);
        if (springState && !this._springState) {
            this._detachAgents();
            this._springState = springState;
            this._attachAgents();
        }
        this._springState = springState;
    }

    _normalizeState() {
        let offset = 0;

        let position = this.getPosition();
        position += (position < 0 ? -0.5 : 0.5) >> 0;

        let nodeSize = this._nodeSizeForDirection(this._node);
        let nextNode = this._node.getNext();

        while (offset + position >= nodeSize && nextNode) {
            offset -= nodeSize;
            this._scroller.sequenceFrom(nextNode);
            this._node = nextNode;
            nextNode = this._node.getNext();
            nodeSize = this._nodeSizeForDirection(this._node);
        }

        let previousNode = this._node.getPrevious();
        let previousNodeSize;

        while (offset + position <= 0 && previousNode) {
            previousNodeSize = this._nodeSizeForDirection(previousNode);
            this._scroller.sequenceFrom(previousNode);
            this._node = previousNode;
            offset += previousNodeSize;
            previousNode = this._node.getPrevious();
        }

        if (offset) this._shiftOrigin(offset);

        if (this._node) {
            if (this._node.index !== this._cachedIndex) {
                if (this.getPosition() < 0.5 * nodeSize) {
                    this._cachedIndex = this._node.index;
                    this._eventOutput.emit('pageChange', {direction: -1, index: this._cachedIndex});
                }
            } else {
                if (this.getPosition() > 0.5 * nodeSize) {
                    this._cachedIndex = this._node.index + 1;
                    this._eventOutput.emit('pageChange', {direction: 1, index: this._cachedIndex});
                }
            }
        }
    }

    _shiftOrigin(amount) {
        this._edgeSpringPosition += amount;
        this._pageSpringPosition += amount;
        this.setPosition(this.getPosition() + amount);
        this._totalShift += amount;

        if (this._springState === SpringStates.EDGE) {
            this.spring.setOptions({anchor: [this._edgeSpringPosition, 0, 0]});
        }
        else if (this._springState === SpringStates.PAGE) {
            this.spring.setOptions({anchor: [this._pageSpringPosition, 0, 0]});
        }
    }

    /**
     * Returns the index of the first visible renderable
     *
     * @method getCurrentIndex
     * @return {Number} The current index of the ViewSequence
     */
    getCurrentIndex() {
        return this._node.index;
    }

    /**
     * goToPreviousPage paginates your Scrollview instance backwards by one item.
     *
     * @method goToPreviousPage
     * @return {ViewSequence} The previous node.
     */
    goToPreviousPage() {
        if (!this._node || this._onEdge === EdgeStates.TOP) return null;

        // if moving back to the current node
        if (this.getPosition() > 1 && this._springState === SpringStates.NONE) {
            this._setSpring(0, SpringStates.PAGE);
            return this._node;
        }

        // if moving to the previous node
        let previousNode = this._node.getPrevious();
        if (previousNode) {
            let previousNodeSize = this._nodeSizeForDirection(previousNode);
            this._scroller.sequenceFrom(previousNode);
            this._node = previousNode;
            this._shiftOrigin(previousNodeSize);
            this._setSpring(0, SpringStates.PAGE);
        }
        return previousNode;
    }

    /**
     * goToNextPage paginates your Scrollview instance forwards by one item.
     *
     * @method goToNextPage
     * @return {ViewSequence} The next node.
     */
    goToNextPage() {
        if (!this._node || this._onEdge === EdgeStates.BOTTOM) return null;
        let nextNode = this._node.getNext();
        if (nextNode) {
            let currentNodeSize = this._nodeSizeForDirection(this._node);
            this._scroller.sequenceFrom(nextNode);
            this._node = nextNode;
            this._shiftOrigin(-currentNodeSize);
            this._setSpring(0, SpringStates.PAGE);
        }
        return nextNode;
    }

    /**
     * Paginates the Scrollview to an absolute page index.
     *
     * @method goToPage
     */
    goToPage(index) {
        let currentIndex = this.getCurrentIndex();
        let i;

        if (currentIndex > index) {
            for (i = 0; i < currentIndex - index; i++)
                this.goToPreviousPage();
        }

        if (currentIndex < index) {
            for (i = 0; i < index - currentIndex; i++)
                this.goToNextPage();
        }
    }

    outputFrom() {
        return this._scroller.outputFrom.apply(this._scroller, arguments);
    }

    /**
     * Returns the position associated with the Scrollview instance's current node
     *  (generally the node currently at the top).
     *
     * @deprecated
     * @method getPosition
     * @param {number} [node] If specified, returns the position of the node at that index in the
     * Scrollview instance's currently managed collection.
     * @return {number} The position of either the specified node, or the Scrollview's current Node,
     * in pixels translated.
     */
    getPosition() {
        return this._particle.getPosition1D();
    }

    /**
     * Returns the absolute position associated with the Scrollview instance
     *
     * @method getAbsolutePosition
     * @return {number} The position of the Scrollview's current Node,
     * in pixels translated.
     */
    getAbsolutePosition() {
        return this._scroller.getCumulativeSize(this.getCurrentIndex())[this.options.direction] + this.getPosition();
    }

    /**
     * Returns the offset associated with the Scrollview instance's current node
     *  (generally the node currently at the top).
     *
     * @method getOffset
     * @param {number} [node] If specified, returns the position of the node at that index in the
     * Scrollview instance's currently managed collection.
     * @return {number} The position of either the specified node, or the Scrollview's current Node,
     * in pixels translated.
     */
    Scrollview.prototype.getOffset = Scrollview.prototype.getPosition;

    /**
     * Sets the position of the physics particle that controls Scrollview instance's "position"
     *
     * @deprecated
     * @method setPosition
     * @param {number} x The amount of pixels you want your scrollview to progress by.
     */
    setPosition(x) {
        this._particle.setPosition1D(x);
    }

    /**
     * Sets the offset of the physics particle that controls Scrollview instance's "position"
     *
     * @method setPosition
     * @param {number} x The amount of pixels you want your scrollview to progress by.
     */
    Scrollview.prototype.setOffset = Scrollview.prototype.setPosition;

    /**
     * Returns the Scrollview instance's velocity.
     *
     * @method getVelocity
     * @return {Number} The velocity.
     */

    getVelocity() {
        return this._touchCount ? this._touchVelocity : this._particle.getVelocity1D();
    }

    /**
     * Sets the Scrollview instance's velocity. Until affected by input or another call of setVelocity
     *  the Scrollview instance will scroll at the passed-in velocity.
     *
     * @method setVelocity
     * @param {number} v The magnitude of the velocity.
     */
    setVelocity(v) {
        this._particle.setVelocity1D(v);
    }

    /**
     * Patches the Scrollview instance's options with the passed-in ones.
     *
     * @method setOptions
     * @param {Options} options An object of configurable options for the Scrollview instance.
     */
    setOptions(options) {
        // preprocess custom options
        if (options.direction !== undefined) {
            if (options.direction === 'x') options.direction = Utility.Direction.X;
            else if (options.direction === 'y') options.direction = Utility.Direction.Y;
        }

        if (options.groupScroll !== this.options.groupScroll) {
            if (options.groupScroll)
                this.subscribe(this._scroller);
            else
                this.unsubscribe(this._scroller);
        }

        // patch custom options
        this._optionsManager.setOptions(options);

        // propagate options to sub-components

        // scroller sub-component
        this._scroller.setOptions(options);

        // physics sub-components
        if (options.drag !== undefined) this.drag.setOptions({strength: this.options.drag});
        if (options.friction !== undefined) this.friction.setOptions({strength: this.options.friction});
        if (options.edgePeriod !== undefined || options.edgeDamp !== undefined) {
            this.spring.setOptions({
                period: this.options.edgePeriod,
                dampingRatio: this.options.edgeDamp
            });
        }

        // sync sub-component
        if (options.rails || options.direction !== undefined || options.syncScale !== undefined || options.preventDefault) {
            this.sync.setOptions({
                rails: this.options.rails,
                direction: (this.options.direction === Utility.Direction.X) ? GenericSync.DIRECTION_X : GenericSync.DIRECTION_Y,
                scale: this.options.syncScale,
                preventDefault: this.options.preventDefault
            });
        }
    }

    /**
     * Sets the collection of renderables under the Scrollview instance's control, by
     *  setting its current node to the passed in ViewSequence. If you
     *  pass in an array, the Scrollview instance will set its node as a ViewSequence instantiated with
     *  the passed-in array.
     *
     * @method sequenceFrom
     * @param {Array|ViewSequence} node Either an array of renderables or a Famous viewSequence.
     */
    sequenceFrom(node) {
        if (node instanceof Array) node = new ViewSequence({array: node, trackSize: true});
        this._node = node;
        return this._scroller.sequenceFrom(node);
    }

    /**
     * Returns the width and the height of the Scrollview instance.
     *
     * @method getSize
     * @return {Array} A two value array of the Scrollview instance's current width and height (in that order).
     */
    getSize() {
        return this._scroller.getSize.apply(this._scroller, arguments);
    }

    /**
     * Generate a render spec from the contents of this component.
     *
     * @private
     * @method render
     * @return {number} Render spec for this component
     */
    render() {
        if (this.options.paginated && this._needsPaginationCheck) this._handlePagination();

        return this._scroller.render();
    }
}
