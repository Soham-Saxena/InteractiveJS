const Line = require('./Line.js');
const ArrowHead = require('./ArrowHead.js');

class Arrow extends Line{
	constructor({startPoint = {x : 0, y : 0}, 
			     endPoint = {x : 0, y : 0}, 
			     precision = 2, 
			     theta, 
			     distance, 
			     radian, 
			     arrowOrigin = undefined, 
			     headDirection = undefined, 
			     finAngle = undefined, 
			     arrowSize= undefined, 
			     line=undefined, 
			     arrowHead=undefined} = {}, svg=true){
		if (line === undefined){
			super({startPoint, endPoint, precision, theta, distance, radian}, svg);
		}
		else{
			super({line : line});
		}
		if (arrowHead === undefined){
			if (arrowOrigin === undefined) arrowOrigin = this._p2;
			if (headDirection === undefined) headDirection = this._theta;
			if (finAngle === undefined) finAngle = 35 * (Math.PI)/180.00;
			if (arrowSize === undefined) arrowSize = 10;
			this.arrowHead = new ArrowHead({arrowOrigin, headDirection, finAngle, arrowSize, precision});
		}
		else{
			this.arrowHead = new ArrowHead({arrow : arrowHead});
		}
	}
	
	//setters
	set startPoint(p){
		super.startPoint = p;
		
		this.arrowHead.direction = {angle: this._theta, svg : true};
	}
	set endPoint(p){
		super.endPoint = p;
		
		this.arrowHead.origin = this._p2;
		this.arrowHead.direction = {angle: this._theta, radian : true,  svg : true};
	}
	set radian(inp){
		super.radian = inp;
		
		this.arrowHead.direction = {angle: this._theta, radian : true, svg : true};
		this.arrowHead.origin = this._p2;
	}
	set degree(inp){
		this.radian = inp * (Math.PI)/180.00;
	}
	set distance(dist){
		super.distance = dist;
		
		this.arrowHead.origin = this._p2;
	}
	set finInclination({angle, radian = false} = {}){
		this.arrowHead.finInclination = {angle, radian};
	}
	set origin(percentage){
		if (percentage < 0) percentage = 0;
		if (percentage > 100) percentage = 100;
		
		this.arrowHead.origin = { x : this._p1.x + 
									  this._distance*Math.cos(this._theta)*(percentage/100),
								  y : this._p1.y + 
								      this._distance*Math.sin(this._theta)*(percentage/100)
		};
	}
	set arrowSize(size){
		this.arrowHead.arrowSize = size;
	}
	
	//getters
	get pathScript(){
		return super.pathScript + " " + this.arrowHead.pathScript;
	}
}

module.exports = Arrow;