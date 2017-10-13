/* We respect the original MPL-2.0 open-source license with regards to most of this file source-code.
 * any variations, changes and additions are NPOSL-3 licensed.
 *
 * @author Hans van den Akker
 * @license NPOSL-3.0
 * @copyright Famous Industries, Inc. 2015, Arva 2015-2017
 * This class originated from the Famous 3.5 Async Render Engine built by Famous Industries. We've ported
 * this class to ES6 for purpose of unifying Arva's development environment.
 */

import EventHandler from '../core/EventHandler.js';

function _updateForce(index) {
  var boundAgent = _getAgentData.call(this, this._forces[index]);
  boundAgent.agent.applyForce(boundAgent.targets, boundAgent.source);
}

function _updateForces() {
  for (var index = this._forces.length - 1; index > -1; index--)
    this._updateForce(index);
}

function _updateConstraint(index, dt) {
  var boundAgent = this._agentData[this._constraints[index]];
  return boundAgent.agent.applyConstraint(boundAgent.targets, boundAgent.source, dt);
}

function _updateConstraints(dt) {
  var iteration = 0;
  while (iteration < this.options.constraintSteps) {
    for (var index = this._constraints.length - 1; index > -1; index--)
      this._updateConstraint(index, dt);
    iteration++;
  }
}

function _updateVelocities(body, dt) {
  body.integrateVelocity(dt);
  if (this.options.velocityCap)
    body.velocity.cap(this.options.velocityCap).put(body.velocity);
}

function _updateAngularVelocities(body, dt) {
  body.integrateAngularMomentum(dt);
  body.updateAngularVelocity();
  if (this.options.angularVelocityCap)
    body.angularVelocity.cap(this.options.angularVelocityCap).put(body.angularVelocity);
}

function _updateOrientations(body, dt) {
  body.integrateOrientation(dt);
}

function _updatePositions(body, dt) {
  body.integratePosition(dt);
  body.emit(_events.update, body);
}

function _integrate(dt) {
  this._updateForces(dt);
  this.forEach(_updateVelocities, dt);
  this.forEachBody(_updateAngularVelocities, dt);
  this._updateConstraints(dt);
  this.forEachBody(_updateOrientations, dt);
  this.forEach(_updatePositions, dt);
}

function _getParticlesEnergy() {
  var energy = 0.0;
  var particleEnergy = 0.0;
  this.forEach(function(particle) {
    particleEnergy = particle.getEnergy();
    energy += particleEnergy;
  });
  return energy;
}

function _getAgentsEnergy() {
  var energy = 0;
  for (var id in this._agentData)
    energy += this.getAgentEnergy(id);
  return energy;
}

export default class PhysicsEngine {

    /**
     * The Physics Engine is responsible for mediating bodies with their
     *   interaction with forces and constraints (agents). Specifically, it
     *   is responsible for:
     *
     *   - adding and removing bodies
     *   - updating a body's state over time
     *   - attaching and detaching agents
     *   - sleeping upon equillibrium and waking upon excitation
     *
     * @class PhysicsEngine
     * @constructor
     * @param options {Object} options
     */
    constructor(options) {
        this.options = Object.create(PhysicsEngine.DEFAULT_OPTIONS);
        if (options) this.setOptions(options);

        this._particles      = [];   //list of managed particles
        this._bodies         = [];   //list of managed bodies
        this._agentData      = {};   //hash of managed agent data
        this._forces         = [];   //list of Ids of agents that are forces
        this._constraints    = [];   //list of Ids of agents that are constraints

        this._buffer         = 0.0;
        this._prevTime       = Date.now();
        this._isSleeping     = false;
        this._eventHandler   = null;
        this._currAgentId    = 0;
        this._hasBodies      = false;
        this._eventHandler   = null;
    }

    /** const */
    static TIMESTEP = 17;
    static MIN_TIME_STEP = 1000 / 120;
    static MAX_TIME_STEP = 17;

    // Catalogue of outputted events
    static _events = {
        start : 'start',
        update : 'update',
        end : 'end'
    };

    /**
     * @property PhysicsEngine.DEFAULT_OPTIONS
     * @type Object
     * @protected
     * @static
     */
    static DEFAULT_OPTIONS = {

        /**
         * The number of iterations the engine takes to resolve constraints
         * @attribute constraintSteps
         * @type Number
         */
        constraintSteps : 1,

        /**
         * The energy threshold required for the Physics Engine to update
         * @attribute sleepTolerance
         * @type Number
         */
        sleepTolerance : 1e-7,

        /**
         * The maximum velocity magnitude of a physics body
         *      Range : [0, Infinity]
         * @attribute velocityCap
         * @type Number
         */
        velocityCap : undefined,

        /**
         * The maximum angular velocity magnitude of a physics body
         *      Range : [0, Infinity]
         * @attribute angularVelocityCap
         * @type Number
         */
        angularVelocityCap : undefined
    };

