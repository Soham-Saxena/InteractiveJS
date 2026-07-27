/**@typedef {import('./KeyFrame.js') KeyFrame} */
const Transition = require("./Transition.js");
const Playable = require("./Playable.js");
/**
 * Animates from a starting state to an ending state, using provided {@link Transition}
 * 
 * extends {@link Playable}
 */
class Animation extends Playable{
    #transition;
    #startState;
    #currentState;
    #endState;
    #updateState;
    #onFinish;

    #elapsed = 0;
    #reversed = false;

    /**
     * @param {Object} [options] to configure the constructor
     * @param {Transition} [options.transition = new Transition()] The transition to use for animating
     * @param {*} [options.startState = undefined] Initial state of animation (at t = 0)
     * @param {*} [options.endState = undefined] Ending state of animation (at t = duration)
     * @param {function(*): void} onUpdate Callback invoked whenever the animation state is updated. Receives the **current state**.
     * @param {function(*): void} onFinish Callback invoked when the animation finishes. Receives the **end state**.
     */
    constructor({
        transition = new Transition(), 
        startState = undefined, 
        endState = undefined, 
        onUpdate = (updatedState) => {return},
        onFinish = (finishedState) => {return}
    } = {})
    {
        super();
        this.#transition = transition;
        if (!transition.enabled) this._playableState = Playable.state.FINISHED;
        this.#startState = startState;
        this.#endState = endState;
        this.#currentState = undefined;
        this.#updateState = onUpdate;
        this.#onFinish = onFinish;
    }
    //private functions
    #cloneState(state){
        if(
            state !== null &&
            typeof state === "object"
        ){
            return structuredClone(state);
        }
        return state;
    }
    //getters
    /**
     * Returns the current state of the animation based on elapsed time.
     * 
     * **Warning:** Expects limits to be defined (ie: `start` and `end`).
     * @returns {*} The current state animation has progressed to based on time elapsed, undefined if limits not defined.
     * 
     */
    get currentState(){
        if (this.#startState !== undefined && this.#endState !== undefined){
            if (this.#currentState === undefined) 
                this.#currentState = this.#transition.transform(this.start, this.end, this.#elapsed - this.#transition.delay);
            return this.#cloneState(this.#currentState);
        }
        else {
            console.warn("Limits not defined correctly.");
            return undefined;
        }
    }
    /**
     * Returns the state at the beginning of the Animation.
     * 
     * @returns {*} The starting state of the Animation.
     */
    get start(){ return this.#cloneState(this.#startState); }
    /**
     * Returns the state at the end of the Animation.
     * 
     * @returns {*} The ending state of the Animation.
     */
    get end(){ return this.#cloneState(this.#endState); }
    /**
     * Returns the current interpolation limits.
     * 
     * @returns {{start: *, end: *}} The starting and ending states of the Animations.
     */
    get limits() {
        return {
            "start" : this.start,
            "end" : this.end
        };
    }
    /**
     * Returns the current playable state of the animation.
     * 
     * @see {@link Playable}
     * @returns {Playable.state} The current playable state.
     */
    get playableState(){ return this._playableState; }
    /**
     * Returns whether the animation is currently playing in reverse.
     *
     * @returns {boolean} `true` if the animation is reversed; otherwise `false`.
     */
    get reversed(){ return this.#reversed; }
    /**
     * Returns the time elapsed since the animation began playing.
     * 
     * @returns {number} The elapsed time in **ms**, ranging between `[0, totalDuration]`
     */
    get timeElapsed() { return Math.max(Math.min(this.#elapsed, this.#transition.duration + this.#transition.delay), 0); }
    /**
     * Returns the time elapsed since the delay has completed
     * 
     * @returns {number} The elapsed time in **ms**, ranging between `[0, (totalDuration - delay)]`
     */
    get functionalTimeElapsed() { return Math.max(Math.min(this.#elapsed - this.#transition.delay, this.#transition.duration), 0)}
    /**
     * Returns the {@link Transition} used to move from `start` to `end`
     * 
     * **Note:** This is the same `Transition` instance used by the animation, not a copy.
     * Modifying it will also affect the animation.
     * @returns {Transition} The transition used by the animation.
     */
    get transition() { return this.#transition; }

    //setters
    /**
     * Sets the {@link Transition} used by the animation.
     *
     * **Note:** This invalidates the cached current state, which will be
     * recomputed the next time `Animation.#currentState` is accessed.
     *
     * @param {Transition} transition The transition to use.
     */
    set transition(transition) {
        if (transition instanceof Transition) {
            this.#transition = transition;
            this.#currentState = undefined;
        }
    }
    /**
     * Sets `start` state of the animation.
     * 
     * **Note:** This invalidates the cached current state, which will be
     * recomputed the next time current state is accessed.
     * 
     * @param {*} startState The new start state of the Animation.
     */
    set start(startState){
        this.#startState = this.#cloneState(startState);
        this.#currentState = undefined;
    }
    /**
     * Sets `end` state of the animation.
     * 
     * **Note:** This invalidates the cached current state, which will be
     * recomputed the next time current state is accessed.
     * 
     * @param {*} endState The new end state of the Animation.
     */
    set end(endState){
        this.#endState = this.#cloneState(endState);
        this.#currentState = undefined;
    }
    /**
     * Sets the start and end states of the animation.
     * 
     * **Note:** This invalidates the cached current state, which will be
     * recomputed the next time current state is accessed.
     * 
     * @param {Object} limits The new animation limits.
     * @param {*} limits.start The new start state of the animation.
     * @param {*} limits.end The new end stae of the animation.
     */
    set limits({start : startState, end : endState}){
        this.#startState = this.#cloneState(startState);
        this.#endState = this.#cloneState(endState);
        this.#currentState = undefined;
    }

    //class functions
    /**
     * Pauses the animation.
     * 
     * **Warning:** If animation has finished, this method has no effect and logs a warning.
     * 
     */
    pause(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PAUSED;
        else console.warn("Animation has finished.");
    }
    /**
     * Resumes the animation
     * 
     * **Warning:** If animation has finished, this method has no effect and logs a warning.
     */
    resume(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PLAYING;
        else console.warn("Animation has finished.");
    }
    /**
     * Plays the animation in reverse.
     * 
     * **Note:** If animation is already reversed, this method has no effect.
     * 
     * @see {@link Animation.reversed} to check whether animation is currently reversed or not.
     * @param {boolean} [pause=true] Whether to pause animation after changing direction. If `false` resumes immediately.
     */
    reverse(pause = true){
        if (this.#reversed) return;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = true;
    }
    /**
     * Plays the animation forward.
     * 
     * **Note:** if animation is not reversed, this method has no effect.
     * 
     * @param {boolean} pause Whether to pause animation after changing direction. If `false` resumes immediately.
     */
    forward(pause = true){
        if (!this.#reversed) return;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = false;
    }
    /**
     * Advances the animation by the specified time.
     * - If the animation is playing **forward**, the elapsed time is increased by `deltaT`.
     * - If the animation is **reversed**, the elapsed time is decreased by `deltaT`.
     * - Updates state by invoking provided `updateState(currentState)` function
     * - invokes provided `onFinish(endState)` function upon completion, and sets playable state to `FINISHED`.
     * 
     * **Note:** All values are clamped to animation bounds
     * 
     * @see {@link Animation.reversed} to determine whether the animation is currently reversed.
     * @param {number} deltaT Time passed since the last call to `play()` in **ms**.
     */
    play(deltaT){
        if (this.start === this.end) return;
        if (this._playableState === Playable.state.PAUSED || this._playableState === Playable.state.FINISHED){
            return;
        }
        if (
            (!this.#reversed) && ((this.#elapsed+deltaT) <= this.#transition.delay) ||
            (this.#reversed) && ((this.#elapsed-deltaT) <= this.#transition.delay)
        ){
            this.#elapsed += this.#reversed ? -deltaT : deltaT;
            if (this.#elapsed < 0) {
                this.#elapsed = 0;
                this._playableState = Playable.state.FINISHED;
            }
            return;
        }
        if (this.#startState !== undefined && this.#endState !== undefined){
            const delay = this.#transition.delay; 
            this.#elapsed += this.#reversed ? -deltaT : deltaT;
            this.#currentState = this.#transition.transform(this.start, this.end, this.#elapsed - delay);
            if ((this.#reversed && this.#elapsed <= 0) || (!this.#reversed && this.#elapsed >= (this.#transition.duration + delay))){
                this._playableState = Playable.state.FINISHED;
                this.#onFinish(this.end);
                this.#elapsed = this.#reversed ? 0 : this.#transition.duration + delay;
            }
            this.#updateState(this.currentState);
        }
    }
    /**
     * Resets the animation to an initial state.
     * - If the animation is playing forward, initial state is `start`.
     * - If the animation is reversed, initial state is `end`.
     * 
     * **Note:** This invalidates the cached current state, which will be
     * recomputed the next time `Animation.#currentState` is accessed.
     * 
     * @see {@link Animation.reversed} to determing whether the animation is currently reversed.
     * @param {boolean} pause Whether to pause animation after resetting. If `false`, resumes immediately.
     */
    reset(pause = false){
        this.#elapsed = this.#reversed ? this.#transition.duration + this.#transition.delay : 0;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#currentState = undefined;
    }

    /**
     * Manually sets the animations elapsed time to provided time
     * 
     * **Note:** clamps `elapsed` to animation bounds `[0, total duration]`
     * @param {number} elapsed The new elapsed time, in **ms**.
     */
    seek(elapsed){
        elapsed = Math.max(Math.min(elapsed, this.#transition.duration + this.#transition.delay), 0)
        this.#elapsed = elapsed;
        this.#currentState = undefined;
    }

    /** 
     * Creates an {@link Animation} from two {@link KeyFrame Keyframes}.
     * 
     * @param {KeyFrame} startFrame Describes the frame at the beginning of the created animation (along with transition instructions)
     * @param {KeyFrame} endFrame Describes the frame at the end of the created animation
     * @param {function(*): void} onUpdate Callback invoked whenever the animation state is updated. Receives the **current state**.
     * @param {function(*): void} onFinish Callback invoked when the animation finishes. Receives the **end state**.
     * @returns {Animation} Animation connecting the start frame and the ending frame using transition provided by `startFrame`
    */
    static fromKeyFrames(
        startFrame,
        endFrame,
        onUpdate = () => {return},
        onFinish = () => {return},
    ){
        return new Animation({
            startState : startFrame.state,
            endState : endFrame.state,
            transition : startFrame.transition,
            onUpdate : onUpdate,
            onFinish : onFinish
        });
    }
}

module.exports = Animation;