const { time } = require("node:console");
const {Interpolator, Transition, PlayableManager, Playable, Timeline} = require("../Animation Framework/index.js");
/**
 * @typedef {Object} point2D
 * @property {number} x The x coordinate of the 2D point.
 * @property {number} y The y coordinate of the 2D point.
 */
/** @typedef {import("../Animation Framework/Timeline.js")} Timeline */
class ArrowHead{
	#playableManager;
	#FinalStates = {
		direction : undefined,
		origin : undefined,
		arrowSize : undefined,
		finInc : undefined
	};
	#delays = {
		direction : 0,
		origin : 0,
		arrowSize : 0,
		finInc : 0
	};
	#durations = {
		direction : 0,
		origin : 0,
		arrowSize : 0,
		finInc : 0
	};
	#timelinesPlaying = {
		direction : false,
		origin : false,
		arrowSize : false,
		finInc : false
	};

	/** 
	 * @param {Object} [options] The options to configure created ArrowHead.
	 * @param {point2D} [options.arrowOrigin = {x : 0, y : 0}] 2D point representing the location of the center of the ArrowHead
	 * in the coordinate plane.
	 * @param {number} [options.headDirection = 0] Angle that the ArrowHead is facing with respect to X axis.
	 * Internally stored in radians.
	 * @param {boolean} [options.hRadian = true] if `true`, treats `headDirection` as a radian value; else treats it as
	 * degrees and coverts accordingly.
	 * @param {number} [options.finAngle = (35) * (Math.PI/180)] Angle of the arrow fins with respect to the body of the ArrowHead.
	 * Internally stored in radians.
	 * @param {boolean} [options.fRadian = true] if `true`, treats `finAngle` as a radian value; else treats it as
	 * degrees and converts accordingly.
	 * @param {number} [options.arrowSize = 10] Defines the size of the ArrowHead (distance of the end points from the origin).
	 * @param {number} [options.precision = 2] Determines the precision of the points included in {@link pathScript}
	 * Lesser precision leads to less space taken at the cost of losing information.
	 * @param {string} [options.interpolator = Interpolator.func.SMOOTHSTEP] The Interpolator type from 
	 * {@link Interpolator Interpolator's} built-in catalogue.
	 * @param {Object} [options.interpolatorParams = {}] The parameters to pass to {@link Interpolator Interpolator's} 
	 * function generator.
	 * @param {typeof Timeline.Mode.RELATIVE} [options.timelineMode = Timeline.Mode.RELATIVE] The operating mode of the
	 * interal Timeline class.
	 * @param {ArrowHead} [copy = undefined] Existing ArrowHead to create a copy of. If supplied, ignores all other parameters.
	 */
	constructor({
		arrowOrigin = {x : 0, y : 0},
		headDirection= 0,  hRadian = true,
		finAngle= (35) * (Math.PI/180.00), fRadian = true,
		arrowSize=10, precision=2, 
		interpolator = Interpolator.func.SMOOTHSTEP,
		interpolatorParams = {},
		timelineMode = Timeline.Mode.RELATIVE,
		copy = undefined
	} = {}){
		this.#playableManager = new PlayableManager();
		if (copy === undefined){
            this._origin = {x : arrowOrigin.x, y : arrowOrigin.y};
            this.theta = hRadian ? headDirection : (Math.PI/180) * headDirection;
            this.alpha = fRadian ? finAngle : (Math.PI/180) * finAngle;
            this.distance = arrowSize;
            this.precision = precision;
        }
        else{//copy constructor
            this._origin = {x : copy._origin.x, y : copy._origin.y};
            this.theta = copy.theta;
            this.alpha = copy.alpha;
            this.distance = copy.distance;
            this.precision = copy.precision;
        }
        this.lowerAngle = this.theta + this.alpha - Math.PI;
        this.upperAngle = this.theta - this.alpha + Math.PI;
        this.upperPoint = {x : this._origin.x + this.distance*Math.cos(this.upperAngle),
                        y : this._origin.y + this.distance*Math.sin(this.upperAngle)};
        this.lowerPoint = {x : this._origin.x + this.distance*Math.cos(this.lowerAngle),
                        y : this._origin.y + this.distance*Math.sin(this.lowerAngle)};

		this.#playableManager.addPlayable("origin", new Timeline({
			mode: timelineMode,
			onFinish: () => {
				this.#FinalStates.origin = undefined;
			},
			onFrameChange: (prevPoint, nextPoint) => {
				this.#FinalStates.origin = nextPoint;
			},
			onUpdate: (newPoint) => {
				this._origin.x = newPoint.x;
				this._origin.y = newPoint.y;

				this.#updatePoints();
			},
			sameState: (p1, p2) => {
				return (p1.x === p2.x) && (p1.y === p2.y);
			},
			transition: new Transition({
				interpType: interpolator,
				interpolatorParams: interpolatorParams,
				enabled: true,
				mutator: (p1, p2, t) => {
					return {
						x : p1.x * (1 - t) + p2.x * t,
						y : p1.y * (1 - t) + p2.y * t 
					};
				}
			})
		}))
		this.#playableManager.addPlayable("direction", new Timeline({
			mode: timelineMode,
			onFinish: () => {
				this.#FinalStates.direction = undefined;
			},
			onFrameChange: (prevAngle, nextAngle) => {
				this.#FinalStates.direction = nextAngle;
			},
			onUpdate: (newAngle) => {
				this.theta = newAngle;
				this.#updatePoints();
			},
			sameState: (a1, a2) => {
				return this.#nearlyEqual(a1, a2);
			},
			transition: new Transition({
				interpType: interpolator,
				interpolatorParams: interpolatorParams,
				enabled: true,
				mutator: (a1, a2, t) => {
					return a1 * (1 - t) + a2 * t;
				}
			})
		}))
		this.#playableManager.addPlayable("arrowSize", new Timeline({
			mode: timelineMode,
			onFinish: () => {
				this.#timelinesPlaying.arrowSize = false;
				this.#FinalStates.arrowSize = undefined;
			},
			onFrameChange: (prevSize, nextSize) => {
				this.#FinalStates.arrowSize = nextSize;
			},
			onUpdate: (newSize) => {
				newSize = (newSize < 0) ? 0 : newSize;
				this.distance = newSize;

				this.#updatePoints();
			},
			sameState: (d1, d2) => {
				return (d1 === d2)
			},
			transition: new Transition({
				interpType: interpolator,
				interpolatorParams: interpolatorParams,
				enabled: true,
				mutator: (d1, d2, t) => {
					return d1 * (1 - t) + d2 * t;
				}
			})
		}))
		this.#playableManager.addPlayable("finInc", new Timeline({
			mode: timelineMode,
			onFinish: () => {
				this.#FinalStates.finInc = undefined;
			},
			onFrameChange: (prevAngle, nextAngle) => {
				this.#FinalStates.finInc = nextAngle;
			},
			onUpdate: (newAngle) => {
				this.alpha = newAngle;
				this.#updatePoints();
			},
			sameState: (a1, a2) => {
				return this.#nearlyEqual(a1, a2);
			},
			transition: new Transition({
				interpType: interpolator,
				interpolatorParams: interpolatorParams,
				enabled: true,
				mutator: (a1, a2, t) => {
					return a1 * (1 - t) + a2 * t;
				}
			})
		}))
	}
	//private functions
	#updatePoints(){
		this.lowerAngle = this.theta + this.alpha - Math.PI;
		this.upperAngle = this.theta - this.alpha + Math.PI;
		this.upperPoint = {x : this._origin.x + this.distance*Math.cos(this.upperAngle),
						   y : this._origin.y + this.distance*Math.sin(this.upperAngle)};
		this.lowerPoint = {x : this._origin.x + this.distance*Math.cos(this.lowerAngle),
						   y : this._origin.y + this.distance*Math.sin(this.lowerAngle)};
	}
	#retrievePlayable(name){
		return this.#playableManager.playable(name);
	}
	#nearlyEqual(a, b, epsilon = 1e-9) {
    	return Math.abs(a - b) < epsilon;
	}
	#updateTimeline(name, start, stop){
		/** @type Timeline */
		const timeline = this.#playableManager.playable(name);
		if (timeline === undefined)
			return;
		
		timeline.clearTimeline(true, Timeline.Mode.RELATIVE);
			
		timeline.
			from(start).
			wait(this.#delays[name]).
			to(stop, this.#durations[name]);
		if (timeline._playableState === Playable.state.PAUSED) timeline.resume();
		else if (timeline._playableState === Playable.state.FINISHED) timeline.reset();
	}

	//getters
	get directionRadian(){
		return this.theta;
	}
	get directionTheta(){
		return (this.theta * (180.00/Math.PI));
	}
	get targetDirection(){
		const angle = this.#FinalStates.direction ?? this.theta;

		return {degree : angle * (180)/Math.PI, radian : angle};
	}
	get origin(){
		return { x : this._origin.x, y : this._origin.y };
	}
	get targetOrigin(){
		const point = structuredClone(this.#FinalStates.origin) ?? structuredClone(this._origin);

		return point;
	}
	get pathScript(){
		const prec = this.precision;
		let pathScript = 
		`M ${+this._origin.x.toFixed(prec)} ${+this._origin.y.toFixed(prec)}`;
		pathScript += 
		` L ${+this.upperPoint.x.toFixed(prec)} ${+this.upperPoint.y.toFixed(prec)}`;
		pathScript += 
		` M ${+this._origin.x.toFixed(prec)} ${+this._origin.y.toFixed(prec)}`;
		pathScript += 
		` L ${+this.lowerPoint.x.toFixed(prec)} ${+this.lowerPoint.y.toFixed(prec)}`;
		
		return pathScript;
	}
    get arrowSize(){
        return this.distance;
    }
	get targetArrowSize(){
		const size = this.#FinalStates.arrowSize ?? this.distance;

		return size;
	}
	get finIncRadian(){
		return this.alpha;
	}
	get finIncDegree(){
		return this.alpha * (180)/Math.PI;
	}
	get targetFinInc(){
		const angle = this.#FinalStates.finInc ?? this.alpha;
		
		return {degree : angle * (180)/Math.PI, radian : angle};
	}
	
	//setters
	set direction({angle, radian = false, svg = false} = {}){
		let theta = 0;
		if (radian){
			theta = angle;
		}
		else{
			theta = angle * Math.PI/180.00;
		}
		if (!svg) theta = -theta;
		if (this.#nearlyEqual(this.targetDirection.radian, theta)){
			return;
		}
		if (this.#retrievePlayable("direction").playableState === Playable.state.PAUSED){
			this.theta = theta;
			this.#updatePoints();
		}
		else{
			this.#updateTimeline("direction", this.theta, theta);

			this.#timelinesPlaying["direction"] = true;
			this.#FinalStates["direction"] = theta;
			this.#playableManager.run();
		}
	}
	set finInclination({angle, radian = false} = {}){
		if (!radian){
			angle = angle * (Math.PI)/180;
		}
		if (this.#nearlyEqual(angle, this.targetFinInc.radian)) {
			return;
		}
		console.log(this.targetFinInc.radian, angle);
		if (this.#retrievePlayable("finInc").playableState === Playable.state.PAUSED){
			this.alpha = angle;
			this.#updatePoints();
		}
		else{
			this.#updateTimeline("finInc", this.alpha, angle);

			this.#timelinesPlaying["finInc"] = true;
			this.#FinalStates["finInc"] = angle;
			this.#playableManager.run();
		}
	}
	set origin(point){
		const pt = this.targetOrigin;
		if (
			point.x === pt.x && point.y === pt.y
		) return;
		if (this.#retrievePlayable("origin").playableState === Playable.state.PAUSED){
			this._origin.x = point.x;
			this._origin.y = point.y;

			this.#updatePoints();
		}
		else {
			this.#updateTimeline("origin", this._origin, point);

			this.#timelinesPlaying["origin"] = true;
			this.#FinalStates["origin"] = point;
			this.#playableManager.run();
		}
	}
    set arrowSize(size){
		if (size === this.targetArrowSize) return;
		if (this.#retrievePlayable("arrowSize").playableState === Playable.state.PAUSED){
			size = (size < 0) ? 0 : size;
			this.distance = size;

			this.#updatePoints();
		}
		else {
			this.#updateTimeline("arrowSize", this.distance, size);

			this.#timelinesPlaying["arrowSize"] = true;
			this.#FinalStates["arrowSize"] = size;
			this.#playableManager.run();
		}
    }

	//class functions
	transform({
		configurationList,
		name,
		interpolator,
		interpType, params = {},
		duration,
		delay,
		enabled = true
	} = {}){
		console.log(name);

		if (configurationList === undefined){
			/** @type Timeline */
			const timeline = this.#retrievePlayable(name);
			if (timeline === undefined) return;
			if (timeline.locked) timeline.unlock();

			timeline.transform({interpolator: interpolator, interpType: interpType, params: params});
			this.#delays[name] = delay ?? this.#delays[name];
			this.#durations[name] = duration ?? this.#durations[name];
			console.log({
				state: timeline.playableState,
				PAUSED: Playable.state.PAUSED,
				enabled
			});

			if (timeline.playableState === Playable.state.PLAYING && !enabled){
				this.#playableManager.pause(name);
				return;
			}
			else if (timeline.playableState === Playable.state.PAUSED && enabled){
				this.#playableManager.resume(name);
			}

		}
		else{
			for (const configuration of configurationList){
				const {name, interpolator, interpType, params, duration, delay, enabled} = configuration;
				const timeline = this.#retrievePlayable(name);
				if (timeline === undefined) continue;

				timeline.transform({interpolator: interpolator, interpType: interpType, params: params});
				this.#delays[name] = delay ?? this.#delays[name];
				this.#durations[name] = duration ?? this.#durations[name];

				if (timeline.playableState === Playable.state.PLAYING && !enabled){
					timeline.pause();
					continue;
				}
				else if (timeline.playableState === Playable.state.PAUSED && enabled)
					timeline.resume();
			}
		}
	}
	attrAnimation(attributeName){ //can be used for testing, bypasses setters
		return this.#playableManager.playable(attributeName);
	}
	attrAnimations(attributeNames){ //can be used for testing, bypasses setters
		const animations = [];
		for (const name of attributeNames){
			const retrievedAnimation = this.attrAnimation(name);
			if (retrievedAnimation !== undefined) animations.push(retrievedAnimation);
		}

		return animations;
	}
}

module.exports = ArrowHead;