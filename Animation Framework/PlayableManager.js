const Playable = require("./Playable.js");

/**
 * Manages multiple {@link Playable Playables} simultaneously.
 * 
 * A PlayableManager behaves like a single {@link Playable}, allowing a group of
 * playables to be controlled together to ensure consistent timing. Regular `Playable` methods 
 * like {@link pause()}, {@link resume()} etc. target one or more playables stored in the catalogue.
 *
 * Additional methods such as {@link pauseAll()}, {@link resumeAll()} etc. 
 * affect every managed playable in the managers catalogue. Since PlayableManager is also a `Playable`,
 * PlayableManagers can be nested.
 * 
 * When {@link run()} is called, the manager continously advances every managed playable via a
 * `requestAnimationFrame` loop, automatically stopping when **all** playables have finished.
 * 
 * **Note:** Each Stored playable must have a unique string identifier in order to be retrieved.
 * If two have the same identifier then it will always store the latest playable, 
 * and all previous playables with the same name will be lost.
 * 
 * **Warning:** All state changes (ie: pause, reset etc.) are expected to be done through the manager, not through
 * the individual stored playables. The manager may not notice if stored playables are manipulated directly
 * 
 * @extends Playable
 */
class PlayableManager extends Playable{
    #playables = new Map();
    #timestamp;
    #delta;
    #updateFrame;

    /**
     * @param {Object} [options = {}] The options to configure created manager.
     * @param {Array<string>} [options.names = []] The list of unique names for provided `playables` list (one to one mapped).
     * @param {Array<Playable>} [options.playables = []] The list of Playables to be stored in the catalogue.
     * @param {Object<string, Playable>} [options.namedPlayables] Object containing `name : playable` entriies, if provided
     */
    constructor({names = [], playables = [], namedPlayables = undefined, run=false} = {}){
        super();
            
        this._playableState = Playable.state.PAUSED;
        const min = Math.min(names.length, playables.length);
        if (namedPlayables !== undefined){
            for (const [name, playable] of Object.entries(namedPlayables)){
                this.#playables.set(name, playable);
            }
        }
        else{
            for (let i = 0; i < min; i++){
                this.#playables.set(names[i], playables[i]);
            }
        }
        this.#timestamp = undefined;
        this.#delta = 0;

        this.#updateFrame = (timestamp) => {
            if ((this._playableState ?? Playable.state.PLAYING) !== Playable.state.PLAYING) return;  
            this.#delta = timestamp - (this.#timestamp ?? timestamp);
            this.#timestamp = timestamp;
            const playableState = this.play(this.#delta);

            this._playableState = playableState;
            if(this._playableState === Playable.state.PLAYING) requestAnimationFrame(this.#updateFrame);
            else this.#timestamp = undefined;
        }
        if (run) this.run();
    }
    //private functions
    #executePlayableMethod(name, method, ...args){
        let found = false;
        if (typeof name === "string"){
            const retrievedPlayable = this.#playables.get(name);
            if (retrievedPlayable !== undefined){ 
                retrievedPlayable[method](...args);
                found = true;
            }
            else console.warn("Playable does not exist in manager's catalogue.")
        }
        else if (Array.isArray(name)){
            const retrievedPlayables = this.lookupPlayables(name, true);
            for (const playable of retrievedPlayables) {
                playable[method](...args);
                found = true;
            }
        }
        return found;
    }
    #executeAll(method, ...args){
        for (const playable of this.#playables.values()) playable[method](...args);
    }
    // Dont need this anymore as of now

    // #updateState(){
    //     if (this._playableState === Playable.state.FINISHED) return;
    //     let paused = true;
    //     for (const playable of this.#playables.values()){
    //         paused &&= (playable._playableState === Playable.state.PAUSED);
    //         if (!paused) break;
    //     }
    //     if (paused) this._playableState = Playable.state.PAUSED;
    //     else this._playableState = Playable.state.PLAYING;
    // }