    /**
     * Options setter
     *
     * @method setOptions
     * @param opts {Object}
     */
    setOptions(opts) {
        for (var key in opts) if (this.options[key]) this.options[key] = opts[key];
    }

    /**
     * Method to add a physics body to the engine. Necessary to update the
     *   body over time.
     *
     * @method addBody
     * @param body {Body}
     * @return body {Body}
     */
    addBody(body) {
        body._engine = this;
        if (body.isBody) {
            this._bodies.push(body);
            this._hasBodies = true;
        }
        else this._particles.push(body);
        body.on('start', this.wake.bind(this));
        return body;
    }

    /**
     * Remove a body from the engine. Detaches body from all forces and
     *   constraints.
     *
     * TODO: Fix for in loop
     *
     * @method removeBody
     * @param body {Body}
     */
    removeBody(body) {
        var array = (body.isBody) ? this._bodies : this._particles;
        var index = array.indexOf(body);
        if (index > -1) {
            for (var agentKey in this._agentData) {
                if (this._agentData.hasOwnProperty(agentKey)) {
                    this.detachFrom(this._agentData[agentKey].id, body);
                }
            }
            array.splice(index,1);
        }
        if (this.getBodies().length === 0) this._hasBodies = false;
    }

    _mapAgentArray(agent) {
        if (agent.applyForce)      return this._forces;
        if (agent.applyConstraint) return this._constraints;
    }

    _attachOne(agent, targets, source) {
        if (targets === undefined) targets = this.getParticlesAndBodies();
        if (!(targets instanceof Array)) targets = [targets];

        agent.on('change', this.wake);

        this._agentData[this._currAgentId] = {
            agent   : agent,
            id      : this._currAgentId,
            targets : targets,
            source  : source
        };

        this._mapAgentArray(agent).push(this._currAgentId);
        return this._currAgentId++;
    }

    /**
     * Attaches a force or constraint to a Body. Returns an AgentId of the
     *   attached agent which can be used to detach the agent.
     *
     * @method attach
     * @param agents {Agent|Array.Agent} A force, constraint, or array of them.
     * @param [targets=All] {Body|Array.Body} The Body or Bodies affected by the agent
     * @param [source] {Body} The source of the agent
     * @return AgentId {Number}
     */
    attach(agents, targets, source) {
        this.wake();

        if (agents instanceof Array) {
            var agentIDs = [];
            for (var i = 0; i < agents.length; i++)
                agentIDs[i] = this._attachOne(agents[i], targets, source);
            return agentIDs;
        }
        else return this._attachOne(agents, targets, source);
    }

    /**
     * Append a body to the targets of a previously defined physics agent.
     *
     * @method attachTo
     * @param agentID {AgentId} The agentId of a previously defined agent
     * @param target {Body} The Body affected by the agent
     */
    attachTo(agentID, target) {
        this._getAgentData(agentID).targets.push(target);
    }

    /**
     * Undoes PhysicsEngine.attach. Removes an agent and its associated
     *   effect on its affected Bodies.
     *
     * @method detach
     * @param id {AgentId} The agentId of a previously defined agent
     */
    detach(id) {
        // detach from forces/constraints array
        var agent = this.getAgent(id);
        var agentArray = this._mapAgentArray(agent);
        var index = agentArray.indexOf(id);
        agentArray.splice(index,1);

        // detach agents array
        delete this._agentData[id];
    }

    /**
     * Remove a single Body from a previously defined agent.
     *
     * @method detach
     * @param id {AgentId} The agentId of a previously defined agent
     * @param target {Body} The body to remove from the agent
     */
    detachFrom(id, target) {
        var boundAgent = this._getAgentData(id);
        if (boundAgent.source === target) this.detach(id);
        else {
            var targets = boundAgent.targets;
            var index = targets.indexOf(target);
            if (index > -1) targets.splice(index,1);
        }
    }

    /**
     * A convenience method to give the Physics Engine a clean slate of
     * agents. Preserves all added Body objects.
     *
     * @method detachAll
     */
    detachAll() {
        this._agentData     = {};
        this._forces        = [];
        this._constraints   = [];
        this._currAgentId   = 0;
    }



    /**
     * Returns the corresponding agent given its agentId.
     *
     * @method getAgent
     * @param id {AgentId}
     */
    getAgent(id) {
        return this._getAgentData(id).agent;
    }

