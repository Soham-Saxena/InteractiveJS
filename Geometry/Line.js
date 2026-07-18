class Line{
    constructor({ startPoint = {x : 0, y : 0}, endPoint = {x : 0, y : 0}, precision = 2, theta, distance, radian, line=undefined} = {}, svg=true){
		this.precision = precision;
        if (line === undefined){
            if (theta === undefined && radian === undefined){
                this._p1 = {x : startPoint.x, y : startPoint.y};
                this._p2 = {x : endPoint.x, y : endPoint.y};
                
                this._theta = Math.atan2((endPoint.y - startPoint.y), (endPoint.x - startPoint.x));
                this._distance = Math.hypot((endPoint.x - startPoint.x), (endPoint.y - startPoint.y));
            }
            else{
                this._p1 = startPoint;
                if(theta === undefined){
                    this._theta = radian;
                }
                else{
                    this._theta = theta * (Math.PI/180.00);
                }
                if (!svg) this._theta = -this._theta;
                this._p2 = {
                    x : startPoint.x + distance*Math.cos(this._theta),
                    y : startPoint.y + distance*Math.sin(this._theta)
                };
                
                this._distance = distance;
		    }
        }
        else{//copy constructor
            this._p1 = line._p1;
            this._p2 = line._p2;
            this._theta = line._theta;
            this._distance = line._distance;

        }
	}
	
	//setters
	set startPoint(p){
		this._p1.x = p.x;
		this._p1.y = p.y;
		
		this._theta = Math.atan2((this._p2.y - this._p1.y), (this._p2.x - this._p1.x));
		this._distance = Math.hypot((this._p2.x - this._p1.x), (this._p2.y - this._p1.y));
	}
	set endPoint(p){
		this._p2.x = p.x;
		this._p2.y = p.y;
		
		this._theta = Math.atan2((this._p2.y - this._p1.y), (this._p2.x - this._p1.x));
		this._distance = Math.hypot((this._p2.x - this._p1.x), (this._p2.y - this._p1.y));
	}
	set radian(inp){// either a number or {radian, isSvg}
		let targetRadian = 0;
		let svg = true;
		if (typeof inp === "number"){
			targetRadian = inp;
			svg = true;
		}
		else if (typeof inp === "object" && inp !== null){
			const {radian = 0, isSvg = true} = inp;
			targetRadian = radian;
			svg = isSvg;
		}
		this._theta = svg ? targetRadian : -targetRadian;
		this._p2 = {
			x : this._p1.x + this._distance*Math.cos(this._theta),
			y : this._p1.y + this._distance*Math.sin(this._theta)
		};
	}
	set degree(theta){
		this.radian = theta * (Math.PI)/180;
	}
	set distance(dist){
		this._distance = dist;
		this._p2 = {
			x : this._p1.x + this._distance*Math.cos(this._theta),
			y : this._p1.y + this._distance*Math.sin(this._theta)
		};
	}
	
	//Getters
	get startPoint(){
		return this._p1;
	}
	get endPoint(){
		return this._p2;
	}
	get radian(){
		return this._theta;
	}
	get degree(){
		return this._theta * (180.00)/Math.PI;
	}
	get distance(){
		return this._distance;
	}

	//SVG draw instructions
	get pathScript(){
        const prec = this.precision;
		let script = `M ${+this._p1.x.toFixed(prec)} ${+this._p1.y.toFixed(prec)} L ${+this._p2.x.toFixed(prec)} ${+this._p2.y.toFixed(prec)}`;

		return script;
	}
}

module.exports = Line;