    //getters
    /**
     * Returns a copy of the list of {@link Playable Playables} stored by the PlayableManager.
     * 
     * **Note:** The playables are not copies, any changes made to them will reflect on the
     * PlayableManager.
     * 
     * @returns {Array<Playable>} List of playables currently being managed.
     */
    get playables(){
        return [...this.#playables.values()];
    }
    /**
     * Returns a list of the unique identifiers of stored playables. Maps one to one to the stored list of 
     * playables.
     * 
     * **Warning:** Any change in ordering will no longer maintain the one to one mapping.
     * 
     * @returns {Array<string>} List of unique identifiers.
     */
    get names(){
        return [...this.#playables.keys()];
    }

    //class function
    /**
     * Looks up and returns a list of one or more Playables stored by the PlayableManager.
     * 
     * @param {Iterable<string>} names One or more names to retrieve from the PlayableManagers catalogue.
     * @param {boolean} warn If `true` will log a warning if a supplied name is not present in catalogue. If `false`
     * will ignore any misses and return whatever is present.
     * @returns {Array<Playable>} List of requested playables.
     */
    lookupPlayables(names, warn = false){
        const presentPlayables = [];
        let retrievedPlayable = undefined;
        for (const name of names){
            retrievedPlayable = this.#playables.get(name);
            if (retrievedPlayable !== undefined) presentPlayables.push(retrievedPlayable);
            else if (warn) console.warn(`${name} is not in manager's catalogue.`);
        }
        return presentPlayables;
    }
    /**
     * Returns a single playable based on provided name.
     * 
     * @param {string} name The unique name identifying which playable to retrieve.
     * @returns {Playable} The playable with the provided name.
     */
    playable(name){
        return this.#playables.get(name);
    }
    /**
     * Pauses one or more playable names provided.
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.pause pause()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.pause pause()} method.
     */
    pause(name, ...args){
        this.#executePlayableMethod(name, "pause", ...args);
    }
    /**
     * Resumes one or more playable names provided.
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.resume resume()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.resume resume()} method. 
     */
    resume(name, ...args){
        this.#executePlayableMethod(name, "resume", ...args);
        this.run();
    }
    /**
     * Reverse one or more playable names provided.
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.reverse reverse()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.reverse reverse()} method. 
     */
    reverse(name, ...args){
        this.#executePlayableMethod(name, "reverse", ...args);
        this.run();
    }
    /**
     * Forward one or more playable names provided.
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.forward forward()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.forward forward()} method. 
     */
    forward(name, ...args){
        this.#executePlayableMethod(name, "forward", ...args);
        this.run();
    }
    /**
     * Reset one or more playable names provided.
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.reset reset()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.reset reset()} method. 
     */
    reset(name, ...args){
        this.#executePlayableMethod(name, "reset", ...args);
        this.run();
    }
    /**
     * Sets the elapsed time one or more playable names provided.
     * 
     * **Note:** Handle with caution, only for integration with slider type stuff to 
     * analyze the playable working
     * 
     * @param {string|Array<string>} name The names of one or more playables to {@link Playable.seek seek()}. 
     * @param {...any} args The arguments to pass to the {@link Playable.seek seek()} method. 
     */
    seek(name, ...args){
        this.#executePlayableMethod(name, "seek", ...args);
    }

    /**
     * Pauses all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.pause pause()} method.
     */
    pauseAll(...args){
        this.#executeAll("pause", ...args);
        this._playableState = Playable.state.PAUSED;
    }
    /**
     * Resumes all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.resume resume()} method.
     */
    resumeAll(...args){
        this.#executeAll("resume", ...args);
        this.run();
    }
    /**
     * Reverses all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.reverse reverse()} method. Last argument is treated
     * as a flag for whether playable should be paused after reversing.
     */
    reverseAll(...args){
        this.#executeAll("reverse", ...args);
        this.run();
    }
    /**
     * Forwards all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.forward forward()} method. Last argument is treated
     * as a flag for whether playable should be paused after forwarding.
     */
    forwardAll(...args){
        this.#executeAll("forward", ...args);
        this.run();
    }
    /**
     * Resets all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.reset reset()} method. Last argument is treated
     * as a flag for whether playable should be paused after resetting.
     */
    resetAll(...args){
        this.#executeAll("reset", ...args);
        this.run();
    }
    /**
     * Seeks all stored playables.
     * 
     * @param {...any} args The arguments to pass to the {@link Playable.seek seek()} method.
     */
    seekAll(...args){
        this.#executeAll("seek", ...args);
    }
    /**
     * Advances all stored playables uniformly by the same delta time.
     * 
     * @param {number} dt The delta time, in **ms**, to advance all stored playables.
     * @returns {number} Playable state based on the following conditions:
     * - `Playable.PLAYING` if **atleast one** of the playables is currently playing.
     * - `Playable.PAUSED` if **all** the playables are currently paused.
     * - `Playable.FINISHED` if **all** the playables have finished running.
    */ 
    play(dt){
        let finished = true;
        let paused = true;
        for (const playable of this.#playables.values()){
            playable.play(dt);
            finished &&= (playable._playableState === Playable.state.FINISHED);
            paused &&= (playable._playableState === Playable.state.PAUSED);
        }
        return finished ? Playable.state.FINISHED : (paused ? Playable.state.PAUSED : Playable.state.PLAYING);
    }
    /**
     * Adds a new playable to the PlayableManagers catalogue.
     * 
     * @param {string} name The identifying name of the playback, must be unique.
     * @param {Playable} playable The playable to be added to the PlayableManagers catalogue.
     */
    addPlayable(name, playable){
        if (typeof name === "string" && playable instanceof Playable)
            this.#playables.set(name, playable);
    }
    /**
     * Removes an existing playable stored in the PlayableManagers catalogue.
     * 
     * @param {string} name The identifying name of the playback to remove from the PlayableManagers catalogue.
     */
    removePlayable(name){
        this.#playables.delete(name);
    }

    /**
     * Starts advancing the managed playables by triggering an update loop. Update loop stops automatically
     * when all playables are either paused or finished.
     * 
     * If the update loop is already running, this method has no effect.
     */
    run(){
        if (this._playableState === Playable.state.PLAYING) return;
        this._playableState = Playable.state.PLAYING;
        requestAnimationFrame(this.#updateFrame);
    }
    /**
     * Stops advancing the managed playables.
     * 
     * This does not reset or alter the state of any managed playable.
     */
    stop(){
        this._playableState = Playable.state.FINISHED;
    }
}

module.exports = PlayableManager;