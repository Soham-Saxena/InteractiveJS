const Transition = require("./Transition.js");
const Playable = require("./Playable.js");

class Animation extends Playable{
    #transition;
    #startState;
    #currentState;
    #endState;
    #updateState;
    #onFinish;

    #elapsed = 0;
    #reversed = false;

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
    get start(){ return this.#cloneState(this.#startState); }
    get end(){ return this.#cloneState(this.#endState); }
    get limits() {
        return {
            "start" : this.start,
            "end" : this.end
        };
    }
    get playableState(){ return this._playableState; }
    get reversed(){ return this.#reversed; }
    get timeElapsed() { return Math.max(Math.min(this.#elapsed, this.#transition.duration), 0); }
    get functionalTimeElapsed() { return this.timeElapsed - this.#transition.delay;}
    get transition() { return this.#transition; }

    //set
    set transition(transition){
        if (transition instanceof Transition){
            this.#transition = transition;
            this.#currentState = undefined;
        }
    }
    set start(startState){
        this.#startState = this.#cloneState(startState);
        this.#currentState = undefined;
    }
    set end(endState){
        this.#endState = this.#cloneState(endState);
        this.#currentState = undefined;
    }
    set limits({start : startState, end : endState}){
        this.#startState = this.#cloneState(startState);
        this.#endState = this.#cloneState(endState);
        this.#currentState = undefined;
    }

    //class functions
    pause(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PAUSED;
        else console.warn("Animation has finished.");
    }
    resume(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PLAYING;
        else console.warn("Animation has finished.");
    }
    reverse(pause = true){
        if (this._playableState === Playable.state.FINISHED && !this.#reversed) 
            this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = true;
    }
    forward(pause = true){
        if (this._playableState === Playable.state.FINISHED && this.#reversed)
            this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = false;
    }
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
    reset(pause = false){
        this.#elapsed = this.#reversed ? this.#transition.duration + this.#transition.delay : 0;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#currentState = undefined;
    }
    seek(elapsed){
        this.#elapsed = elapsed;
        this.#currentState = undefined;
    }
}

module.exports = Animation;