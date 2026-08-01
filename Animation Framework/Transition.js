const Interpolator = require("./Interpolator.js");

/**
 * Describes how a state changes over time.
 * 
 * A Transition defines the duration, delay, interpolation function (via {@link Interpolator})
 * and mutation logic used to transform one state into another.
 * 
 * Transitions are immutable with respect to the objects they transform;
 * instead, they compute intermediate states on demand via {@link transform()}
 */
class Transition{
    #duration;
    #delay;
    #interpolator;
    #mutator;
    #enabled;

    /**
     * @param {Object} [options = {}] The options to configure the transition.
     * @param {number} [options.duration = 300] The duration of the transition, in **ms**.
     * @param {number} [options.delay = 0] The delay before the interpolation begins, in **ms**.
     * @param {string} [options.interpType = Interpolator.func.SMOOTHSTEP] The interpolator type provided by {@link Interpolator}.
     * @param {Object} [options.interpolatorParams = {}] Parameters to feed to the {@link Interpolator} generator.
     * @param {Interpolator} [options.interpolator] Interpolator to be used for the transition. Ignores `interpType` and `params` if provided.
     * @param {function(*, *, number) : *} [options.mutator] Describes how to transform between two states based on time passed.
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = total duration`.
     * @param {boolean} [options.enabled = true] Enables/disables the transition. If `false` will always output `startState`.
     * @param {Transition} [options.copy] Existing Transition to create a copy from. If provided, will ignore all the other parameters.
     */
    constructor({
        duration = 300, 
        delay = 0,
        interpType = Interpolator.func.SMOOTHSTEP, interpolatorParams = {},
        interpolator = undefined,
        mutator = (startState, endState, t) => startState * (1-t) + endState * (t),
        enabled = true,
        copy} = {}
    ){
        if(copy === undefined){
            this.#duration = duration;
            this.#delay = delay;
            if (interpolator === undefined)
                this.#interpolator = new Interpolator({type : interpType, params : interpolatorParams});
            else
                this.#interpolator = new Interpolator({interpolator : interpolator});
            this.#mutator = mutator;
            this.#enabled = enabled;
        }
        else{ //copy constructor
            this.copy(copy);
        }
    }

    //setters
    /**
     * Configures various Transition attributes.
     * 
     * @param {Object} [options = {}] The options to configure the transition.
     * @param {number} [options.duration ] The duration of the transition, in **ms**.
     * @param {number} [options.delay] The delay before the interpolation begins, in **ms**.
     * @param {string} [options.interpType] The interpolator type provided by {@link Interpolator}.
     * @param {Object} [options.interpParams = {}] Parameters to feed to the {@link Interpolator} generator.
     * @param {Interpolator} [options.interpolator] Interpolator to be used for the transition.
     * @param {function(*, *, number) : *} [options.mutator] Describes how to transform between two states based on interpolation value.
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = 1`.
     * @param {boolean} [options.enabled] Enables/disables the transition. If `false` will always output `startState`.
     */
    set configure({
        duration = undefined, 
        delay = undefined,
        interpolator = undefined,
        interpType = undefined, interpParams = {},
        mutator = undefined,
        enabled = undefined} = {}
    ){
        if (duration !== undefined) this.duration = duration;
        if (delay !== undefined) this.delay = delay;
        if (interpType !== undefined || interpolator !== undefined)
            this.interpolator = {
                interpolator : new Interpolator({type : interpType, params : interpParams, interpolator : interpolator})
        };
        if (mutator !== undefined) this.mutator = mutator;
        if (enabled !== undefined) this.enabled = enabled;
    }
    /**
     * Sets the mutator function used to transform between states.
     * 
     * **Warning:** setters logs a warning if mutator is not a function and does nothing.
     *  
     * @param {function(*, *, number) : *} mutatingFunction Describes how to transform between two states based on interpolation value
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = 1`.
     */
    set mutator(mutatingFunction){
        if (typeof mutatingFunction === "function") this.#mutator = mutatingFunction;
        else console.warn("Input not a function.");
    }
    /**
     * Sets the {@link Interpolator} used by the Transition.
     * 
     * @param {Object} options The options to configure the interpolator.
     * @param {string} [options.interpType] The interpolator type provided by {@link Interpolator}. 
     * @param {Object} [options.params = {}] Parameters to feed to the {@link Interpolator} generator.
     * @param {Interpolator} [options.interpolator] Interpolator to be used for the transition. Ignores `interpType` and `params` if provided.
     */
    set interpolator({interpType, params = {}, interpolator = undefined} = {}){
        if (interpolator === undefined) this.#interpolator = new Interpolator({type : interpType, params : params});
        else this.#interpolator.copy(interpolator);
    }
    /**
     * Sets the duration of the Transition.
     * 
     * @param {number} duration The duration, in **ms**.
     */
    set duration(duration){
        this.#duration = Math.max(0, duration);
    }
    /**
     * Sets the delay of the Transition. ie: the time before interpolation begins.
     * 
     * @param {number} delay The delay, in **ms**.
     */
    set delay(delay){
        this.#delay = Math.max(0, delay);
    }
    /**
     * Enables/Disables the Transition. The Transition will only return `startState` if disabled.
     * 
     * @param {boolean} flag enables/disables the Transition.
     */
    set enabled(flag){
        if (typeof flag === "boolean") this.#enabled = flag;
        else console.warn("Input not a boolean.");
    }