    /**
     * Returns all particles that are currently managed by the Physics Engine.
     *
     * @method getParticles
     * @return particles {Array.Particles}
     */
    getParticles() {
        return this._particles;
    }

    /**
     * Returns all bodies, except particles, that are currently managed by the Physics Engine.
     *
     * @method getBodies
     * @return bodies {Array.Bodies}
     */
    getBodies() {
        return this._bodies;
    }

    /**
     * Returns all bodies that are currently managed by the Physics Engine.
     *
     * @method getBodies
     * @return bodies {Array.Bodies}
     */
    getParticlesAndBodies() {
        return this.getParticles().concat(this.getBodies());
    }

    /**
     * Iterates over every Particle and applies a function whose first
     *   argument is the Particle
     *
     * @method forEachParticle
     * @param fn {Function} Function to iterate over
     * @param [dt] {Number} Delta time
     */
    forEachParticle(fn, dt) {
        var particles = this.getParticles();
        for (var index = 0, len = particles.length; index < len; index++)
            fn.call(this, particles[index], dt);
    }

    /**
     * Iterates over every Body that isn't a Particle and applies
     *   a function whose first argument is the Body
     *
     * @method forEachBody
     * @param fn {Function} Function to iterate over
     * @param [dt] {Number} Delta time
     */
    forEachBody(fn, dt) {
        if (!this._hasBodies) return;
        var bodies = this.getBodies();
        for (var index = 0, len = bodies.length; index < len; index++)
            fn.call(this, bodies[index], dt);
    }

    /**
     * Iterates over every Body and applies a function whose first
     *   argument is the Body
     *
     * @method forEach
     * @param fn {Function} Function to iterate over
     * @param [dt] {Number} Delta time
     */
    forEach(fn, dt) {
        this.forEachParticle(fn, dt);
        this.forEachBody(fn, dt);
    }



    /**
     * Calculates the potential energy of an agent, like a spring, by its Id
     *
     * @method getAgentEnergy
     * @param agentId {Number} The attached agent Id
     * @return energy {Number}
     */
    getAgentEnergy(agentId) {
        var agentData = this._getAgentData(agentId);
        return agentData.agent.getEnergy(agentData.targets, agentData.source);
    }

    /**
     * Calculates the kinetic energy of all Body objects and potential energy
     *   of all attached agents.
     *
     * TODO: implement.
     * @method getEnergy
     * @return energy {Number}
     */
    getEnergy() {
        return this._getParticlesEnergy() + this._getAgentsEnergy();
    }

    /**
     * Updates all Body objects managed by the physics engine over the
     *   time duration since the last time step was called.
     *
     * @method step
     */
    step() {
        if (this.isSleeping()) return;

        //set current frame's time
        var currTime = Date.now();

        //milliseconds elapsed since last frame
        var dtFrame = currTime - this._prevTime;

        this._prevTime = currTime;

        if (dtFrame < MIN_TIME_STEP) return;
        if (dtFrame > MAX_TIME_STEP) dtFrame = MAX_TIME_STEP;

        //robust integration
//        this._buffer += dtFrame;
//        while (this._buffer > this._timestep){
//            _integrate.call(this, this._timestep);
//            this._buffer -= this._timestep;
//        };
//        _integrate.call(this, this._buffer);
//        this._buffer = 0.0;

        _integrate.call(this, TIMESTEP);

        this.emit(_events.update, this);

        if (this.getEnergy() < this.options.sleepTolerance) this.sleep();
    }

    /**
     * Tells whether the Physics Engine is sleeping or awake.
     *
     * @method isSleeping
     * @return {Boolean}
     */
    isSleeping() {
        return this._isSleeping;
    }

    /**
     * Tells whether the Physics Engine is sleeping or awake.
     *
     * @method isActive
     * @return {Boolean}
     */
    isActive() {
        return !this._isSleeping;
    }

    /**
     * Stops the Physics Engine update loop. Emits an 'end' event.
     *
     * @method sleep
     */
    sleep() {
        if (this._isSleeping) return;
        this.forEach(function(body) {
            body.sleep();
        });
        this.emit(_events.end, this);
        this._isSleeping = true;
    }

    /**
     * Restarts the Physics Engine update loop. Emits an 'start' event.
     *
     * @method wake
     */
    wake() {
        if (!this._isSleeping) return;
        this._prevTime = Date.now();
        this.emit(_events.start, this);
        this._isSleeping = false;
    }

    emit(type, data) {
        if (this._eventHandler === null) return;
        this._eventHandler.emit(type, data);
    }

    on(event, fn) {
        if (this._eventHandler === null) this._eventHandler = new EventHandler();
        this._eventHandler.on(event, fn);
    }
}
