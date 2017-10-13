/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import Force from './Force.js';
import Vector from '../../math/Vector.js';

/*global console */

export default class Spring extends Force {

    /**
     *  A force that moves a physics body to a location with a spring motion.
     *    The body can be moved to another physics body, or an anchor point.
     *
     *  @class Spring
     *  @constructor
     *  @extends Force
     *  @param {Object} options options to set on drag
     */
    constructor(options) {
        super(...arguments);

        //registers
        this.disp = new Vector(0,0,0);

        this.options = Object.create(this.constructor.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);
        else this._init();
    }

    /** @const */
    static MIN_PERIOD = 150;

    /**
     * @property Spring.FORCE_FUNCTIONS
     * @type Object
     * @protected
     * @static
     */
    static FORCE_FUNCTIONS = {

        /**
         * A FENE (Finitely Extensible Nonlinear Elastic) spring force
         *      see: http://en.wikipedia.org/wiki/FENE
         * @attribute FENE
         * @type Function
         * @param {Number} dist current distance target is from source body
         * @param {Number} rMax maximum range of influence
         * @return {Number} unscaled force
         */
        FENE : function(dist, rMax) {
            let rMaxSmall = rMax * .99;
            let r = Math.max(Math.min(dist, rMaxSmall), -rMaxSmall);
            return r / (1 - r * r/(rMax * rMax));
        },

        /**
         * A Hookean spring force, linear in the displacement
         *      see: http://en.wikipedia.org/wiki/Hooke's_law
         * @attribute FENE
         * @type Function
         * @param {Number} dist current distance target is from source body
         * @return {Number} unscaled force
         */
        HOOK : function(dist) {
            return dist;
        }
    }

    /**
     * @property Spring.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    static DEFAULT_OPTIONS = {

        /**
         * The amount of time in milliseconds taken for one complete oscillation
         * when there is no damping
         *    Range : [150, Infinity]
         * @attribute period
         * @type Number
         * @default 300
         */
        period : 300,

        /**
         * The damping of the spring.
         *    Range : [0, 1]
         *    0 = no damping, and the spring will oscillate forever
         *    1 = critically damped (the spring will never oscillate)
         * @attribute dampingRatio
         * @type Number
         * @default 0.1
         */
        dampingRatio : 0.1,

        /**
         * The rest length of the spring
         *    Range : [0, Infinity]
         * @attribute length
         * @type Number
         * @default 0
         */
        length : 0,

        /**
         * The maximum length of the spring (for a FENE spring)
         *    Range : [0, Infinity]
         * @attribute length
         * @type Number
         * @default Infinity
         */
        maxLength : Infinity,

        /**
         * The location of the spring's anchor, if not another physics body
         *
         * @attribute anchor
         * @type Array
         * @optional
         */
        anchor : undefined,

        /**
         * The type of spring force
         * @attribute forceFunction
         * @type Function
         */
        forceFunction : Spring.FORCE_FUNCTIONS.HOOK
    }

    _calcStiffness() {
        let options = this.options;
        options.stiffness = Math.pow(2 * Math.PI / options.period, 2);
    }

    _calcDamping() {
        let options = this.options;
        options.damping = 4 * Math.PI * options.dampingRatio / options.period;
    }

    _init() {
        this._calcStiffness();
        this._calcDamping();
    }

    /**
     * Basic options setter
     *
     * @method setOptions
     * @param options {Object}
     */
    setOptions(options) {
        // TODO fix no-console error
        /* eslint no-console: 0 */

        if (options.anchor !== undefined) {
            if (options.anchor.position instanceof Vector) this.options.anchor = options.anchor.position;
            if (options.anchor instanceof Vector) this.options.anchor = options.anchor;
            if (options.anchor instanceof Array)  this.options.anchor = new Vector(options.anchor);
        }

        if (options.period !== undefined){
            if (options.period < MIN_PERIOD) {
                options.period = MIN_PERIOD;
                console.warn('The period of a SpringTransition is capped at ' + MIN_PERIOD + ' ms. Use a SnapTransition for faster transitions');
            }
            this.options.period = options.period;
        }

        if (options.dampingRatio !== undefined) this.options.dampingRatio = options.dampingRatio;
        if (options.length !== undefined) this.options.length = options.length;
        if (options.forceFunction !== undefined) this.options.forceFunction = options.forceFunction;
        if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;

        this._init();
        super.setOptions(options);
    }

    /**
     * Adds a spring force to a physics body's force accumulator.
     *
     * @method applyForce
     * @param targets {Array.Body} Array of bodies to apply force to.
     */
    applyForce(targets, source) {
        let force = this.force;
        let disp = this.disp;
        let options = this.options;

        let stiffness = options.stiffness;
        let damping = options.damping;
        let restLength = options.length;
        let maxLength = options.maxLength;
        let anchor = options.anchor || source.position;
        let forceFunction = options.forceFunction;

        let i;
        let target;
        let p2;
        let v2;
        let dist;
        let m;

        for (i = 0; i < targets.length; i++) {
            target = targets[i];
            p2 = target.position;
            v2 = target.velocity;

            anchor.sub(p2).put(disp);
            dist = disp.norm() - restLength;

            if (dist === 0) return;

            //if dampingRatio specified, then override strength and damping
            m      = target.mass;
            stiffness *= m;
            damping   *= m;

            disp.normalize(stiffness * forceFunction(dist, maxLength))
                .put(force);

            if (damping)
                if (source) force.add(v2.sub(source.velocity).mult(-damping)).put(force);
                else force.add(v2.mult(-damping)).put(force);

            target.applyForce(force);
            if (source) source.applyForce(force.mult(-1));
        }
    }

    /**
     * Calculates the potential energy of the spring.
     *
     * @method getEnergy
     * @param [targets] target  The physics body attached to the spring
     * @return {source}         The potential energy of the spring
     */
    getEnergy(targets, source) {
        let options     = this.options;
        let restLength  = options.length;
        let anchor      = (source) ? source.position : options.anchor;
        let strength    = options.stiffness;

        let energy = 0.0;
        for (let i = 0; i < targets.length; i++){
            let target = targets[i];
            let dist = anchor.sub(target.position).norm() - restLength;
            energy += 0.5 * strength * dist * dist;
        }
        return energy;
    }
}
