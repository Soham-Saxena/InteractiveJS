const Playable = require("./Playable.js");

class PlayableManager extends Playable{
    #playables = new Map();
    #timestamp;
    #delta;
    #updateFrame;
    constructor({names = [], playables = [], run=false} = {}){
        super();
        this._playableState = Playable.state.PAUSED;
        const min = Math.min(names.length, playables.length);
        for (let i = 0; i < min; i++){
            this.#playables.set(names[i], playables[i]);
        }
        this.#timestamp = undefined;
        this.#delta = 0;
        let finished = false;

        this.#updateFrame = (timestamp) => {
            this.#delta = timestamp - (this.#timestamp ?? timestamp);
            this.#timestamp = timestamp;
            finished = this.play(this.#delta);
            console.log(finished);

            if(finished) this._playableState = Playable.state.FINISHED;
            if(this._playableState !== Playable.state.FINISHED) requestAnimationFrame(this.#updateFrame);
            else this.#timestamp = undefined
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
    #updateState(){
        if (this._playableState === Playable.state.FINISHED) return;
        let paused = true;
        for (const playable of this.#playables.values()){
            paused &&= (playable._playableState === Playable.state.PAUSED);
            if (!paused) break;
        }
        if (paused) this._playableState = Playable.state.PAUSED;
        else this._playableState = Playable.state.PLAYING;
    }
    //getters
    get playables(){
        return [...this.#playables.values()];
    }
    get names(){
        return [...this.#playables.keys()];
    }

    //class function
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
    playable(name){
        return this.#playables.get(name);
    }
    pause(name, ...args){
        this.#executePlayableMethod(name, "pause", ...args);
        this.#updateState();
    }
    resume(name, ...args){
        this.#executePlayableMethod(name, "resume", ...args);
        this.#updateState();
    }
    reverse(name, ...args){
        this.#executePlayableMethod(name, "reverse", ...args);
        this.#updateState();
    }
    forward(name, ...args){
        this.#executePlayableMethod(name, "forward", ...args);
        this.#updateState();
    }
    reset(name, ...args){
        this.#executePlayableMethod(name, "reset", ...args);
        this.#updateState();
    }
    setTimeElapsed(name, ...args){ //handle with caution, only for integration with slider type stuff to analyze the playable working
        this.#executePlayableMethod(name, "seek", ...args);
    }

    pauseAll(...args){
        this.#executeAll("pause", ...args);
        this._playableState = Playable.state.PAUSED;
    }
    resumeAll(...args){
        this.#executeAll("resume", ...args);
        this._playableState = Playable.state.PLAYING;
    }
    reverseAll(...args){
        let pause = args.at(-1);
        if (typeof pause !== "boolean") pause = undefined;
        this.#executeAll("reverse", ...args);
        if (pause === undefined) this.#updateState();
        else{
            if (pause) this._playableState = Playable.state.PAUSED;
            else this._playableState = Playable.state.PLAYING;
        }
    }
    forwardAll(...args){
        let pause = args.at(-1);
        if (typeof pause !== "boolean") pause = undefined;
        this.#executeAll("forward", ...args);
        if (pause === undefined) this.#updateState();
        else{
            if (pause) this._playableState = Playable.state.PAUSED;
            else this._playableState = Playable.state.PLAYING;
        }
    }
    resetAll(...args){
        let pause = args.at(-1);
        if (typeof pause !== "boolean") pause = undefined;
        this.#executeAll("reset", ...args);
        if (pause === undefined) this.#updateState();
        else{
            if (pause) this._playableState = Playable.state.PAUSED;
            else this._playableState = Playable.state.PLAYING;
        }
    }
    seekAll(...args){
        this.#executeAll("seek", ...args);
    }
    play(dt){
        let finished = true;
        for (const playable of this.#playables.values()){
            playable.play(dt);
            finished &&= (playable._playableState === Playable.state.FINISHED);
        }
        return finished;
    }
    addPlayable(name, playable){
        if (typeof name === "string" && playable instanceof Playable)
            this.#playables.set(name, playable);
    }
    removePlayable(name){
        this.#playables.delete(name);
    }

    run(){
        console.log("Run is called.");
        if (this._playableState === Playable.state.PLAYING) return;
        this._playableState = Playable.state.PLAYING;
        requestAnimationFrame(this.#updateFrame);
    }
    stop(){
        this._playableState = Playable.state.FINISHED;
    }
}

module.exports = PlayableManager;