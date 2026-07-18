const { Arrow, ArrowHead, Line } = require("../Geometry/Index.js");
const { loadGlMatrix} = require("../lib/glMatrix.js");
const Interpolator = require("../Animation Framework/Interpolator.js");
const { vec2, mat2d} = loadGlMatrix();

class Grapher{
	#svgNSPath = "http://www.w3.org/2000/svg";
	#typewriterInstance = [null];
	#cursorStandin = document.createElementNS(this.#svgNSPath, "circle");
	#cursorStyle = "fill : #86d48e; stroke : #a1ffaa; stroke-width : 1";
	#cursorStandinActive = false;
	#svgToCoordinates = mat2d.create();
	#motionVars;
	#tAcceleration = 180; //units per seconds^2w
	#tDecceleration = -300;
	#maxTvelocity = 300; //units per second
	#tFactor = {
		x : 0,
		y : 0
	};
	#sFactor = {
		x : 1,
		y : -1
	};
	#gridVelocity = {
		x : 0,
		y : 0
	}; //coordinate pts/secs 
	#prevAxis = false; //true -> x axis, false -> y axis
	constructor({aspectRatio = {height : 300, width : 300}, 
				 border = true,
				 labelBorder = true,
				 borderStyle ="fill: rgba(0, 0, 0, 0.567); stroke: #240402;",
				 axisStyle ="stroke : var(--interactive-accent); stroke-width: 1.8;stroke-linecap: round; opacity : 0.75;",
				 padding = 5,
				 gridSeparation = 25,
				 gridStyle = "stroke : #d1cd7d; stroke-width: 1;stroke-linecap: square; opacity : 0.13",
				 labelStyling = {
					 circleStyle : "fill : var(--interactive-accent); stroke : #a1ffaa; stroke-width: 0.8",
					 textStyle : "fill : #d1cd7d; dominant-baseline : hanging; text-anchor : middle; fontFamily : monospace; font-size : 11px",
					 textBackground : "fill : #15110e; stroke: #240402;"
				 },
				 labelOffset = 10,
				 labelPadding = 6,
				 axisTolerance = 9,
				 radius = 3} = {})
	{
		const svgCursor = ` 
			<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"> 
				<circle cx="16" cy="16" r="4" fill="#86d48e" stroke="#a1ffaa" stroke-width="1"/> 
			</svg> `;
		this._customCursor = `data:image/svg+xml,${encodeURIComponent(svgCursor)}`;
		this.#cursorStandin.setAttribute("style", this.#cursorStyle); 
		this._gridStyle = gridStyle;
		
		this._graph = document.createElementNS(this.#svgNSPath, "g");
		this._graph.style.cursor = `url('${this._customCursor}') 16 16, auto`;
		const {height, width} = aspectRatio;
		this.aspectRatio = {height : height, width : width};
		this._localOffset = {x : 3, y : 3};
		this.padding = padding;
		this.boundingBox = document.createElementNS(this.#svgNSPath, "rect");
		if(border) borderStyle += " stroke-width: 2.5;";
		else borderStyle += " stroke-width: 0;";
		this.boundingBox.setAttribute("style", borderStyle);
		this.boundingBox.setAttribute("x", this._localOffset.x);
		this.boundingBox.setAttribute("y", this._localOffset.y);
		this.boundingBox.setAttribute("height", height);
		this.boundingBox.setAttribute("width", width);
		this.boundingBox.setAttribute("tabindex", "0");
		this._center = {x : (this._localOffset.x + width)/2,
					    y : (this._localOffset.y + height)/2};
		mat2d.set(
			this.#svgToCoordinates,
			this.#sFactor.x, 0,
			0, this.#sFactor.y,
			-this._center.x + this.#tFactor.x,
			this._center.y - this.#tFactor.y
		)
		this.pstvXAxis = new Arrow({startPoint : {x : this._center.x,
												  y : this._center.y},
									theta : 0,
									distance : (width/2) - this.padding});
		this.ngtvXAxis = new Arrow({startPoint : {x : this._center.x,
												  y : this._center.y},
									theta : 180,
									distance : (width/2) - this.padding});
		this.pstvYAxis = new Arrow({startPoint : {x : this._center.x,
												  y : this._center.y},
									theta : -90,
									distance : (height/2) - this.padding});
		this.ngtvYAxis = new Arrow({startPoint : {x : this._center.x,
												  y : this._center.y},
									theta : 90,
									distance : (height/2) - this.padding});
		this._axis = document.createElementNS(this.#svgNSPath, "path");
		const angleDuration = 1000;
		const interpType = Interpolator.func.EASE_OUT_EXPO;
		this.ngtvXAxis.arrowHead.transform({
			name : "finAngle",
			duration : angleDuration,
			interpType : interpType
		});
		this.pstvXAxis.arrowHead.transform({
			name : "finAngle",
			duration : angleDuration,
			interpType : interpType
		});
		this.pstvYAxis.arrowHead.transform({
			name : "finAngle",
			duration : angleDuration,
			interpType : interpType
		});
		this.ngtvYAxis.arrowHead.transform({
			name : "finAngle",
			duration : angleDuration,
			interpType : interpType
		});

		let axisPath = "";
		axisPath += this.pstvXAxis.pathScript;
		axisPath += " " + this.ngtvXAxis.pathScript;
		axisPath += " " + this.pstvYAxis.pathScript;
		axisPath += " " + this.ngtvYAxis.pathScript;
		this._axis.setAttribute("d", axisPath);
		this._axis.setAttribute("style", axisStyle);
		this._graph.appendChild(this._axis);
		
		this._gridSeparation = gridSeparation;
		this.updateGridPoints();
		
		this._grid = document.createElementNS(this.#svgNSPath, "path");
		
		this.updateGrid();
		
		this._pointLabel = {};
		this._pointLabel.text = document.createElementNS(this.#svgNSPath, "text");
		this._pointLabel.text.setAttribute("style", labelStyling.textStyle);
		this._pointLabel.text.setAttribute("pointer-events", "none");
		this._pointLabel.storedText = "";
		this._pointLabel.point = document.createElementNS(this.#svgNSPath, "circle");
		this._pointLabel.point.setAttribute("style", labelStyling.circleStyle);
		this._pointLabel.point.style.transition = "r 0.3s ease, cx 0.1s ease, cy 0.1s ease";
		this._pointLabel.background = document.createElementNS(this.#svgNSPath, "rect");
		if (labelBorder === true) labelStyling.textBackground += "stroke-width: 1";
		this._pointLabel.background.setAttribute("style", labelStyling.textBackground);
		this._pointLabel.background.style.transition = "width 0.4s ease";
		this._pointLabel.background.setAttribute("rx", 6);
		this._pointLabel.background.setAttribute("pointer-events", "none");
		
		this._labelOffset = labelOffset;
		this._labelPadding = labelPadding;
		this._pointRadius = radius;
		this._axisTolerance = axisTolerance;
		
		this.boundingBox.addEventListener("mousemove", (event) => {
			const point = new DOMPoint(event.clientX, event.clientY);
			const ctm = this.boundingBox.getScreenCTM();
			let svgPoint = point.matrixTransform(ctm.inverse());
			let activePoint = undefined; //going to in coordinate space
			const dLabelOffset = {};
			
			const coordinatePoint = this.#sTOc({point2d : svgPoint});
			console.log(coordinatePoint);
			let xAxisActive = Math.abs(coordinatePoint.y) < this._axisTolerance;
			let yAxisActive = Math.abs(coordinatePoint.x) < this._axisTolerance;
			const activeTest = (point, labelOffset, horizontal=true) => {
				//horizontal -> y-axis
				const inpPoint = {
					c : point,
					s : this.#cTOs({point1d : point}, !horizontal)
				};
				const extremePoint = horizontal ? this._horizontalGridLines[0] :
												  this._verticalGridLines[0];
				const distance = Math.abs(extremePoint - point);
				const snapIndex = Math.round(distance/this._gridSeparation);
				const snapPoint = {c : 0, s : 0};
				snapPoint.c = horizontal ? this._horizontalGridLines[snapIndex] :
											   this._verticalGridLines[snapIndex];
				snapPoint.s = this.#cTOs({point1d : snapPoint.c}, !horizontal);
				let activePoint = undefined;
				if (snapPoint.s > (horizontal ? this._localOffset.x : this._localOffset.y) + this.padding
					&& 
					(Math.abs(snapPoint.s - inpPoint.s) < this._axisTolerance)){
					if (horizontal){
						activePoint = {
							coordinatePoint: {
								x : 0,
								y : snapPoint.c
							}
						};
						activePoint.svgPoint = this.#cTOs({point2d : 
														   activePoint.coordinatePoint});
					}
					else{
						activePoint = {
							coordinatePoint : {
								x : snapPoint.c,
								y : 0}
						};
						activePoint.svgPoint = this.#cTOs({point2d : 
														   activePoint.coordinatePoint});
					}
				}
				if (activePoint !== undefined){
					if (horizontal){
						if (this.#prevAxis){
							this._pointLabel.point.style.transition = "r 0.3s ease";
						}
						else this._pointLabel.point.style.transition = "r 0.3s ease, cx 0.1s ease, cy 0.1s ease";
						this.#prevAxis = false;
						dLabelOffset.x = this._labelOffset;
						dLabelOffset.y = 0;
					}
					else{
						if (!this.#prevAxis){
							this._pointLabel.point.style.transition = "r 0.3s ease";
						}
						else this._pointLabel.point.style.transition = "r 0.3s ease, cx 0.1s ease, cy 0.1s ease";
						this.#prevAxis = true
						dLabelOffset.x = 0;
						dLabelOffset.y = this._labelOffset;
					}
				}
				
				return activePoint;
			};
			if (xAxisActive){
				activePoint = activeTest(coordinatePoint.x, dLabelOffset, false);
			}
			else if (yAxisActive){
				activePoint = activeTest(coordinatePoint.y, dLabelOffset);
			}
			
			if (activePoint !== undefined){
				this._graph.style.cursor = "none";
				
				if (!this.#cursorStandinActive){
					this.#cursorStandin.style.transition = "none"; 
					
					this.#cursorStandin.setAttribute("cx", svgPoint.x); 
					this.#cursorStandin.setAttribute("cy", svgPoint.y);
					this.#cursorStandin.setAttribute("r", 4);
					
					this.#cursorStandin.getBoundingClientRect(); 
					this.#cursorStandin.style.transition = 
						"cx 0.2s ease, cy 0.2s ease, r 0.2s ease"; 
					this.#cursorStandinActive = true;
				}
				this.#cursorStandin.setAttribute("cx", activePoint.svgPoint.x);
				this.#cursorStandin.setAttribute("cy", activePoint.svgPoint.y);
				this.#cursorStandin.setAttribute("r", this._pointRadius);
				
				const labelText = this._pointLabel.text;
				const cPoint = activePoint.coordinatePoint;
				const newText = `(${cPoint.x},${cPoint.y})`;
				if (newText !== this._pointLabel.storedText){
					const sPoint = activePoint.svgPoint;
					this._pointLabel.storedText = newText;
					labelText.setAttribute("x", sPoint.x + dLabelOffset.x);
					labelText.setAttribute("y", sPoint.y + dLabelOffset.y);
					labelText.textContent = newText;
					const textBox = labelText.getBBox();
					if (dLabelOffset.x !== 0){
						labelText.setAttribute(
							"x", 
							sPoint.x + dLabelOffset.x + textBox.width/2
						);
						textBox.x += textBox.width/2;
					}
					labelText.textContent = "";
					this.#typewriterEffect(labelText, `(${cPoint.x},${cPoint.y})`);
					
					
					const labelBackground = this._pointLabel.background;
					labelBackground.setAttribute("x", textBox.x - this._labelPadding/2);
					labelBackground.setAttribute("y", textBox.y - this._labelPadding/2);
					labelBackground.setAttribute("width", 
											      textBox.width + this._labelPadding);
					labelBackground.setAttribute("height",
											      textBox.height + this._labelPadding);
					
					const labelPoint = this._pointLabel.point;
					labelPoint.setAttribute("cx", sPoint.x);
					labelPoint.setAttribute("cy", sPoint.y);
					labelPoint.setAttribute("r", this._pointRadius);
					
				}
				
			}
			else{
				clearInterval(this.#typewriterInstance[0]);
				this._pointLabel.text.textContent = "";
				this._pointLabel.storedText = "";
				this._pointLabel.background.setAttribute("width", 0);
				this._pointLabel.point.setAttribute("r", 0);
				
				
				if (this.#cursorStandinActive){
					this.#cursorStandin.setAttribute("cx", svgPoint.x); 
					this.#cursorStandin.setAttribute("cy", svgPoint.y);
					this.#cursorStandin.setAttribute("r", 4);
					
					this.#cursorStandinActive = false;
				}
				else{
					this.#cursorStandin.style.transition = "none";
					this.#cursorStandin.getBoundingClientRect();
					this.#cursorStandin.setAttribute("r", 0);
					this._graph.style.cursor = `url('${this._customCursor}') 16 16, auto`;
				}
			}	
		})
		this.keysPressed = new Map();
		this.boundingBox.addEventListener("keydown", (event) => {
			this.keysPressed.set(event.key, null);
		});
		this.boundingBox.addEventListener("keyup", (event) => {
			this.keysPressed.delete(event.key);
		});
		this.#motionVars = {
			decel : {
				x : { timestamp: null, delta: 0},
				y : { timestamp: null, delta: 0}
			},
			accel : {
				posX : { timestamp: null, delta: 0},
				negX : { timestamp: null, delta: 0},
				posY : { timestamp: null, delta: 0},
				negY : { timestamp: null, delta: 0}
			},
			vel : {
				x : {timestamp: null, delta: 0},
				y : {timestamp: null, delta: 0}
			}
		}

		const frameUpdate = (timestamp) => {
			const accel = this.#motionVars.accel
			if (this.keysPressed.has("a")){
				this.#accelGridVel({axis : "x", direction: -1}, timestamp);
			}
			else accel.negX.timestamp=null;
			if (this.keysPressed.has("d")){
				this.#accelGridVel({axis : "x", direction: 1}, timestamp);
			}
			else accel.posX.timestamp=null;
			if (this.keysPressed.has("w")){
				this.#accelGridVel({axis : "y", direction: 1}, timestamp);
			}
			else accel.posY.timestamp=null;
			if (this.keysPressed.has("s")){
				this.#accelGridVel({axis : "y", direction: -1}, timestamp);
			}
			else accel.negY.timestamp=null;
			

			if (!this.keysPressed.has("a") && !this.keysPressed.has("d")){
				this.#decelGridVel("x", timestamp);
			}
			else this.#motionVars.decel.x.timestamp = null;
			if(!this.keysPressed.has("w") && !this.keysPressed.has("s")){
				this.#decelGridVel("y", timestamp);
			}
			else this.#motionVars.decel.y.timestamp = null;

			const vel = this.#motionVars.vel;
			if (this.#gridVelocity.x !== 0){
				this.pstvXAxis.finInclination = { angle : 0 };
				this.ngtvXAxis.finInclination = { angle : 0 };
				
				this.#updateDelta(vel.x, timestamp);
				this.#tFactor.x += this.#gridVelocity.x * vel.x.delta;
			}
			else {
				this.pstvXAxis.finInclination = { angle : 35 };
				this.ngtvXAxis.finInclination = { angle : 35 };
				vel.x.timestamp = null;
			}
			if (this.#gridVelocity.y !== 0){
				this.pstvYAxis.finInclination = { angle : 0 };
				this.ngtvYAxis.finInclination = { angle : 0 };

				this.#updateDelta(vel.y, timestamp);
				this.#tFactor.y += this.#gridVelocity.y * vel.y.delta;
			}
			else {
				this.pstvYAxis.finInclination = { angle : 35 };
				this.ngtvYAxis.finInclination = { angle : 35 };
				vel.y.timestamp = null;
			}

			this.updateTmatrix();
			this.updateGridPoints();
			this.updateGrid();
			this.updateAxis();

			requestAnimationFrame(frameUpdate);
		}
		requestAnimationFrame(frameUpdate);
		
		this._graph.prepend(this._grid); 
		this._graph.prepend(this.boundingBox);
		this._graph.appendChild(this._pointLabel.text);
		this._graph.insertBefore(this._pointLabel.background, this._pointLabel.text);
		this._graph.insertBefore(this._pointLabel.point, this._pointLabel.text);
		this._graph.insertAfter(this.#cursorStandin, this._pointLabel.point);
	}
	//private functions
	#typewriterEffect(textElement, referenceString, speed=35, id = 0){
		//ID refers to location of instance in private variable
		clearInterval(this.#typewriterInstance[id]);
		textElement.textContent = "";
		let i = 0;
		const tick = () => { textElement.textContent += referenceString.charAt(i); i++; };
		tick();
		const interval = setInterval(() => {
			tick();
			if (i >= referenceString.length) clearInterval(this.#typewriterInstance[id]);
		}, speed);
		this.#typewriterInstance[id] = interval;
	}
	#applyTransformation({ point2d=undefined, point1d=undefined, vec=undefined, output=undefined, transformationMatrix=undefined } = {}, xAxis=true){
		let result = undefined;
		if (point2d !== undefined){
			const vector = vec2.fromValues(point2d.x, point2d.y);
			const transformedVector = vec2.create();
			vec2.transformMat2d(transformedVector, vector, transformationMatrix);
			if (output !== "vector"){
				result = {
					x : transformedVector[0],
					y : transformedVector[1]
				};
			}
			else {
				result = transformedVector;
			}
		}
		else if (vec !== undefined){
			const transformedVector = vec2.create();
			vec2.transformMat2d(transformedVector, vec, transformationMatrix);
			if (output === "2d"){
				result = {
					x : transformedVector[0],
					y : transformedVector[1]
				}
			}
			else {
				result = transformedVector;
			}
		}
		else if (point1d !== undefined){
			const vector = xAxis ? vec2.fromValues(point1d, 0) : vec2.fromValues(0, point1d);
			const transformedVector = vec2.create();
			vec2.transformMat2d(transformedVector, vector, transformationMatrix);
			result = xAxis ? transformedVector[0] : transformedVector[1];
		}
		
		return result;
	}
	#cTOs({ point2d=undefined, point1d=undefined, vec=undefined, output=undefined} = {}, xAxis = true){
		const transformationMatrix = mat2d.invert(mat2d.create(), this.#svgToCoordinates);
		return this.#applyTransformation({
			point2d : point2d,
			point1d : point1d,
			vec : vec,
			output : output,
			transformationMatrix : transformationMatrix
		}, xAxis);
	}
	#sTOc({ point2d=undefined, point1d=undefined, vec=undefined, output=undefined } = {}, xAxis = true){
		const transformationMatrix = this.#svgToCoordinates;
		return this.#applyTransformation({
			point2d : point2d,
			point1d : point1d,
			vec : vec,
			output : output,
			transformationMatrix : transformationMatrix
		}, xAxis);
	}
	#updateDelta(state, timestamp){
		state.delta = (state.timestamp === null) ? 0 : (timestamp - state.timestamp)/1000;
		state.timestamp = timestamp;

		return state.delta;
	}
	#decelGridVel(axis, timestamp){
		const decel = this.#motionVars.decel;
		if (axis === "x"){
			if (this.#gridVelocity.x === 0) {
				decel.x.timestamp = null;
				return;
			}
			this.#updateDelta(decel.x, timestamp);
			const deltaVel = 
				Math.sign(this.#gridVelocity.x)*this.#tDecceleration*decel.x.delta;
			this.#gridVelocity.x += deltaVel;
				
			if (Math.abs(this.#gridVelocity.x) <= Math.abs(this.#tDecceleration*decel.x.delta))
				this.#gridVelocity.x = 0;
		}
		else if (axis === "y"){
			if (this.#gridVelocity.y === 0){ 
				decel.y.timestamp = null
				return;
			}
			this.#updateDelta(decel.y, timestamp);
			const deltaVel = 
				Math.sign(this.#gridVelocity.y)*this.#tDecceleration*decel.y.delta;
			this.#gridVelocity.y += deltaVel;
				
			if (Math.abs(this.#gridVelocity.y) <= Math.abs(this.#tDecceleration*decel.y.delta))
				this.#gridVelocity.y = 0;
		}
	}
	#accelGridVel({axis, direction}, timestamp){
		const accel = this.#motionVars.accel
		if(axis === "x"){
			const state = (direction === 1) ? accel.posX : accel.negX;
			this.#updateDelta(state, timestamp);
			if (Math.abs(this.#gridVelocity.x) !== this.#maxTvelocity)
				this.#gridVelocity.x += direction * state.delta * this.#tAcceleration;
			if (Math.abs(this.#gridVelocity.x) > this.#maxTvelocity) 
				this.#gridVelocity.x = direction * this.#maxTvelocity; 
		}
		else if (axis === "y"){
			const state = (direction === 1) ? accel.posY : accel.negY;
			this.#updateDelta(state, timestamp);
			if (Math.abs(this.#gridVelocity.y) !== this.#maxTvelocity)
				this.#gridVelocity.y += direction * state.delta * this.#tAcceleration;
			if (Math.abs(this.#gridVelocity.y) > this.#maxTvelocity) 
				this.#gridVelocity.y = direction * this.#maxTvelocity; 
		}
	}
	
	//getters
	get graph(){	
		return this._graph;
	}

	//class function
	updateGrid(){
		let gridScript = "";
		const height = this.aspectRatio.height;
		const width = this.aspectRatio.width;
		const gridStyle = this._gridStyle;
		const padding = this.padding;

		const tempLine = new Line({startPoint : {x : 0, y : 0},
								   theta : 90,
								   distance : height-padding});
		
		for (const xValue of this._verticalGridLines){
			const upperBound = this._center.y - height/2 + padding;
			const svgPointX = this.#cTOs({point1d : xValue}, true)
			if (svgPointX > this._center.x + (width/2) ||
				svgPointX < this._center.x - (width/2)) continue;
			tempLine.startPoint = {x : svgPointX, y : upperBound};
			tempLine.degree = 90;
			tempLine.distance = height-padding
			gridScript += " " + tempLine.pathScript;
		}
		tempLine.degree = 0;
		tempLine.distance = width-padding;

		for (const yValue of this._horizontalGridLines){
			const leftBound = this._center.x - height/2 + padding;
			const svgPointY = this.#cTOs({point1d : yValue}, false);
			if (svgPointY > this._center.y + (height/2)||
				svgPointY < this._center.y - (height/2)) continue;
			tempLine.startPoint = {x : leftBound, y : svgPointY};
			tempLine.degree = 0;
			tempLine.distance = width-padding;
			gridScript += " " + tempLine.pathScript;
		}

		this._grid.setAttribute("style", gridStyle);
		this._grid.setAttribute("d", gridScript);
	}
	updateGridPoints(){
		const height = this.aspectRatio.height;
		const width = this.aspectRatio.width;
		this._horizontalGridLines = [];
		let upperRange = Math.floor(height/(2*this._gridSeparation)) + Math.round(this.#tFactor.y/this._gridSeparation) + 1;
		let lowerRange = - (Math.floor(height/(2*this._gridSeparation)) - Math.round(this.#tFactor.y/this._gridSeparation)) - 1;
		for (let i = lowerRange; i <= upperRange; i++){
			this._horizontalGridLines.push(i*this._gridSeparation);
		} 	
		this._verticalGridLines = [];
		upperRange = Math.floor(width/(2*this._gridSeparation)) + Math.round(this.#tFactor.x/this._gridSeparation) + 1;
		lowerRange = - (Math.floor(width/(2*this._gridSeparation)) - Math.round(this.#tFactor.x/this._gridSeparation)) - 1;
		for (let i = lowerRange; i <= upperRange; i++){
			this._verticalGridLines.push(i*this._gridSeparation);
		} 
	}
	updateTmatrix(){
		mat2d.set(
			this.#svgToCoordinates,
			this.#sFactor.x, 0,
			0, this.#sFactor.y,
			-this._center.x + this.#tFactor.x,
			this._center.y + this.#tFactor.y
		)
	}
	updateAxis(){
		let origin = { x : 0, y : 0};
		origin = this.#cTOs({point2d : origin});
		const height = this.aspectRatio.height;
		const width = this.aspectRatio.width;
		const padding = this.padding;

		const upperBound = {
			x : this._center.x + width/2 - padding,
			y : this._center.y + height/2 - padding
		};
		const lowerBound = {
			x : this._center.x - width/2 + padding,
			y : this._center.y - height/2 + padding
		};

		const startPoints = {
			pstvXAxis : {
				x : (origin.x < lowerBound.x) ? lowerBound.x : (origin.x > upperBound.x) ? null : origin.x,
				y : (lowerBound.y < origin.y && origin.y < upperBound.y) ? origin.y : null
			},
			ngtvXAxis : {
				x : (origin.x > upperBound.x) ? upperBound.x : (origin.x < lowerBound.x) ? null : origin.x,
				y : (lowerBound.y < origin.y && origin.y < upperBound.y) ? origin.y : null
			},
			pstvYAxis : {
				x : (lowerBound.x < origin.x && origin.x < upperBound.x) ? origin.x : null,
				y : (origin.y > upperBound.y) ? upperBound.y : (origin.y < lowerBound.y) ? null : origin.y
			},
			ngtvYAxis : {
				x : (lowerBound.x < origin.x && origin.x < upperBound.x) ? origin.x : null,
				y : (origin.y < lowerBound.y) ? lowerBound.y : (origin.y > upperBound.y) ? null : origin.y
			}
		}
		
		let axisPath = "";
		let workingPoint = startPoints.pstvXAxis;
		if (workingPoint.x !== null && workingPoint.y !== null){
			this.pstvXAxis.startPoint = workingPoint;
			this.pstvXAxis.degree = 0;
			this.pstvXAxis.distance = upperBound.x - workingPoint.x;

			axisPath += " " + this.pstvXAxis.pathScript;
		}
		workingPoint = startPoints.ngtvXAxis;
		if (workingPoint.x !== null && workingPoint.y !== null){
			this.ngtvXAxis.startPoint = workingPoint;
			this.ngtvXAxis.degree = 180;
			this.ngtvXAxis.distance = workingPoint.x - lowerBound.x;

			axisPath += " " + this.ngtvXAxis.pathScript;
		}
		workingPoint = startPoints.pstvYAxis;
		if (workingPoint.x !== null && workingPoint.y !== null){
			this.pstvYAxis.startPoint = workingPoint;
			this.pstvYAxis.degree = -90;
			this.pstvYAxis.distance = workingPoint.y - lowerBound.y;

			axisPath += " " + this.pstvYAxis.pathScript;
		}
		workingPoint = startPoints.ngtvYAxis;
		if (workingPoint.x !== null && workingPoint.y !== null){
			this.ngtvYAxis.startPoint = workingPoint;
			this.ngtvYAxis.degree = 90;
			this.ngtvYAxis.distance = upperBound.y - workingPoint.y;

			axisPath += " " + this.ngtvYAxis.pathScript;
		}
		
		this._axis.setAttribute("d", axisPath);
	}
}

module.exports = Grapher;