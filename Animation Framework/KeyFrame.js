const Transition = require("./Transition.js");
/**@typedef {import("./Interpolator.js")} Interpolator*/

/**
 * Represents a state at a specific point in time. Contains:
 * - The absolute timestamp, in **ms**.
 * - The state at that timestamp.
 * - The {@link Transition} describing how to leave that state.
 *
 * **Note:** To represent a hold (or wait), set the transition to
 * `KeyFrame.HOLD` instead of a `Transition`.
 */
class KeyFrame{
    static HOLD = "hold";
    #state;
    #absTime;
    #transition;
    /**
     * @param {Object} options Options to configure created `KeyFrame`.
     * @param {*} options.state State stored by the KeyFrame.
     * @param {number} options.absTime Timestamp of KeyFrame, in **ms**.
     * @param {Transition|typeof KeyFrame.HOLD} [options.transition] {@link Transition} used to leave stored state, or `KeyFrame.HOLD` to represent a hold. Defaults to new {@link Transition() Transition}
     * @param {KeyFrame} [options.copy] Existing KeyFrame to copy. When provided, all other options are ignored.
    */
    constructor({
        state,
        absTime,
        transition,
        copy = undefined
    }){
        if (copy === undefined){
            if (state === undefined)
                throw new TypeError("state is required.");

            this.#state = structuredClone(state);
            this.#absTime = absTime;
            if (transition === undefined) this.#transition = new Transition();
            else{
                if (transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
                else this.#transition = new Transition({copy : transition});
            }
        }
        else {
            if (!(copy instanceof KeyFrame))
                throw new TypeError("copy must be a KeyFrame.");
            this.#state = copy.state;
            this.#absTime = copy.time;
            if (copy.transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
            else this.#transition = new Transition({copy : copy.transition});
        }
    }

    //getters
    /**
     * Returns a copy of the state stored by the KeyFrame.
     * 
     * @returns {*} A copy of the stored state.
     */
    get state(){
        return structuredClone(this.#state);
    }
    /**
     * Returns the absolute timestamp of the KeyFrame.
     * 
     * @returns {number} The absolute timestamp, in **ms**.
     */
    get time(){
        return this.#absTime;
    }
    /**
     * Returns the transition describing how to leave the KeyFrame.
     * 
     * @returns {Transition|typeof KeyFrame.HOLD} The transition used to leave the KeyFrame, or `KeyFrame.HOLD` if the KeyFrame represents a hold (or wait).
     */
    get transition(){
        return this.#transition;
    }

    //set
    /**
     * Configures the {@link Interpolator} used by the {@link Transition}.
     * 
     * **Warning:** If KeyFrame represents a hold/wait, this setter logs a warning and has no effect.
     * 
     * @param {Object} options The options to describe the Interpolator.
     * @param {Interpolator} [options.interpolator] Existing {@link Interpolator} to be copied. If provided, other parameters will be ignored.
     * @param {string} [options.interpType] Interpolation type from the {@link Interpolator} catalog.
     * @param {*} [options.params] The Parameters used to tune the interpolation type.
     */
    set interpolator({
        interpolator,
        interpType,
        params = {}
    } = {}){
        if (this.#transition === KeyFrame.HOLD){
            console.warn("This is a HOLD keyframe.");
            return;
        } 
        this.#transition.interpolator = {
            interpolator,
            interpType,
            params
        };
    }
    /**
     * Sets the {@link Transition} used to leave the KeyFrame.
     * 
     * @param {Transition|typeof KeyFrame.HOLD} transition The transition to copy, or `KeyFrame.HOLD` if the KeyFrame represents a hold (or wait).
    */
    set transition(transition){
        if (transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
        else this.#transition = new Transition({copy : transition});
    }
    /**
     * Sets the absolute timestamp of the KeyFrame.
     * 
     * @param {number} time The absolute timestamp, in **ms**.
    */
    set time(time){
        this.#absTime = time;
    }
    /**
     * Sets the state stored by the KeyFrame.
     *
     * @param {*} state State to copy and store.
    */
    set state(state){
        this.#state = structuredClone(state);
    }
}

module.exports = KeyFrame;