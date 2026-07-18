const Interpolator = require("./Interpolator.js");

class Transition{
    #duration;
    #delay;
    #interpolator;
    #mutator;
    #enabled;

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
            this.#duration = copy.duration;
            this.#delay = copy.delay;
            this.#interpolator = copy.interpolator;
            this.#mutator = copy.mutator;
            this.#enabled = copy.enabled;
        }
    }

    //setters
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
    set mutator(mutatingFunction){
        if (typeof mutatingFunction === "function") this.#mutator = mutatingFunction;
        else console.warn("Input not a function.");
    }
    set interpolator({interpType, params = {}, interpolator = undefined} = {}){
        if (interpolator === undefined) this.#interpolator = new Interpolator({type : interpType, params : params});
        else this.#interpolator = new Interpolator({interpolator : interpolator})
    }
    set duration(duration){
        this.#duration = Math.max(0, duration);
    }
    set delay(delay){
        this.#delay = Math.max(0, delay);
    }
    set enabled(flag){
        if (typeof flag === "boolean") this.#enabled = flag;
        else console.warn("Input not a boolean.");
    }

    //getters
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
    get duration(){ return this.#duration; }
    get delay(){ return this.#delay; }
    get interpolator() { return this.#interpolator; }
    get enabled() { return this.#enabled; }
    get mutator() { return this.#mutator; }

    transform(startState, endState, t){
        if (!this.#enabled) return startState;
        if (this.#duration === 0) {
            return endState;
        }
        const progress = this.#interpolator.calculate(t/this.#duration);
        return this.#mutator(startState, endState, progress);
    }
}

module.exports = Transition;
