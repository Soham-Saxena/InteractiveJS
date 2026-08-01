const Playable = require("./Playable.js");
const KeyFrame = require("./KeyFrame.js");
const Transition = require("./Transition.js");
const Animation = require("./Animation.js");

/**@typedef {import("./Interpolator.js")} Interpolator*/


class Timeline extends Playable{
    /**
     * Modes supported by the {@link Timeline} class.
     * - `RELATIVE` : Treats durations as the source of truth, therefore keyframes have to be defined
     * with respect to previous keyframes.
     * - `ABSOLUTE` : Treats absolute timestamps as the source of truth, therefore keyframes have to be
     * defined relative to their position in time.
     * 
     * **In RELATIVE mode**:
     *   compiled == false -> keyframe.time stores duration
     *   compiled == true  -> keyframe.time stores absolute timestamps
     *
     * **In ABSOLUTE mode**:
     *   keyframe.time always stores absolute timestamps.
     * 
     * @enum {string}
     * @readonly
     */
    static Mode = Object.freeze({
        RELATIVE : "relative",
        ABSOLUTE : "absolute"
    });

    /**@type {Array<KeyFrame>}*/
    #keyframes = [];
    /**@type {KeyFrame} */
    #prevKf = undefined;
    /**@type {KeyFrame} */
    #currKf = undefined;
    /**@type {Transition}*/
    #transition = new Transition();
    #wait = 0;
    #onFinish = undefined;
    #onFrameChange = undefined;
    #sameState;
    #elapsedTime;
    #animation;
    #onUpdate;
    #reversed = false;
    #mode = undefined;
    #compiled = false;
    #locked = false;
    /**
     * @param {Object} options The options to configure the Timeline.
     * @param {typeof Timeline.Mode} [options.mode = Timeline.Mode.RELATIVE] The mode used to initialize the timeline, `Timeline.Mode.RELATIVE`
     * if not provided.
     * @param {Transition} [options.transition] The {@link Transition} to use to move from one {@link KeyFrame} to another.
     * Applies the default Transition if not provided.
     * @param {function(*) : void} [options.onUpdate] The method to invoke on update (via {@link play()}).
     * - Expected to be of the form `function(newState) : void`
     * @param {function(*) : void} [options.onFinish] The method to invoke upon completing the Timeline.
     * - Expected to be of the form `function(lastState) : void`
     * @param {function(*, *) : void} [options.onFrameChange] The method to invoke upon moving from one {@link KeyFrame} to another.
     * - Expected to be of the form `function(prevState, nextState) : void` 
     * @param {function(*, *) : boolean} [options.sameState] Comparison function to test whether two states
     * are equivalent. Used to optimize the Timeline by reducing duplicate {@link KeyFrame KeyFrames}.
     * @param {Timeline} copy Existing Timeline to create a copy of. If provided, all other parameters are ignored.
     * **Note:** Although optional, it is highly recommend to provide one, as otherwise extra memory will be wasted
     * on duplicate KeyFrames that could have been reduced.
     */
    constructor({mode, transition, onUpdate, onFinish, onFrameChange, sameState, copy=undefined} = {}){
        super();

        if(transition instanceof Transition)
            this.#transition = new Transition({copy : transition});
        if (typeof onFinish === "function")
            this.#onFinish = onFinish;
        if (typeof onFrameChange === "function"){
            this.#onFrameChange = onFrameChange;
        }
        if (mode === Timeline.Mode.ABSOLUTE || mode === Timeline.Mode.RELATIVE){
            this.#mode = mode;
        }
        else this.#mode = Timeline.Mode.RELATIVE;
        if (typeof sameState === "function"){
            this.#sameState = sameState;
        }
        if (typeof onUpdate === "function"){
            this.#onUpdate = onUpdate;
        }
        this.#elapsedTime = 0;
        this._playableState = Playable.state.PAUSED;

        this.#animation = new Animation({ onUpdate : onUpdate});
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
            throw new Error(`Violating Timelines Mode: ${this.#mode}`);
    }
    #assertBuilderFunc(){
        if(this.#locked)
            throw new Error("Unlock Timeline in order to build/modify.");
        if((this._playableState ?? Playable.state.PAUSED) === Playable.state.PLAYING)
            throw new Error("Cannot modify Timeline while its running")
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
        if (length <= 1) return;

        const result = []; // built right-to-left; reversed at the end
        let i = length - 1;

        while (i >= 0){
            const currFrame = this.#keyframes[i];

            if (currFrame.transition === KeyFrame.HOLD){
                let runStart = i;
                while (runStart - 1 >= 0 && this.#keyframes[runStart - 1].transition === KeyFrame.HOLD){
                    runStart--;
                }
                const prevFrame = this.#keyframes[runStart - 1];
                if (prevFrame !== undefined){
                    prevFrame.transition.delay = currFrame.time - prevFrame.time; // currFrame = rightmost HOLD in the run
                }
                i = runStart - 1;
                continue;
            }

            const nextFrame = result.length > 0 ? result[result.length - 1] : undefined;
            if (this.#sameState !== undefined && nextFrame !== undefined && this.#sameState(currFrame.state, nextFrame.state)){
                i--; // drop currFrame — its delay (if any was just assigned) is discarded along with it, matching original
                continue;
            }

            result.push(currFrame);
            i--;
        }

        result.reverse();
        this.#keyframes = result;
        if (this.#keyframes.length = 0)
            return;
        if (this.#keyframes[0].time !== 0){
            this.#keyframes[0].transition.delay += (this.#keyframes[0].time);
            this.#keyframes[0].time = 0;
        }
    }
    #absolutizeKf(kf, prevTime, holdKeyframe = false){
        const duration = kf.time;      // duration to the *next* keyframe
        kf.time = prevTime;            // this keyframe's own absolute time
        let holdTime = undefined;
        if (holdKeyframe && kf.transition.delay > 0){
            holdTime = kf.time + kf.transition.delay;
            kf.transition.delay = 0;
        }
        return {
            newTime : prevTime + duration,
            holdTime : holdTime
        };
    }
    #transformRelative(holdKeyframes = false, copy = false){ //transforms relative to absolute
        this.#assertMode(Timeline.Mode.RELATIVE);

