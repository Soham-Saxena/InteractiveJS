const Transition = require("./Transition.js")

class KeyFrame{
    static HOLD = "hold";
    #state;
    #absTime;
    #transition;
    constructor({
        state,
        absTime,
        transition,
        copy
    } = {}){
        if (copy === undefined){
            this.#state = structuredClone(state);
            this.#absTime = absTime;
            if (transition === undefined) this.#transition = new Transition();
            else{
                if (transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
                else this.#transition = new Transition({copy : transition});
            }
        }
        else {
            this.#state = copy.state;
            this.#absTime = copy.time;
            if (copy.transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
            else this.#transition = new Transition({copy : copy.transition});
        }
    }

    //getters
    get state(){
        return structuredClone(this.#state);
    }
    get time(){
        return this.#absTime;
    }
    get transition(){
        return this.#transition;
    }

    //set
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
    set transition(transition){
        if (transition === KeyFrame.HOLD) this.#transition = KeyFrame.HOLD;
        else this.#transition = new Transition({copy : transition});
    }
    set time(time){
        this.#absTime = time;
    }
    set state(state){
        this.#state = structuredClone(state);
    }
}

module.exports = KeyFrame;