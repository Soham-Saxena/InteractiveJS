const Playable = require("./Playable.js");
const KeyFrame = require("./KeyFrame.js");
const Transition = require("./Transition.js");
const { Animation } = require("./index.js");

class TimeLine extends Playable{
    static Mode = Object.freeze({
        RELATIVE : "relative",
        ABSOLUTE : "absolute"
    });

    #keyframes = [];
    #prevKf = undefined;
    #transition = new Transition();
    #wait = 0;
    #onFinish;
    #sameState;
    // In RELATIVE mode:
    //   compiled == false -> keyframe.time stores duration
    //   compiled == true  -> keyframe.time stores absolute timestamps
    //
    // In ABSOLUTE mode:
    //   keyframe.time always stores absolute timestamps.

    #mode = undefined;
    #compiled = false;
    #locked = false;
    constructor({mode, transition, onFinish = () => {}, sameState} = {}){
        super();
        if(transition instanceof Transition)
            this.#transition = new Transition({copy : transition});
        if (typeof onFinish === "function")
            this.#onFinish = onFinish;
        else 
            throw new Error("onFinish must be a function.");
        if (mode === TimeLine.Mode.ABSOLUTE || mode === TimeLine.Mode.RELATIVE){
            this.#mode = mode;
        }
        else this.#mode = TimeLine.Mode.RELATIVE;
        if (typeof sameState === "function"){
            this.#sameState = sameState;
        }
    }
    //private functions
    #validateTime(time, allowZero = true){
        return Number.isFinite(time) && (allowZero ? time >= 0 : time > 0);
    }
    #getInsertionIndex(timestamp){
        const result = this.#binarySearch(timestamp, true);
        if (result.found)
            throw new Error("KeyFrames with duplicate timestamps can't exist.");
        else
            return result.index;
    }
    #assertUniqueTimestamp(timestamp){
        if (this.#binarySearch(timestamp) !== undefined)
            throw new Error("KeyFrames with duplicate timestamps can't exist.")
    }
    #assertTimestampOrder(timestamp, insertIndex){
        const prevTime = this.#keyframes[insertIndex - 1]?.time ?? -Infinity;
        const nextTime = this.#keyframes[insertIndex]?.time ?? Infinity;

        if (timestamp <= prevTime || timestamp >= nextTime)
            throw new Error("KeyFrame insertion will break chronological order.");
    }
    #assertMode(expectedMode){
        this.#mode = this.#mode ?? expectedMode;
        if (this.#mode !== expectedMode) 
            throw new Error(`Violating TimeLines Mode: ${this.#mode}`);
    }
    #assertBuilderFunc(){
        if(this.#locked)
            throw new Error("Unlock TimeLine in order to build/modify.");
    }
    #binarySearch(timestamp, forInsert = false, array = undefined){
        const arr = array?? this.#keyframes;
        let first = 0;
        let last = arr.length - 1;
        let mid = 0;
        while(first <= last){
            mid = Math.floor((first + last)/2);
            if (arr[mid].time === timestamp) 
                return forInsert ? {index : mid, found : true} : mid;
            else if (arr[mid].time < timestamp)
                first = mid + 1;
            else 
                last = mid - 1; 
        }
        return forInsert ? {index : first, found : false} : undefined;
    }
    #insertAt(timestamp, state){
        if (!this.#validateTime(timestamp))
            throw new Error("Timestamp must be a non-negative finite value.");
        let keyframe = undefined;
        if (state !== KeyFrame.HOLD){
            keyframe = new KeyFrame({state : state, absTime : timestamp, transition : this.#transition});
        }
        else 
            keyframe = new KeyFrame({state : null, absTime : timestamp, transition : KeyFrame.HOLD});
        const index = this.#getInsertionIndex(timestamp);
        if(index === this.#keyframes.length) this.#keyframes.push(keyframe);
        else this.#keyframes.splice(index, 0, keyframe);
        
        return {
            index : index,
            kf : keyframe
        };
    }
    #moveCursor(kf, index){
        this.#prevKf = {
            index : index,
            kf : kf
        };
    }
    #retrieveKf(index){
        const kf = this.#keyframes[index];
        if (kf === undefined)
            throw new Error("Index out of range.");

        return kf;
    }
    #addWait(timestamp){
        if(this.#wait !== 0){
            let holdTimestamp = this.#wait;
            if (this.#prevKf !== undefined) holdTimestamp += this.#prevKf.kf.time;
            else 
                throw new Error("Previous state must exist to trigger a wait.");
            if (holdTimestamp >= timestamp) 
                throw new Error("wait() time exceeds time until next frame.");
            this.#insertAt(holdTimestamp, KeyFrame.HOLD);
            this.#wait = 0;
        }
    }
    #compileAbsolute(){
        const length = this.#keyframes.length;
        if (length === 0) return;
        for (let i = length - 1; i >= 0; i++){
            /**@type KeyFrame*/
            const currFrame = this.#keyframes[i];

            if(currFrame.transition === KeyFrame.HOLD){
                /**@type KeyFrame*/
                const prevFrame = this.#keyframes[i - 1];
                if (prevFrame?.transition === KeyFrame.HOLD){
                    this.#keyframes.splice(i - 1, 1);
                }
                else{
                    if (prevFrame !== undefined)
                        prevFrame.transition.delay = currFrame.time - prevFrame.time;
                    this.#keyframes.splice(i, 1);
                }
            }
            else if (this.#sameState !== undefined){
                /**@type KeyFrame*/
                const nextFrame = this.#keyframes[i + 1];
                if (nextFrame !== undefined && this.#sameState(currFrame.state, nextFrame.state)){
                    this.#keyframes.splice(i, 1);
                }
            }
        }
        if (this.#keyframes[0].time !== 0){
            this.#keyframes[0].transition.delay += (this.#keyframes[0].time);
            this.#keyframes[0].time = 0;
        }
    }
    #absolutizeKf(kf, prevTime, holdKeyframe = false){
        kf.time = (prevTime += kf.time);
        let holdTime = undefined;
        if (holdKeyframe){
            holdTime = kf.time + kf.transition.delay;
            kf.transition.delay = 0;
        }
        return {
            newTime : prevTime,
            holdTime : holdTime
        };
    }
    #transformRelative(holdKeyframes = false, copy = false){ //transforms relative to absolute
        this.#assertMode(TimeLine.Mode.RELATIVE);

        let time = 0;
        if (!copy){
            this.#mode = TimeLine.Mode.ABSOLUTE;
            const holdTimes = [];
            this.#keyframes.forEach((kf) => {
                const {newTime, holdTime} = this.#absolutizeKf(kf, time, holdKeyframes);
                if(holdTime !== undefined) holdTimes.push(holdTime);
                time = newTime;
            })
            holdTimes.forEach(ht => this.#insertAt(ht, KeyFrame.HOLD));
            return null;
        }
        else{
            const copy = [];
            this.#keyframes.forEach((kf) => {
                const copyKf = new KeyFrame({copy : kf});
                const {newTime, holdTime} = this.#absolutizeKf(copyKf, time, holdKeyframes);
                
                time = newTime;
                copy.push(copyKf);
                if(holdTime !== undefined){
                    const {index, found} = this.#binarySearch(holdTime, true, copy);
                    if(found) //should never trigger lol
                        throw new Error("Cannot create copy with duplicate timestamps");
                    copy.splice(index, 0, new KeyFrame({ absTime : holdTime, transition : KeyFrame.HOLD}));
                }
            }) 

            return copy;
        }
    }
    #transformAbsolute(copy = false){ //transforms absolute to relative
        this.#assertMode(TimeLine.Mode.ABSOLUTE);

        const length = this.#keyframes.length;
        if (length === 0) return;
        if (this.#keyframes[0].time !== 0){
            this.#keyframes[0].transition.delay += (this.#keyframes[0].time);
            this.#keyframes[0].time = 0;
        }
        
        if (!copy){
            this.#mode = TimeLine.Mode.RELATIVE;
            for(let i = length - 1; i >= 0; i++){
                /**@type KeyFrame*/
                const currFrame = this.#keyframes[i];

                if(currFrame.transition === KeyFrame.HOLD){
                    /**@type KeyFrame*/
                    const prevFrame = this.#keyframes[i - 1];
                    if (prevFrame?.transition === KeyFrame.HOLD){
                        this.#keyframes.splice(i - 1, 1);
                    }
                    else{
                        if (prevFrame !== undefined)
                            prevFrame.transition.delay = currFrame.time - prevFrame.time;
                        this.#keyframes.splice(i, 1);
                    }
                }
                else{
                    /**@type KeyFrame*/
                    const nextFrame = this.#keyframes[i + 1];
                    if(nextFrame === undefined) currFrame.time = undefined;
                    else currFrame.time = nextFrame.time - currFrame.time;
                }
            }
        }
        else{
            const copy = []
            for(let i = 0; i < length; i++){
                /**@type KeyFrame*/
                const currFrame = new KeyFrame({copy : this.#keyframes[i]});
                /**@type KeyFrame*/
                let nextFrame = this.#keyframes[i + 1];
                if (nextFrame?.transition === KeyFrame.HOLD){
                    let count = i + 1;
                    while(this.#keyframes[++count]?.transition === KeyFrame.HOLD){
                        nextFrame = this.#keyframes[count];
                    }
                    if (nextFrame?.transition !== KeyFrame.HOLD){
                        const waitTime = this.#keyframes[count-1].time - currFrame.time;
                        currFrame.transition.delay = waitTime;
                        currFrame.time = nextFrame.time - currFrame.time;
                    }
                    else{
                        currFrame.time = undefined;
                    }
                    copy.push(currFrame);
                    i = count - 1;
                }
                else{
                    if(nextFrame === undefined) currFrame.time = undefined;
                    else currFrame.time = nextFrame.time - currFrame.time;
                    copy.push(currFrame);
                }
            }

            return copy;
        }
    }

    //getter
    get mode(){
        return this.#mode;
    }

    //class functions
    retrieveKf(index, copy = false){
        return copy ? new KeyFrame({copy : this.#retrieveKf(index)}) : this.#retrieveKf(index);
    }
    transform(interpType, params = {}){
        this.#assertBuilderFunc();
        this.#transition.interpolator = {interpType : interpType, params : params};

        return this;
    }
    mutate(mutator){
        this.#assertBuilderFunc();
        this.#transition.mutator = mutator;

        return this;
    }
    at(timestamp, state){
        this.#assertBuilderFunc();
        this.#assertMode(TimeLine.Mode.ABSOLUTE);
        this.#addWait(timestamp);
        const { index, kf } = this.#insertAt(timestamp, state);
        this.#moveCursor(kf, index);

        this.#compiled = false;
        return this;
    }
    from(state){
        this.#assertBuilderFunc();
        if (this.#wait !== 0) 
            throw new Error("Cannot use from() while having a pending Hold.");
        if (this.#mode === TimeLine.Mode.ABSOLUTE){
            if (this.#keyframes.length !== 0)
                throw new Error("From can only be called once.");
            const { index, kf } = this.#insertAt(0, state);
            this.#moveCursor(kf, index);
        }
        else{
            if (this.#keyframes.length !== 0)
                throw new Error("From can only be called when no KeyFrames have been created.");
            const kf = new KeyFrame({state : state, transition : this.#transition})
            kf.transition.delay += this.#wait;
            this.#wait = 0;
            this.#keyframes.push(kf);
            this.#moveCursor(kf, 0)
        }

        this.#compiled = false;
        return this;
    }
    to(state, duration){
        this.#assertBuilderFunc();
        if(this.#keyframes.length === 0)
            throw new Error("TimeLine must contain keyframes to utilize relative construction.");
        if(!this.#validateTime(duration, false))
            throw new Error("Duration must be a positive finite value.");
        this.#assertMode(TimeLine.Mode.RELATIVE);
        const cursor = this.#prevKf ?? {
            index: this.#keyframes.length - 1,
            kf: this.#keyframes.at(-1)
        };
        cursor.kf.time = duration + this.#wait;
        cursor.kf.transition.delay += this.#wait;
        const kf = new KeyFrame({ state : state, transition : this.#transition});
        const index = cursor.index + 1;
        if (index === this.#keyframes.length) 
            this.#keyframes.push(kf);
        else
            this.#keyframes.splice(index, 0, kf);
        
        this.#wait = 0;
        this.#moveCursor(kf, index);
        this.#compiled = false;
        return this;
    }
    wait(duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration, false)) 
            throw new Error("Duration must be a positive finite value.");
        if (this.#mode === undefined)
            throw new Error("Mode must be specified before using wait.");
        if(this.#wait !== 0) console.warn("Accumulating previous unconsidered hold value");
        this.#wait += duration;

        return this;
    }
    flushWait(){
        this.#assertBuilderFunc();
        this.#wait = 0;

        return this;
    }
    resetCursor(){
        this.#assertBuilderFunc();
        this.#prevKf = undefined;

        return this;
    }
    seekCursor(index){
        this.#assertBuilderFunc();
        const kf = this.#retrieveKf(index);
        this.#moveCursor(kf, index);

        return this;
    }
    after(index, state, duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration, false)) 
            throw new Error("Duration must be a postiive finite value.");
        const prevkf = this.#retrieveKf(index);

        if (this.#mode === TimeLine.Mode.ABSOLUTE){
            const nextKfTimestamp = prevkf.time + duration + this.#wait;
            this.#assertTimestampOrder(nextKfTimestamp, index + 1);
            this.#addWait(nextKfTimestamp);
            const kf = new KeyFrame({ state : state, absTime : nextKfTimestamp, transition : this.#transition});
            this.#keyframes.splice(index + 1, 0, kf);

            this.#moveCursor(kf, index + 1);
        }
        else {
            const kf = new KeyFrame({ state : state, transition : this.#transition});
            prevkf.time = duration + this.#wait;
            prevkf.transition.delay += this.#wait;
            this.#wait = 0;
            if (index === this.#keyframes.length - 1){
                this.#keyframes.push(kf);
            }
            else{
                const nextKf = this.#keyframes[index + 1];
                kf.time = nextKf.time;
                kf.transition.delay = nextKf.transition.delay;
                this.#keyframes.splice(index + 1, 0, kf);
            }

            this.seekCursor(index + 1);
        }

        this.#compiled = false;
        return this;
    }
    before(index, state, duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration, false)) 
            throw new Error("Duration must be a positive finite value.");
        const nextkf = this.#retrieveKf(index);

        if (this.#mode === TimeLine.Mode.ABSOLUTE){
            const prevKfTimestamp = nextkf.time - (duration + this.#wait);
            if (prevKfTimestamp < 0)
                throw new Error("KeyFrames timestamp becomes negative");
            this.#assertTimestampOrder(prevKfTimestamp, index);
            const kf = new KeyFrame({ state : state, absTime : prevKfTimestamp, transition : this.#transition});
            this.#keyframes.splice(index, 0, kf);

            this.#moveCursor(kf, index);
            this.#addWait(prevKfTimestamp);
        }
        else {
            const kf = new KeyFrame({ state : state, transition : this.#transition});
            kf.time = duration + this.#wait;
            kf.transition.delay += this.#wait;
            this.#wait = 0;
            this.#keyframes.splice(index, 0, kf);

            this.seekCursor(index);
        }

        this.#compiled = false;
        return this;
    }
    compile(){
        if (this.#compiled) return;
        if (this.#sameState === undefined)
            console.warn("Cannot resolve duplicate KeyFrame transitions due to missing equating function.\nPlease consider providing one for eliminating redudancy.");
        if (this.#mode === TimeLine.Mode.ABSOLUTE){
            this.#compileAbsolute();
        }
        else if (this.#mode === TimeLine.Mode.RELATIVE){
            this.#transformRelative();
            this.#compileAbsolute();
        }

        this.#compiled = true;
        this.#locked = true;
    }
    unlock(mode = undefined){
        if(!this.#locked) return;
        if(mode === undefined){
            this.#locked = false;
            return;
        }
        if(!(mode === TimeLine.Mode.ABSOLUTE || mode === TimeLine.Mode.RELATIVE))
            throw new Error("Input mode must be one of TimeLines Modes.");
        if (mode !== this.#mode){
            if(mode === TimeLine.Mode.ABSOLUTE)
                this.#transformAbsolute();
            else 
                this.#transformRelative();
        }
        this.#locked = false;
    }
    inspectKeyFrames(mode = this.#mode){
        if(!(mode === TimeLine.Mode.ABSOLUTE || mode === TimeLine.Mode.RELATIVE))
            throw new Error("Please give a timeline mode to inspect");
        if(mode !== this.#mode){
            return (mode === TimeLine.Mode.ABSOLUTE) ?
                this.#transformAbsolute(true) :
                this.#transformRelative(true, true);
        }
        const copy = []
        this.#keyframes.forEach(kf => copy.push(new KeyFrame({copy : kf})));
        return copy;
    }
}