        let time = 0;
        const result = [];

        this.#keyframes.forEach((kf) => {
            const target = copy ? new KeyFrame({copy : kf}) : kf;
            const {newTime, holdTime} = this.#absolutizeKf(target, time, holdKeyframes);

            time = newTime;
            result.push(target);
            if (holdTime !== undefined){
                if (holdTime >= newTime)   // hold time landed at-or-past the *next* keyframe — invalid delay/duration relationship
                    throw new Error("Transition delay exceeds segment duration; cannot insert HOLD keyframe.");
                result.push(new KeyFrame({ absTime : holdTime, transition : KeyFrame.HOLD }));
            }
        });

        if (!copy){
            this.#mode = Timeline.Mode.ABSOLUTE;
            this.#keyframes = result;
            return null;
        }
        else{
            return result;
        }
    }
    #transformAbsolute(copy = false){ //transforms absolute to relative
        this.#assertMode(Timeline.Mode.ABSOLUTE);

        const length = this.#keyframes.length;
        if (length === 0) return;
        if (this.#keyframes[0].time !== 0){
            this.#keyframes[0].transition.delay += (this.#keyframes[0].time);
            this.#keyframes[0].time = 0;
        }
        let duration = 0;
        const transformedKeyFrames = []
        for(let i = 0; i < length; i++){
            /**@type KeyFrame*/
            const currFrame = new KeyFrame({copy : this.#keyframes[i]});
            /**@type KeyFrame*/
            let nextFrame = this.#keyframes[i + 1];
            if (nextFrame?.transition === KeyFrame.HOLD){
                let count = i + 1;
                while(this.#keyframes[++count]?.transition === KeyFrame.HOLD){}
                nextFrame = this.#keyframes[count];
                if (nextFrame !== undefined){
                    const waitTime = this.#keyframes[count-1].time - currFrame.time;
                    currFrame.transition.delay = waitTime;
                    currFrame.time = nextFrame.time - currFrame.time;
                }
                else{
                    currFrame.time = 0;
                }
                transformedKeyFrames.push(currFrame);
                i = count - 1;
            }
            else{
                if(nextFrame === undefined) currFrame.time = 0;
                else currFrame.time = nextFrame.time - currFrame.time;
                transformedKeyFrames.push(currFrame);
            }
        }

        if (copy) return transformedKeyFrames;
        else this.#keyframes = transformedKeyFrames;
    }
    /**
     * @typedef {Object} boundingKeyframes Object containing bounding keyframes and a boolean.
     * @property {KeyFrame} lower The lower bounding keyframe.
     * @property {KeyFrame} upper The upper bounding keyframe.
     * @property {boolean} found Flag depicting whether extact keyframe at given time found or not
     * - if `true` exact keyframe returned as lower.
     * - if `false` returns lower and upper bound.
     */
    /**
     * @param {number} time Absolute time to find upperBound & lowerBounding keyframe.
     * @returns {boundingKeyframes} The bounding keyframes.
     */
    #findBoundingKeyframes(time){
        const { index, found } = this.#binarySearch(time, true);
        return {
            lower : this.#keyframes[found ? index : index - 1],
            upper : this.#keyframes[found ? index + 1 : index],
            found 
        }
    }

    //getter
    /**
     * Returns the current mode the Timeline is operating in.
     * 
     * @see{@link Timeline.Mode Modes}
     */
    get mode(){
        return this.#mode;
    }
    /**
     * Returns whether the Timeline is currently playing in reverse.
     *
     * @returns {boolean} `true` if the Timeline is reversed; otherwise `false`.
     */
    get reversed(){ return this.#reversed; }
    /**
     * Returns the current {@link KeyFrame} of the Timeline.
     *
     * @returns {KeyFrame} The current KeyFrame.
     */
    get currentKeyFrame(){
        return this.#currKf ?? (this.#reversed ? this.#keyframes.at(-1) : this.#keyframes[0]);
    }
    /**
     * Returns the index of the current {@link KeyFrame} of the Timeline.
     * - if the Timeline has stopped at an exact KeyFrame, will return that.
     * - if the Timeline is currently in the middle of transitioning between two keyframes, will return the `Lower Bound.`
     * 
     * @returns {number} Index of the current KeyFrame.  
     */
    get currentIndex(){
        if (this.#currKf === undefined){
            return (this.#reversed ? this.#keyframes.length - 1 : 0);
        }
        const currTimestamp = this.#currKf.time;
        const { lower } = this.#findBoundingKeyframes(currTimestamp);
        
        return this.#binarySearch(lower.time);
    }
    /**
     * Returns whether the Timeline is currently locked or not.
     * 
     * @returns {boolean} `true` if the Timeline is locked; else `false`.
     */
    get locked(){
        return this.#locked;
    }
    /**
     * Returns the total duration of the Timeline, in **ms**.
     *  
     * @returns {number} The total duration of the Timeline.
     */
    get duration(){
        if (this.#compiled || this.#mode === Timeline.Mode.ABSOLUTE)
            return this.#keyframes.at(-1).time;
        let duration = 0;
        this.#keyframes.forEach(kf => duration += kf.time);

        return duration;
    }
    
    //class functions
    /**
     * Returns the {@link KeyFrame} stored at the specified index.
     *
     * @param {number} index The index of the KeyFrame to retrieve.
     * @param {boolean} [copy] Whether to return a copy of the KeyFrame.
     * @returns {KeyFrame} A reference to the stored KeyFrame if `copy` is `false`; otherwise, a copy.
     */
    retrieveKf(index, copy = false){
        return copy ? new KeyFrame({copy : this.#retrieveKf(index)}) : this.#retrieveKf(index);
    }
    /**
     * Changes the {@link Interpolation} type to be used with the next inserted KeyFrame.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * @param {Object} options The options to configure the interpolator with.
     * @param {Interpolator} options.interpolator An Existing interpolator to copy.
     * Ignores all other params if provided.
     * @param {string} options.interpType The interpolator type stored by the {@link Interpolator} class
     * @param {*} [options.params = {}] The parameters to pass to the interpolator generator.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    transform({interpolator, interpType, params = {}} = {}){
        this.#assertBuilderFunc();
        this.#transition.interpolator = {interpType : interpType, params : params};

        return this;
    }
    /**
     * Changes the {@link Transition.mutator mutator} used to transition from one state to another.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * @param {function(*, *, number) : *} mutator Describes how to transform between two states based on interpolation value.
     * - of the type `(startState, endState, t) => state`.
     * - `t` ranges between `[0, 1]`.
     * - returns `startState` when `t = 0`.
     * - returns `endState` when `t = 1`.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    mutate(mutator){
        this.#assertBuilderFunc();
        this.#transition.mutator = mutator;

        return this;
    }
    /**
     * **`ABSOLUTE` mode only.**
     * 
     * Inserts a {@link KeyFrame} at the specified `timestamp`.
     * - The created {@link KeyFrame} stores a copy of the current builder {@link Transition}, 
     * which is used when transitioning to the next {@link KeyFrame}.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** Will throw if used in `RELATIVE` mode. Please ensure it is only used in `ABSOLUTE` mode.
     * 
     * @param {number} timestamp The absolute timestamp for the corresponding state, in **ms**. 
     * Must be a finite, non-negative number.
     * @param {*} state The state to store in the created {@link KeyFrame}.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    at(timestamp, state){
        this.#assertBuilderFunc();
        this.#assertMode(Timeline.Mode.ABSOLUTE);
        this.#addWait(timestamp);
        const { index, kf } = this.#insertAt(timestamp, state);
        this.#moveCursor(kf, index);

        this.#compiled = false;
        return this;
    }
    /**
     * Inserts a {@link KeyFrame} storing the provided state at the beginning of the Timeline.
     * It is a **mode-neutral** method and can be called in either mode.
     * - Inserts the KeyFrame at `t = 0` if operating in `ABSOLUTE` mode.
     * - Creates the first KeyFrame in the Timeline.
     * - The created {@link KeyFrame} stores a copy of the current builder {@link Transition}, 
     * which is used when transitioning to the next {@link KeyFrame}.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** This method may only be called once, regardless of the current mode.
     * 
     * @param {*} state The state to store at the beginning of the Timeline.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    from(state){
        this.#assertBuilderFunc();
        if (this.#wait !== 0) 
            throw new Error("Cannot use from() while having a pending Hold.");
        if (this.#mode === Timeline.Mode.ABSOLUTE){
            if (this.#keyframes.length !== 0)
                throw new Error("From can only be called once.");
            const { index, kf } = this.#insertAt(0, state);
            this.#moveCursor(kf, index);
        }
        else{
            if (this.#keyframes.length !== 0)
                throw new Error("From can only be called when no KeyFrames have been created.");
            const kf = new KeyFrame({state : state, transition : this.#transition, absTime : 0});
            kf.transition.delay += this.#wait;
            this.#wait = 0;
            this.#keyframes.push(kf);
            this.#moveCursor(kf, 0)
        }

        this.#compiled = false;
        return this;
    }
    /**
     * **`RELATIVE` mode only.**
     * 
     * Inserts a {@link KeyFrame} storing the provided state after a selected KeyFrame (The KeyFrame entry by default).
     * - Use {@link seekCursor()} to insert after a specific {@link KeyFrame}. It is important to note that doing so
     * will shift all subsequent KeyFrames forward.
     * - The created {@link KeyFrame} stores a copy of the current builder {@link Transition}, 
     * which is used when transitioning to the next {@link KeyFrame}.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** Will throw if used in `ABSOLUTE` mode. Please ensure it is only used in `RELATIVE` mode.
     * 
     * @param {*} state The state to store in the created {@link KeyFrame}.
     * @param {number} duration The duration of the KeyFrame, in **ms**. Must be a positive, finite value.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    to(state, duration){
        this.#assertBuilderFunc();
        if(this.#keyframes.length === 0)
            throw new Error("Timeline must contain keyframes to utilize relative construction.");
        if(!this.#validateTime(duration, false))
            throw new Error("Duration must be a positive finite value.");
        this.#assertMode(Timeline.Mode.RELATIVE);
        const cursor = this.#prevKf ?? {
            index: this.#keyframes.length - 1,
            kf: this.#keyframes.at(-1)
        };
        cursor.kf.time = duration + this.#wait;
        cursor.kf.transition.delay += this.#wait;
        const kf = new KeyFrame({ state : state, transition : this.#transition, absTime : 0});
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
    /**
     * Adds a hold or wait period after a selected KeyFrame. (The latest KeyFrame entry by default).
     * It is a **mode-neutral** method and can be called in either mode.
     * - Use {@link seekCursor()} to insert after a specific {@link KeyFrame}.
     * - Can be chained.
     *  
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** 
     * - Will throw if mode has not been set. Please ensure Timeline mode is set before using this method.
     * - Accumlates previous unconsidered hold value and logs a warning.
     * 
     * @param {number} duration The duration of the wait period, in **ms**. Must be a positive, finite value.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    wait(duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration)) 
            throw new Error("Duration must be a non negative finite value.");
        if (this.#mode === undefined)
            throw new Error("Mode must be specified before using wait.");
        if(this.#wait !== 0) console.warn("Accumulating previous unconsidered hold value");
        this.#wait += duration;

        return this;
    }
    /**
     * Resets all pending wait time to `0`.
     * It is a **mode-neutral** method and can be called in either mode.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * @see {@link wait()}
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    flushWait(){
        this.#assertBuilderFunc();
        this.#wait = 0;

        return this;
    }
    /**
     * Resets the Timeline cursor to the most recently inserted {@link KeyFrame}.
     * It is a **mode-neutral** method and can be called in either mode.
     * - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    resetCursor(){
        this.#assertBuilderFunc();
        this.#prevKf = undefined;

        return this;
    }
    /**
     * Moves the Timeline cursor to the {@link KeyFrame} at the specified `index`.
     * It is a **mode-neutral** method and can be called in either mode.
     *  - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** Ensure index is within range.
     * 
     * @param {number} index The index of the {@link KeyFrame} to move the cursor to.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    seekCursor(index){
        this.#assertBuilderFunc();
        const kf = this.#retrieveKf(index);
        this.#moveCursor(kf, index);

        return this;
    }
    /**
     * Inserts a {@link KeyFrame} storing the provided state after the KeyFrame specified by `index`.
     * It is a **mode-neutral** method and can be called in either mode.
     *  - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** In `ABSOLUTE` mode, throws if the resulting timestamp would violate the 
     * chronological ordering of the Timeline.
     * 
     * @param {number} index The index of the {@link KeyFrame} to insert after.
     * @param {*} state The state to store in the created {@link KeyFrame}.
     * @param {number} duration The duration of the inserted KeyFrame, in **ms**. Must be a positive, finite value.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    after(index, state, duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration, false)) 
            throw new Error("Duration must be a positive finite value.");
        const prevkf = this.#retrieveKf(index);

        if (this.#mode === Timeline.Mode.ABSOLUTE){
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
    /**
     * Inserts a {@link KeyFrame} storing the provided state before the KeyFrame specified by `index`.
     * It is a **mode-neutral** method and can be called in either mode.
     *  - Can be chained.
     * 
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     * 
     * **Warning:** In `ABSOLUTE` mode, throws if the resulting timestamp would be negative
     *  or violate the chronological ordering of the Timeline.
     * 
     * @param {number} index The index of the {@link KeyFrame} to insert before.
     * @param {*} state The state to store in the created {@link KeyFrame}.
     * @param {number} duration The duration of the inserted {@link KeyFrame}, in **ms**. Must be a positive, finite value.
     * @returns {Timeline} This Timeline, allowing method chaining.
     */
    before(index, state, duration){
        this.#assertBuilderFunc();
        if (!this.#validateTime(duration, false)) 
            throw new Error("Duration must be a positive finite value.");
        const nextkf = this.#retrieveKf(index);

        if (this.#mode === Timeline.Mode.ABSOLUTE){
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
    /**
     * Compiles the Timeline, optimizing and preparing it to be {@link play() played}.
     * - In `RELATIVE` mode, converts all relative timings into their absolute equivalents.
     * - Optimizes duplicate {@link KeyFrame KeyFrames} whenever a `sameState` comparison
     * function has been provided.
     * - Locks the Timeline after compilation. Call {@link unlock()} before making any
     * further modifications.
     * - Calling this method on an already compiled Timeline has no effect.
     *
     * **Warning:** If no `sameState` comparison function was provided, duplicate
     * {@link KeyFrame KeyFrames} cannot be eliminated and a warning will be emitted.
     */
    compile(){
        if (this.#compiled) return;
        if (this.#sameState === undefined)
            console.warn("Cannot resolve duplicate KeyFrame transitions due to missing equating function.\nPlease consider providing one for eliminating redudancy.");
        if (this.#mode === Timeline.Mode.ABSOLUTE){
            this.#compileAbsolute();
        }
        else if (this.#mode === Timeline.Mode.RELATIVE){
            this.#transformRelative();
            this.#compileAbsolute();
        }

        this.#prevKf = undefined;
        this.#compiled = true;
        this.#locked = true;
    }
    /**
     * Unlocks the Timeline, allowing it to be modified again.
     * - Optionally converts the Timeline to the specified mode while unlocking.
     * - Calling this method on an already unlocked Timeline has no effect.
     *
     * @param {typeof Timeline.Mode} [mode] The mode to convert the Timeline to before
     * unlocking. If omitted, the current mode is preserved.
     *
     * @throws {Error} If `mode` is provided but is not a valid {@link Timeline.Mode}.
     */ 
    unlock(mode = undefined){
        if(!this.#locked) return;
        if(mode === undefined){
            this.#locked = false;
            return;
        }
        if(!(mode === Timeline.Mode.ABSOLUTE || mode === Timeline.Mode.RELATIVE))
            throw new Error("Input mode must be one of Timelines Modes.");
        if (mode !== this.#mode){
            if(this.#mode === Timeline.Mode.ABSOLUTE)
                this.#transformRelative();
            else 
                this.#transformAbsolute();
                
                
        }
        this.#locked = false;
    }
    /**
     * Returns a copy of the Timeline's {@link KeyFrame KeyFrames}.
     * - The returned {@link KeyFrame KeyFrames} are deep copies and may be modified
     * independently of the Timeline.
     * - Optionally converts the returned KeyFrames to the specified mode without
     * modifying the Timeline itself.
     *
     * @param {typeof Timeline.Mode} [mode=this.mode] The mode in which to return the
     * {@link KeyFrame KeyFrames}. If omitted, the Timeline's current mode is used.
     * @returns {KeyFrame[]} A copy of the Timeline's {@link KeyFrame KeyFrames}.
     *
     * @throws {Error} If `mode` is not a valid {@link Timeline.Mode}.
    */
    inspectKeyFrames(mode = this.#mode){
        if(!(mode === Timeline.Mode.ABSOLUTE || mode === Timeline.Mode.RELATIVE))
            throw new Error("Please give a timeline mode to inspect");
        if(mode !== this.#mode){
            return (mode === Timeline.Mode.RELATIVE) ?
                this.#transformAbsolute(true) :
                this.#transformRelative(true, true);
        }
        const copy = []
        this.#keyframes.forEach(kf => copy.push(new KeyFrame({copy : kf})));
        return copy;
    }
    /**
     * Removes and returns the {@link KeyFrame} at the specified index.
     *
     * @param {number} index The index of the {@link KeyFrame} to remove.
     * @returns {KeyFrame} The removed {@link KeyFrame}.
     *
     * @throws {Error} If `index` is not a valid KeyFrame index.
    */
    remove(index){
        if (index < 0 || index >= this.#keyframes.length)
            throw new Error("Please enter a valid index.");
        return this.#keyframes.splice(index, 1)[0];
    }
    /**
     * Returns the KeyFrame corresponding to the provided timestamp.
     *
     * @param {number} time The time to retrieve the KeyFrame at, in **ms**. Must be in the range
     * `[0, Timeline duration]`.
     * @returns {KeyFrame|undefined} A KeyFrame representing the state at the specified `time`.
    */
    keyframeAt(time){
        if (!this.#compiled){
            console.warn("Please compile Timeline before trying to retrieve specific keyframes.");
            return undefined;
        }
        const endTime = this.#keyframes.at(-1).time;
        if (time > endTime || time < 0){
            console.warn(`Provided time is out of range. Valid range: 0, ${endTime}`);
            return lower;
        }
        
        const { lower, upper, found }  = this.#findBoundingKeyframes(time);

        if(found)
            return new KeyFrame({copy : lower});
        else{
            const duration = (upper.time - lower.time);
            /**@type {Transition}*/
            const transition = lower.transition;
            transition.duration = duration;
            const newState = transition.transform(lower.state, upper.state, time - lower.time);

            return new KeyFrame({state: newState, absTime: time, transition: transition});
        }
    }
    /**
     * Clears the stored {@link KeyFrame KeyFrames} in the Timeline and resets all relevant variables.
     * 
     * @param {boolean} [override = false] Override the throw and forcefully clear the timeline, pauses the
     * TimeLine.
     *
     * **Note:** This is a **builder** function, and will throw if used on a {@link compile compiled and locked}
     * Timeline.
     */
    clearTimeline(override = false, mode = undefined){
        if (!override)
            this.#assertBuilderFunc();
        else
            this._playableState = Playable.state.PAUSED;
        this.#keyframes.length = 0;
        if (mode === Timeline.Mode.ABSOLUTE || mode === Timeline.Mode.RELATIVE)
            this.#mode = mode;
        this.#prevKf = undefined;
        this.#currKf = undefined;
        this.#elapsedTime = 0;
        this.#wait = 0;
        this.#compiled = false;
        this.#locked = false;
    }
    
    //Playable Functions
    /**
     * Pauses the Timeline.
     * 
     * **Warning:** If the Timeline has finished, this method has no effect and logs a warning.
     */
    pause(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PAUSED;
        else console.warn("Timeline has finished.");
    }
    /**
     * Resumes the Timeline.
     * 
     * **Warning:** If the Timeline has finished, this method has no effect and logs a warning.
     */
    resume(){
        if (this._playableState !== Playable.state.FINISHED)
            this._playableState = Playable.state.PLAYING;
        else console.warn("Timeline has finished.");
    }
   /**
     * Plays the Timeline in reverse.
     * 
     * **Note:** If the Timeline is already reversed, this method has no effect.
     * 
     * @see {@link Timeline.reversed} to check whether the Timeline is currently reversed or not.
     * @param {boolean} [pause=true] Whether to pause the Timeline after changing direction. If `false` resumes immediately.
     */
    reverse(pause = true){
        if (this.#reversed) return;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = true;
    }
    /**
     * Plays the Timeline forward.
     * 
     * **Note:** if the Timeline is not reversed, this method has no effect.
     * 
     * @see {@link Timeline.reversed} to check whether the Timeline is currently reversed or not.
     * @param {boolean} pause Whether to pause Timeline after changing direction. If `false` resumes immediately.
     */
    forward(pause = true){
        if (!this.#reversed) return;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#reversed = false;
    }
    /**
     * Resets the Timeline to an initial state.
     * - If the Timeline is playing forward, initial state is the first {@link KeyFrame}.
     * - If the Timeline is reversed, initial state is the last {@link KeyFrame}.
     * 
     * **Note:** This invalidates the cached current keyframe.
     * 
     * @see {@link Timeline.reversed} to determing whether the Timeline is currently reversed.
     * @param {boolean} pause Whether to pause Timeline after resetting. If `false`, resumes immediately.
     */
    reset(pause = false){
        this.#elapsedTime = this.#reversed ? this.duration : 0;
        this._playableState = pause ? Playable.state.PAUSED : Playable.state.PLAYING;
        this.#currKf= undefined;
    }
    /**
     * Manually sets the Timelines elapsed time to provided time
     * 
     * **Note:** clamps `elapsed` to Timeline bounds `[0, Timeline duration]` and invalidates cached
     * current KeyFrame.
     * 
     * @param {number} elapsed The new elapsed time, in **ms**.
    */
    seek(elapsed){
        elapsed = Math.max(Math.min(elapsed, this.#keyframes.at(-1).time), 0)
        this.#elapsedTime = elapsed;
        this.#currKf = undefined;
    }
    /**
     * Advances the Timeline by the specified time. Does nothing if Timeline is paused/finished.
     * - If the Timeline is playing **forward**, the elapsed time is increased by `deltaT`.
     * - If the Timeline is **reversed**, the elapsed time is decreased by `deltaT`.
     * - Updates state by invoking the `onUpdate(newKeyFrame)` function, if provided.
     * - Invokes `onTransition(prevKeyFrame, nextKeyFrame)` when switching {@link KeyFrame keyframes}, if provided.
     * - Invokes `onFinish(endKeyFrame)` function upon completion (if provided), and sets playable state to `FINISHED`.
     * 
     * **Note:** All values are clamped to Timeline bounds.
     * 
     * **Warning:** Expects Timeline to be compiled, will compile the timeline if its not yet compiled.
     * 
     * @see {@link compile()} to get more information on compilation details.
     * @see {@link reverse()} to determine whether the Timeline is currently reversed.
     * @param {number} deltaT Time passed since the last call to `play()` in **ms**.
     */
    play(dt){
        if (!this.#compiled)
            this.compile();
        if (this.#keyframes.length <= 1) return;
        if (this._playableState === Playable.state.FINISHED || this._playableState === Playable.state.PAUSED) return;

        this.#elapsedTime += this.#reversed ? -dt : dt;
        const endTime = this.#keyframes.at(-1).time;
        if (this.#elapsedTime <= 0){
            this.#elapsedTime = 0;
            this.#currKf = this.#keyframes.at(0);
            this.#onUpdate?.(this.#currKf.state);
            if (this.#reversed){ //reversed has completed.
                this.#onFinish?.(this.#currKf.state);
                this._playableState = Playable.state.FINISHED;
            }
            return;
        }
        if (this.#elapsedTime >= endTime){
            this.#elapsedTime = endTime;
            this.#currKf = this.#keyframes.at(-1);
            this.#onUpdate?.(this.#currKf.state);
            this.#onFrameChange?.(this.#prevKf?.state, this.#currKf?.state);
            if(!this.#reversed){ //forward has finished.
                this.#onFinish?.(this.#currKf.state);
                this._playableState = Playable.state.FINISHED;
            }
            return;
        }

        const {lower, upper, found} = this.#findBoundingKeyframes(this.#elapsedTime);
        if (this.#currKf === lower){
            this.#animation.play(dt);
        }
        else{
            this.#animation.keyFrames = {startFrame : lower, endFrame : upper};
            this.#prevKf = this.#currKf;
            this.#currKf = lower;
            this.#onFrameChange?.(this.#prevKf?.state, this.#currKf?.state);
            this.#animation.play(dt);
        }
    }
}

module.exports = Timeline;