    //getters
    /**
     * Configuration describing the {@link Transition}.
     * 
     * @typedef {Object} TransitionConfiguration
     * @property {number} duration Duration of the transition, in **ms**.
     * @property {number} delay Delay of the transition, in **ms**.
     * @property {string} interpolatorName Name of the interpolator function being used.
     * @property {Interpolator} interpolator The Interpolator being used by the transition.
     * @property {boolean} enabled Whether the Transition is enabled/disabled.
     * @property {function(*, *, number) : *} mutator The function used to transform one state to another based on interpolation value.
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = 1`.
     */
    /**
     * Returns the current configuration of the Transition.
     * 
     * @returns {TransitionConfiguration} The current configuration of the Transition.
     */
    get configuration(){
        return {
            "duration" : this.#duration,
            "delay" : this.#delay,  
            "interpolatorName" : this.#interpolator.funcName,
            "interpolator" : this.#interpolator,
            "enabled" : this.#enabled,
            "mutator" : this.#mutator
        };
    }
    /**
     * Returns duration of the interpolation of the Transition, in **ms**.
     * 
     * **Note:** Does not include the time from delay, total duration would therefore be
     * `duration + delay`.
     * 
     * @returns {number} The duration of interpolation, in **ms**.
     */
    get duration(){ return this.#duration; }
    /**
     * Returns delay before the interpolation begins, in **ms**.
     * 
     * @returns {number} The delay, in **ms**.
     */
    get delay(){ return this.#delay; }
    /**
     * Returns the Interpolator used by the Transition.
     * 
     * **Note:** The returned `interpolator` is not a copy, and any changes to it
     * will reflect in the Transitions.
     * 
     * @see {@link Interpolator} 
     * @returns {Interpolator} The Interpolator used by the Transition
     */
    get interpolator() { return this.#interpolator; }
    /**
     * Returns the current working state of the Transition.
     * - `true` : Transition will advance as normal.
     * - `false` : Transition will always return `startState`.
     * 
     * @returns {boolean} The working state of the Transition.
     */
    get enabled() { return this.#enabled; }
    /**
     * Returns the mutating function used by the Transiton, to transform one state to another based on interpolation value.
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = 1`.
     * 
     * @returns {function(*, *, number) : *} The mutating function: `(startState, endState, t) => state`.
     */
    get mutator() { return this.#mutator; }

    /**
     * Returns the present state, based on progress between `startState` and `endState`,
     * derived from input `t`.
     * 
     * @param {*} startState The starting state of the Transition.
     * @param {*} endState The ending state of the Transition.
     * @param {number} t Time, in **ms**. Should be between `[0, total duration]`
     * @returns {*} New state based on the interpolation progress.
     */
    transform(startState, endState, t){
        if (!this.#enabled) return startState;
        if (this.#duration === 0) {
            return endState;
        }
        if (t <= this.#delay) return startState;

        const progress = this.#interpolator.calculate((t - this.#delay)/this.#duration);
        return this.#mutator(startState, endState, progress);
    }
    /**
     * Copies all attributes of the provided Transition.
     * 
     * @param {Transition} transition 
     */
    copy(transition){
        if (!(transition instanceof Transition))
                throw new Error("Argument must be a Transition.");
        this.#delay = transition.#delay;
        this.#duration = transition.#duration;
        this.#enabled = transition.#enabled;
        this.#interpolator = new Interpolator({interpolator: transition.#interpolator});
        this.#mutator = transition.#mutator;
    }
}

module.exports = Transition;
