/**
 * Abstract base class for objects representing continous time-based behavior.
 * 
 * A playable defines a common playback interface that can be implemented by animations,
 * timelines, or any object supporting the following functions:
 * - `play()`
 * - `pause()` & `resume()`
 * - `reverse()` & `forward()`
 * - `reset()`
 * - `seek()`
 * 
 * This class cannot be instantiated directly.
 * 
 * @abstract
*/
class Playable{
    /**
     * Playback states.
     * - `PLAYING` : Playback is currently running.
     * - `PAUSED` : Playback is temporarily suspended.
     * - `FINISHED` : Playback has reached its end.
     * 
    */
    static state = Object.freeze({
        PLAYING : 0,
        PAUSED : 1,
        FINISHED : 2
    });
    _playableState = undefined;

    constructor(){
        if (new.target === Playable)
            throw new Error("Cannot instantiate this class.");
    }

    /**
     * Pauses the playback.
     * 
     * @abstract 
    */
    pause(...args){
        throw new Error("pause() must be implemented by a subclass");
    }
    /**
     * Resumes the playback.
     * 
     * @abstract 
     */
    resume(...args){
        throw new Error("resume() must be implemented by a subclass");
    }
    /**
     * Reverses the playback.
     * 
     * @abstract
     */
    reverse(...args){
        throw new Error("reverse() must be implemented by a subclass");
    }
    /**
     * Forwards the playback.
     * 
     * @abstract
     */
    forward(...args){
        throw new Error("forward() must be implemented by a subclass");
    }
    /**
     * Resets the playback
     * 
     * @abstract
     */
    reset(...args){
        throw new Error("reset() must be implemented by a subclass");
    }
    /**
     * Progresses to a specific point of the playback.
     * 
     * @abstract
     */
    seek(...args){
        throw new Error("seek() must be implemented by a subclass");
    }
    /**
     * Advances the playback.
     * 
     * @abstract
     */
    play(...args){
        throw new Error("play() must be implemented by a subclass");
    }

    /**
     * Returns the current playable state.
     * 
     * @returns {number} One of the {@link Playable.state Playback States}.
     */
    get playableState(){
        return this._playableState;
    }
    /**
     * **Warning:** Simply logs a warning if nothing is implemented by the subclass,
     * as a safety feature to ensure playbacks state is only mutated intentionally
     */
    set playableState(state){
        console.warn("This is a dummy function that doesnt do anything");
        //do nothing for now, if classes want to they can implement it
    }
}

module.exports = Playable;