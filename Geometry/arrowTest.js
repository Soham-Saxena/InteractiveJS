const basePath = app.vault.adapter.getBasePath();
const nodePath = require("path");
/**@typedef {import("./ArrowHead.js") ArrowHead} */
function freshRequire(file) {
    delete require.cache[require.resolve(file)];
    return require(file);
}

const ArrowHead = freshRequire(
    nodePath.join(basePath, "Scripts", "InteractiveJS", "Geometry", "ArrowHead.js")
);

const Transition = freshRequire(
    nodePath.join(basePath, "Scripts", "InteractiveJS", "Animation Framework", "Transition.js")
);


const Interpolator = freshRequire(
    nodePath.join(basePath, "Scripts", "InteractiveJS", "Animation Framework", "Interpolator.js")
);
const svgNS = "http://www.w3.org/2000/svg";

const wrapper = document.createElement("div");
const svg = document.createElementNS(svgNS, "svg")
svg.setAttribute("height", 500);
svg.setAttribute("width", 500);
svg.setAttribute("viewBox", "0 0 500 500");

const path = document.createElementNS(svgNS, "path");
/**@type ArrowHead*/
const arrow = new ArrowHead({
    arrowOrigin : {x : 250, y : 250},
    headDirection : 0,
});


arrow.attrTimeline({name : "origin"}).
    transform({interpType: Interpolator.func.EASE_IN}).
    from({x: 0, y: 0}).
    to({x: 500, y: 500}, 1000).
    to({x: 300, y: 10}, 1000).
    to({x: 20, y: 20}, 1000);

arrow.startTimeline();
console.log(arrow.attrTimeline({name: "origin"}).inspectKeyFrames("absolute"));

updateLoop = (timestamp) => {
    path.setAttribute("d", arrow.pathScript);
    requestAnimationFrame(updateLoop);
}
requestAnimationFrame(updateLoop);

path.setAttribute("stroke", "var(--interactive-accent)");
path.setAttribute("stroke-width", 2.5);

wrapper.style.display = "inline-block";

wrapper.style.border = "1px solid var(--background-modifier-border)";
wrapper.style.borderRadius = "8px";
wrapper.style.backgroundColor = "var(--background-secondary)";

svg.appendChild(path);
wrapper.appendChild(svg);

container.appendChild(wrapper);
