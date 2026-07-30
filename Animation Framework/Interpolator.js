/**
 * Maps a normalized input value in `[0, 1]` to another normalized value in
 * `[0, 1]` using an easing function.
 *
 * An Interpolator represents the progression of an animation over time and is
 * typically used by {@link Transition} to determine interpolation speed.
 *
 * Built-in easing functions are available through {@link Interpolator.func},
 * but custom interpolation functions may also be supplied.
 */
class Interpolator{
    /**
     * Built-in Interpolator function identifiers.
     * 
     * @readonly
     * @enum {string}
     */
    static func = Object.freeze({
        LINEAR : "linear",
        SMOOTHSTEP : "smoothstep",

        EASE_IN : "easeIn",
        EASE_OUT : "easeOut",
        EASE_IN_OUT: "easeInOut",

        EASE_IN_EXPO : "easeInExpo",
        EASE_OUT_EXPO : "easeOutExpo",
        EASE_IN_OUT_EXPO : "easeInOutExpo",

        EASE_IN_CIRC : "easeInCirc",
        EASE_OUT_CIRC : "easeOutCirc",

        EASE_OUT_BACK : "easeOutBack",
        EASE_OUT_ELASTIC : "easeOutElastic",
        EASE_OUT_BOUNCE : "easeOutBounce"
    });
    /**
     * @typedef {Object} Range
     * @property {number} lowerLimit - The lowest value of the Range.
     * @property {number} upperLimit - The highest value of the Range.
     */
    /**
     * Clamps provided value between the range.
     * - `[0, 1]` by default, 
     * 
     * @param {number} x Value to clamp.
     * @param {Range} [limits] The custom limits to clamp to.
     * @returns {number} Clamped value.
     */
    static clamp = (x, limits = undefined) => {
        if (limits === undefined)
            limits = {lowerLimit : 0, upperLimit : 1};
        return Math.min(Math.max(x, limits.lowerLimit), limits.upperLimit);
    }
    /**
     * Factory functions used to create interpolation functions. Works using on identifiers present in {@link Interpolator.func}
     * 
     * Each generator accepts a parameter object and returns a function of the form: `(x) => number`, where `x` is expected to lie between `[0, 1]`.
     * 
     * @type {Object<string, function(Object) : function(number): number>}
     */
    static funcGenerator = {
        [Interpolator.func.LINEAR] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                return x;
            };
        },
        [Interpolator.func.SMOOTHSTEP] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                return 3*(x**2) - 2*(x**3);
            };
        },
        [Interpolator.func.EASE_IN] : (params = {}) => {
            const power = params.power ?? 2;

            return (x) => {
                x = Interpolator.clamp(x);
                return x**power;
            };
        },
        [Interpolator.func.EASE_OUT] : (params = {}) => {
            const power = params.power ?? 2;

            return (x) => {
                x = Interpolator.clamp(x);
                return 1 - (1-x)**power;
            };
        },
        [Interpolator.func.EASE_IN_OUT] : (params = {}) => {
            const accelPower = params.accelPower ?? (params.power ?? 2);
            const decelPower = params.decelPower ?? (params.power ?? 2);

            return (x) => {
                x = Interpolator.clamp(x);
                if (x <= 0.5){
                    return ((2*x)**accelPower)/2;
                }
                else{
                    return 1 - ((2 - 2*x)**decelPower)/2;
                }
            }
        },
        [Interpolator.func.EASE_IN_EXPO] : (params = {}) => {
            return (x) =>{
                x = Interpolator.clamp(x);
                if (x === 0) return 0;
                else return 2**(10*x-10);
            }
        },
        [Interpolator.func.EASE_OUT_EXPO] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                if (x === 1) return 1;
                else return 1 - (2**(-10*x));
            }
        },
        [Interpolator.func.EASE_IN_OUT_EXPO] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                if (x===0) return 0;
                else if (x <= 0.5) return (2 ** (20 * x - 10)) / 2;
                else if ((x >= 0.5) && (x !== 1)) return 1 -((2**(-20*x+10))/2);
                else if (x === 1) return 1;
            }
        },
        [Interpolator.func.EASE_IN_CIRC] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                return 1 - (1-x**2)**0.5;
            }
        },
        [Interpolator.func.EASE_OUT_CIRC] : (params = {}) => {
            return (x) => {
                x = Interpolator.clamp(x);
                return (1-(x-1)**2)**0.5;
            }
        },
        [Interpolator.func.EASE_OUT_BACK] : (params = {}) => {
            const overshoot = params.overshoot ?? 1.70158;
            return (x) => {
                x = Interpolator.clamp(x);
                return 1 + (overshoot+1)*(x-1)**3 + overshoot*(x-1)**2;
            }
        },
        [Interpolator.func.EASE_OUT_ELASTIC] : (params = {}) => {
            const period = params.period ?? 0.3;
            return (x) => {
                x = Interpolator.clamp(x);
                if (x === 0) return 0;
                else if (x === 1) return 1;
                else return (2**(-10*x))*Math.sin(((2*Math.PI)/period) * (x - (period/4))) + 1;
            }
        },
        [Interpolator.func.EASE_OUT_BOUNCE] : (params = {}) => {
            const c1 = 7.5625;
            const c2 = 2.75;

            return (x) => {
                x = Interpolator.clamp(x);
                if (x < (1/c2)) return c1*x**2;
                else if (x < (2/c2)) return c1*(x - 1.5/c2)**2 + 0.75;
                else if (x < (2.5/c2)) return c1*(x - 2.25/c2)**2 + 0.9375;
                else return c1*(x - 2.625/c2)**2 + 0.984375
            }
        }
    }
    #interpFunc = null;
    #funcName = "unknown";

    /**
     * @param {Object} [options] Options to configure the created Interpolator.
     * @param {string} [options.type = Interpolator.func.SMOOTHSTEP] Built-in interpolation type.
     * @param {Object} [options.params = {}] Parameters passed to the interpolator generator.
     * @param {Interpolator} [interpolator] Existing Interpolator to copy. If provided, all other parameters are ignored. 
     */
    constructor({
        type = Interpolator.func.SMOOTHSTEP, 
        params = {}, 
        interpolator = undefined} = {}
    ){
        if (interpolator === undefined){
            const generator = Interpolator.funcGenerator[type];
            if (typeof generator === "function"){
                this.#funcName = type;
                this.#interpFunc = generator(params);
            }
            else{
                console.warn("Interpolator type not recognized, defaulting to smoothstep.");
                this.#funcName = Interpolator.func.SMOOTHSTEP;
                this.#interpFunc = Interpolator.funcGenerator[Interpolator.func.SMOOTHSTEP](params);
            }
        }
        else{ //copy constructor
            this.#funcName = interpolator.funcName;
            this.#interpFunc = interpolator.interpolationFunction;
        }
    }
    //getter
    /**
     * Returns the interpolator function of the form: `(x : number) => number`
     * 
     * @returns {function(number) : number} The interpolation function.
     */
    get interpolationFunction(){
        return this.#interpFunc;
    }
    /**
     * Returns the name of the interpolator type used.
     * 
     * @returns {string} The name of the function.
     */
    get funcName(){
        return this.#funcName;
    }
    
    //setters
    /**
     * Configures the interpolator based on provided options.
     * 
     * **Note:** Can be configured with a custom function as well, ensure the function is of the type: `(x : number) => number`.
     * Output will be clamped automatically between `[0, 1]`.
     * **Warning:** Custom function should map `0 -> 0` and `1 -> 1`
     *
     * 
     * @param {Object} options Options to configure the interpolator.
     * @param {string} [options.functionType] Built-in function type from {@link Interpolator.func}.
     * @param {Object} [params] Parameteres passed to the interpolator generator.
     * @param {function(number) : number} [customFunction] Custom function for the interpolator to use. If provided, ignores all other parameters except `funcName`.
     * @param {string} [funcName] Name provided for the customFunction, function will be named undefined if not provided. 
     */
    set interpolationFunction({functionType = undefined, params = {}, customFunction = undefined, funcName = "unknown"} = {}){
        if (functionType !== undefined){
            const generator = Interpolator.funcGenerator[functionType];
            if (generator !== undefined) {
                this.#funcName = functionType;
                this.#interpFunc = generator(params);
            }
            else console.warn("Interpolator type not recognized.");
        }
        else if (customFunction !== undefined && typeof customFunction === "function"){
            const almostEqual = (x, y, EPS = 1e-12) => {
                return Math.abs(x-y) < EPS;
            }
            const start = customFunction(0);
            const end = customFunction(1);
            if ((almostEqual(start, 0) && (almostEqual(end, 1)))){
                this.#funcName = funcName;
                this.#interpFunc = customFunction;
            }
            else console.warn("Custom function rejected, does not behave like an interpolator.");
        }
        else console.warn("Input type is incorrect.");
    }

    //class functions
    /**
     * Calculates interpolated value.
     * 
     * @param {number} x Input to Interpolator function.
     * @returns {number} Interpolated value between `[0, 1]`.
     */
    calculate(x){
        if (Interpolator.funcGenerator[this.#funcName] === undefined) 
            x = Interpolator.clamp(x); //mainly put as a safety measure for custom functions
        return this.#interpFunc(x);
    }
    /**
     * Copies all attributes of the provided interpolator. 
     * 
     * @param {Interpolator} interpolator The Interpolator to copy.
     */
    copy(interpolator){
        this.#funcName = interpolator.funcName;
        this.#interpFunc = interpolator.funcName;
    }
}

module.exports = Interpolator;