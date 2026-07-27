class Playable{
    static state = Object.freeze({
        PLAYING : 0,
        PAUSED : 1,
        FINISHED : 2
    });
    _playableState = Playable.state.FINISHED;

    constructor(){
        if (new.target === Playable)
            throw new Error("Cannot instantiate this class.");
    }

    pause(...args){
        throw new Error("pause() must be implemented by a subclass");
    }
    resume(...args){
        throw new Error("resume() must be implemented by a subclass");
    }
    reverse(...args){
        throw new Error("reverse() must be implemented by a subclass");
    }
    forward(...args){
        throw new Error("foward () must be implemented by a subclass");
    }
    reset(...args){
        throw new Error("reset() must be implemented by a subclass");
    }
    seek(...args){
        throw new Error("seek() must be implemented by a subclass");
    }
    play(...args){
        throw new Error("play() must be implemented by a subclass");
    }

    get playableState(){
        return this._playableState;
    }
    set playableState(state){
        console.warn("This is a dummy function that doesnt do anything");
        //do nothing for now, if classes want to they can implement it
    }
}

module.exports = Playable;