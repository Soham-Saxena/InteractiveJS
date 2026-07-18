const basePath = app.vault.adapter.getBasePath();
function freshRequire(path) {
    delete require.cache[require.resolve(path)];
    return require(path);
}
/**@type {typeof import("./ArrowHead.js")}*/
const ArrowHead = freshRequire("./ArrowHead.js");
//const AnimationManager = require("./AnimationManager.js");
//const Animation = require("./Animation.js");
/**@type {typeof import("./Transition.js")} */
const Transition = freshRequire("../Animation Framework/Transition.js");
/**@type {typeof import("./Interpolator.js")}  */
const Interpolator = freshRequire("../Animation Framework/Interpolator.js");
const svgNS = "http://www.w3.org/2000/svg";

const wrapper = document.createElement("div");
const svg = document.createElementNS(svgNS, "svg")
svg.setAttribute("height", 500);
svg.setAttribute("width", 500);
svg.setAttribute("viewBox", "0 0 500 500");

const path = document.createElementNS(svgNS, "path");
const arrow = new ArrowHead({
    arrowOrigin : {x : 250, y : 250},
    headDirection : 0,
});
// arrow.transform({
//     name : "size",
//     duration : 2000,
//     interpType : Interpolator.func.SMOOTHSTEP
// });
arrow.transform({
    name : "direction",
    duration : 1000,
});
arrow.transform({
    name : "finAngle",
    duration : 1000
});
arrow.transform({
    name : "origin",
    duration : 2500,
    interpType : Interpolator.func.EASE_IN_OUT
});
arrow.transform({
    name : "size",
    duration : 1000
});
console.log(arrow.attrAnimation("origin").transition.configuration);
arrow.arrowSize = 50;
arrow.direction = {angle : 360};
arrow.finInclination = {angle : Math.PI / 4, radian : true};
arrow.origin = { x : 0, y : 0};
setTimeout(() => {arrow.origin = { x : 400, y : 300};}, 2500);

const update = (timestamp) => {
    path.setAttribute("d", arrow.pathScript);

    requestAnimationFrame(update);
}
requestAnimationFrame(update);

path.setAttribute("stroke", "var(--interactive-accent)");
path.setAttribute("stroke-width", 2.5);

wrapper.style.display = "inline-block";

wrapper.style.border = "1px solid var(--background-modifier-border)";
wrapper.style.borderRadius = "8px";
wrapper.style.backgroundColor = "var(--background-secondary)";

svg.appendChild(path);
wrapper.appendChild(svg);

container.appendChild(wrapper);
