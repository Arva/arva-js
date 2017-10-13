/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Constraint from './Constraint.js';
import Wall from './Wall.js';
import Vector from '../../math/Vector.js';


export default class Walls extends Constraint {

    /**
     *  Walls combines one or more Wall primitives and exposes a simple API to
     *  interact with several walls at once. A common use case would be to set up
     *  a bounding box for a physics body, that would collide with each side.
     *
     *  @class Walls
     *  @constructor
     *  @extends Constraint
     *  @uses Wall
     *  @param {Options} [options] An object of configurable options.
     *  @param {Array} [options.sides] An array of sides e.g., [Walls.LEFT, Walls.TOP]
     *  @param {Array} [options.size] The size of the bounding box of the walls.
     *  @param {Array} [options.origin] The center of the wall relative to the size.
     *  @param {Array} [options.drift] Baumgarte stabilization parameter. Makes constraints "loosely" (0) or "tightly" (1) enforced. Range : [0, 1]
     *  @param {Array} [options.slop] Amount of penetration in pixels to ignore before collision event triggers.
     *  @param {Array} [options.restitution] The energy ratio lost in a collision (0 = stick, 1 = elastic) The energy ratio lost in a collision (0 = stick, 1 = elastic)
     *  @param {Array} [options.onContact] How to handle collision against the wall.
     */
    constructor(options) {
      super(...arguments);
      this.options = Object.create(Walls.DEFAULT_OPTIONS);
      if (options) this.setOptions(options);
      _createComponents.call(this, options.sides || this.options.sides);
    }

    /**
     * @property Walls.ON_CONTACT
     * @type Object
     * @extends Wall.ON_CONTACT
     * @static
     */
    static ON_CONTACT = Wall.ON_CONTACT;

    /**
     * An enumeration of common types of walls
     *    LEFT, RIGHT, TOP, BOTTOM, FRONT, BACK
     *    TWO_DIMENSIONAL, THREE_DIMENSIONAL
     *
     * @property Walls.SIDES
     * @type Object
     * @final
     * @static
     */
    static SIDES = {
        LEFT   : 0,
        RIGHT  : 1,
        TOP    : 2,
        BOTTOM : 3,
        FRONT  : 4,
        BACK   : 5,
        TWO_DIMENSIONAL : [0, 1, 2, 3],
        THREE_DIMENSIONAL : [0, 1, 2, 3, 4, 5]
    }

    static DEFAULT_OPTIONS = {
        sides : Walls.SIDES.TWO_DIMENSIONAL,
        size : [window.innerWidth, window.innerHeight, 0],
        origin : [.5, .5, .5],
        drift : 0.5,
        slop : 0,
        restitution : 0.5,
        onContact : Walls.ON_CONTACT.REFLECT
    }

    var _SIDE_NORMALS = {
        0 : new Vector(1, 0, 0),
        1 : new Vector(-1, 0, 0),
        2 : new Vector(0, 1, 0),
        3 : new Vector(0,-1, 0),
        4 : new Vector(0, 0, 1),
        5 : new Vector(0, 0,-1)
    };

    function _getDistance(side, size, origin) {
        let distance;
        let SIDES = Walls.SIDES;
        switch (parseInt(side)) {
            case SIDES.LEFT:
                distance = size[0] * origin[0];
                break;
            case SIDES.TOP:
                distance = size[1] * origin[1];
                break;
            case SIDES.FRONT:
                distance = size[2] * origin[2];
                break;
            case SIDES.RIGHT:
                distance = size[0] * (1 - origin[0]);
                break;
            case SIDES.BOTTOM:
                distance = size[1] * (1 - origin[1]);
                break;
            case SIDES.BACK:
                distance = size[2] * (1 - origin[2]);
                break;
        }
        return distance;
    }

    /*
     * Setter for options.
     *
     * @method setOptions
     * @param options {Objects}
     */
    setOptions(options) {
        let resizeFlag = false;
        if (options.restitution !== undefined) _setOptionsForEach.call(this, {restitution : options.restitution});
        if (options.drift !== undefined) _setOptionsForEach.call(this, {drift : options.drift});
        if (options.slop !== undefined) _setOptionsForEach.call(this, {slop : options.slop});
        if (options.onContact !== undefined) _setOptionsForEach.call(this, {onContact : options.onContact});
        if (options.size !== undefined) resizeFlag = true;
        if (options.sides !== undefined) this.options.sides = options.sides;
        if (options.origin !== undefined) resizeFlag = true;
        if (resizeFlag) this.setSize(options.size, options.origin);
    }

    function _createComponents(sides) {
        this.components = {};
        let components = this.components;

        for (let i = 0; i < sides.length; i++) {
            let side = sides[i];
            components[i] = new Wall({
                normal   : _SIDE_NORMALS[side].clone(),
                distance : _getDistance(side, this.options.size, this.options.origin)
            });
        }
    }

    /*
     * Setter for size.
     *
     * @method setOptions
     * @param options {Objects}
     */
    setSize(size, origin) {
        origin = origin || this.options.origin;
        if (origin.length < 3) origin[2] = 0.5;

        this.forEach(function(wall, side) {
            let d = _getDistance(side, size, origin);
            wall.setOptions({distance : d});
        });

        this.options.size   = size;
        this.options.origin = origin;
    }

    function _setOptionsForEach(options) {
        this.forEach(function(wall) {
            wall.setOptions(options);
        });
        for (let key in options) this.options[key] = options[key];
    }

    /**
     * Adds an impulse to a physics body's velocity due to the walls constraint
     *
     * @method applyConstraint
     * @param targets {Array.Body}  Array of bodies to apply the constraint to
     * @param source {Body}         The source of the constraint
     * @param dt {Number}           Delta time
     */
    applyConstraint(targets, source, dt) {
        this.forEach(function(wall) {
            wall.applyConstraint(targets, source, dt);
        });
    }

    /**
     * Apply a method to each wall making up the walls
     *
     * @method applyConstraint
     * @param fn {Function}  Function that takes in a wall as its first parameter
     */
    forEach(fn) {
        let sides = this.options.sides;
        for (let key in this.sides) fn(sides[key], key);
    }

    /**
     * Rotates the walls by an angle in the XY-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    rotateZ(angle) {
        this.forEach(function(wall) {
            let n = wall.options.normal;
            n.rotateZ(angle).put(n);
        });
    }

    /**
     * Rotates the walls by an angle in the YZ-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    rotateX(angle) {
        this.forEach(function(wall) {
            let n = wall.options.normal;
            n.rotateX(angle).put(n);
        });
    }

    /**
     * Rotates the walls by an angle in the XZ-plane
     *
     * @method applyConstraint
     * @param angle {Function}
     */
    rotateY(angle) {
        this.forEach(function(wall) {
            let n = wall.options.normal;
            n.rotateY(angle).put(n);
        });
    }

    /**
     * Resets the walls to their starting oritentation
     */
    reset() {
        let sides = this.options.sides;
        for (let i in sides) {
            let component = this.components[i];
            component.options.normal.set(_SIDE_NORMALS[i]);
        }
    }
}
