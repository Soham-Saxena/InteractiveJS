const {Interpolator, Transition, PlayableManager, Playable, Animation} = require("../Animation Framework/Index.js");

class ArrowHead{
	#playableManager;
	#FinalStates = {
		direction : undefined,
		origin : undefined,
		arrowSize : undefined,
		finInc : undefined
	};

	constructor({
		arrowOrigin = {x : 0, y : 0},
		headDirection=0, 
		finAngle=(35) * (Math.PI/180.00), 
		arrowSize=10, precision=2, 
		arrow=undefined, 
		interpolator = Interpolator.func.SMOOTHSTEP,
		interpolatorParams = {}
	} = {}){
		this.#playableManager = new PlayableManager();
		if (arrow === undefined){
            this._origin = {x : arrowOrigin.x, y : arrowOrigin.y};
            this.theta = headDirection;
            this.alpha = finAngle;
            this.distance = arrowSize;
            this.precision = precision;
        }
        else{//copy constructor
            this._origin = {x : arrow._origin.x, y : arrow._origin.y};
            this.theta = arrow.theta;
            this.alpha = arrow.alpha;
            this.distance = arrow.distance;
            this.precision = arrow.precision;
        }
        this.lowerAngle = this.theta + this.alpha - Math.PI;
        this.upperAngle = this.theta - this.alpha + Math.PI;
        this.upperPoint = {x : this._origin.x + this.distance*Math.cos(this.upperAngle),
                        y : this._origin.y + this.distance*Math.sin(this.upperAngle)};
        this.lowerPoint = {x : this._origin.x + this.distance*Math.cos(this.lowerAngle),
                        y : this._origin.y + this.distance*Math.sin(this.lowerAngle)};
		const tempInterpolator = new Interpolator({type : interpolator, params : interpolatorParams});
		let tempTransition = undefined;
		let tempAnimation;

		if (arrow !== undefined) tempTransition = new Transition({transition : arrow.attrAnimation("origin").transition});
		else tempTransition = undefined;
		tempAnimation = this.#createAnimation((p1, p2, t) => {
			return {
				x : p1.x * (1-t) + p2.x * t,
				y : p1.y * (1-t) + p2.y * t
			}}, 
			(state) => { 
				this._origin.x = state.x;
				this._origin.y = state.y;
				this.#updatePoints();
			 },
			() => { this.#FinalStates.origin = undefined; },
			tempInterpolator,
			tempTransition
		);
		this.#playableManager.addPlayable("origin", tempAnimation);

		if (arrow !== undefined) tempTransition = new Transition({transition : arrow.attrAnimation("direction").transition});
		else tempTransition = undefined;
		tempAnimation = this.#createAnimation((angle1, angle2, t) => {
				return angle1 * (1-t) + angle2 * t;
			}, 
			(state) => { 
				this.theta = state;
				this.#updatePoints(); 
			},
			() => { this.#FinalStates.direction = undefined; },
			tempInterpolator,
			tempTransition
		);
		this.#playableManager.addPlayable("direction", tempAnimation);

		if (arrow !== undefined) tempTransition = new Transition({transition : arrow.attrAnimation("size").transition});
		else tempTransition = undefined;
		tempAnimation = this.#createAnimation((d1, d2, t) => {
				return d1 * (1-t) + d2 * t;
			}, 
			(state) => { 
				state = (state < 0) ? 0 : state;
				this.distance = state;

				this.#updatePoints();
			},
			() => { this.#FinalStates.arrowSize = undefined; },
			tempInterpolator,
			tempTransition
		);
		this.#playableManager.addPlayable("size", tempAnimation);

		if (arrow !== undefined) tempTransition = new Transition({transition : arrow.attrAnimation("finAngle").transition});
		else tempTransition = undefined;
		tempAnimation = this.#createAnimation((angle1, angle2, t) => {
			return angle1 * (1-t) + angle2 * t;
			}, 
			(state) => { 
				this.alpha = state;
				this.#updatePoints(); 
			},
			() => { this.#FinalStates.finInc = undefined; },
			tempInterpolator,
			tempTransition
		);
		this.#playableManager.addPlayable("finAngle", tempAnimation);
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
	#createAnimation(mutator, onUpdate, onFinish, interpolator, tempTransition = undefined){
		const transition = tempTransition ?? new Transition({
			interpolator : interpolator,
			mutator : mutator,
			enabled : false
		});
		return new Animation({
			transition : transition,
			onUpdate : onUpdate,
			onFinish : onFinish
		});
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
		if (this.targetDirection.radian === theta) return;
		if (!this.#retrievePlayable("direction").transition.enabled){
			this.theta = theta;
			this.#updatePoints();
		}
		else{
			/** @type Animation */
			const animation = this.#playableManager.playable("direction");
			animation.limits = {
				start : this.theta,
				end : theta
			};
			if (animation.playableState === Playable.state.FINISHED || animation.playableState === Playable.state.PLAYING) animation.reset();
			this.#FinalStates["direction"] = theta;
			this.#playableManager.run();
		}
	}
	set finInclination({angle, radian = false} = {}){
		if (!radian){
			angle = angle * (Math.PI)/180;
		}
		if (angle === this.targetFinInc.radian) return;
		if (!this.#retrievePlayable("finAngle").transition.enabled){
			this.alpha = angle;
			this.#updatePoints();
		}
		else{
			/** @type Animation */
			const animation = this.#playableManager.playable("finAngle");
			animation.limits = {
				start : this.alpha,
				end : angle
			};
			if (animation.playableState === Playable.state.FINISHED || animation.playableState === Playable.state.PLAYING) animation.reset();
			this.#FinalStates["finInc"] = angle;
			this.#playableManager.run();
		}
	}
	set origin(point){
		const pt = this.targetOrigin;
		if (
			point.x === pt.x && point.y === pt.y
		) return;
		if (!this.#retrievePlayable("origin").transition.enabled){
			this._origin.x = point.x;
			this._origin.y = point.y;

			this.#updatePoints();
		}
		else {
			/** @type Animation */
			const animation = this.#playableManager.playable("origin");
			animation.limits = {
				start : { x : this._origin.x, y : this._origin.y },
				end : point
			};
			if (animation.playableState === Playable.state.FINISHED || animation.playableState === Playable.state.PLAYING) animation.reset();
			this.#FinalStates["origin"] = point;
			this.#playableManager.run();
		}
	}
    set arrowSize(size){
		if (size === this.targetArrowSize) return;
		if (!this.#retrievePlayable("size").transition.enabled){
			size = (size < 0) ? 0 : size;
			this.distance = size;

			this.#updatePoints();
		}
		else {
			/** @type Animation*/
			const animation = this.#playableManager.playable("size");
			animation.limits = {
				start : this.arrowSize,
				end : size
			};
			if (animation.playableState === Playable.state.FINISHED || animation.playableState === Playable.state.PLAYING) animation.reset();
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
	}){
		if (configurationList === undefined){
			/** @type Animation */
			const animation = this.#retrievePlayable(name);
			if (animation === undefined) return;

			animation.transition.configure = {
				duration : duration,
				delay : delay,
				interpolator : interpolator,
				interpType : interpType, params : params,
				enabled : enabled
			};
		}
		else{
			for (const configuration of configurationList){
				const {name, interpolator, interpType, params, duration, delay} = configuration;
				const animation = this.#retrievePlayable(name);
				if (animation === undefined) continue;

				animation.transition.configure = {
					duration : duration,
					delay : delay,
					interpolator : interpolator,
					interpType : interpType, params : params,
					enabled : true
				};
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