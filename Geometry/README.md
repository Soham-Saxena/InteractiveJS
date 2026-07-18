# Geometry

SVG-drawable geometric primitives — lines and arrows — with animatable properties like direction, length, origin, and fin angle. Part of [InteractiveJS](../README.md); built on top of [Animation Framework](../Animation%20Framework/README.md) for interpolation and playback control.

## Files

```
Geometry/
├── Line.js         # 2D line segment primitive
├── Arrow.js         # Line + ArrowHead
├── ArrowHead.js      # Animatable arrowhead shape
└── arrowTest.js       # Example usage (written for Obsidian — see note below)
```

## Features

- **`Line`** — a 2D line segment defined by two points (or an origin, angle, and distance), with an SVG `pathScript` getter for direct use in `<path>` elements
- **`Arrow`** — a `Line` with an attached, independently-configurable arrowhead
- **`ArrowHead`** — a standalone arrowhead shape (origin, direction, fin angle, size) whose properties can be smoothly **animated** — direction, size, fin angle, and origin can each transition with their own duration, delay, and easing curve
- Coordinate math handled for you — set a line by two points, or by angle + distance, and read back the other representation at any time
- Works with both **degrees and radians**, and supports both SVG-orientation (`y` down) and standard math-orientation angles

## Usage

You can require individual files, or pull everything in at once via the barrel `index.js`:

```js
const { Line, Arrow, ArrowHead } = require("./index.js");
```

### Basic line

```js
const Line = require("./Line.js");

const line = new Line({
  startPoint: { x: 0, y: 0 },
  endPoint: { x: 100, y: 50 }
});

console.log(line.pathScript); // "M 0 0 L 100 50"
console.log(line.distance);   // 111.80...
console.log(line.degree);     // 26.57...
```

You can also define a line by angle and distance instead of two points:

```js
const line = new Line({
  startPoint: { x: 0, y: 0 },
  theta: 45,       // degrees
  distance: 100
});
```

### Basic ArrowHead creation
```js
const ArrowHead = require("./ArrowHead.js");

const arrowhead = new ArrowHead({
  arrowOrigin : { x : 0, y : 0 },
  headDirection : 30, // degree
  arrowSize : 10
});

console.log(arrowhead.pathScript); // M 0 0 L -9.96 0.87 M 0 0 L -4.23 -9.06
console.log(arrowhead.directionTheta); // 30
console.log(arrowhead.arrowSize); // 10
```

### Arrow with a static head

```js
const Arrow = require("./Arrow.js");

const arrow = new Arrow({
  startPoint: { x: 0, y: 0 },
  endPoint: { x: 200, y: 0 },
  arrowSize: 12,
  finAngle: 35 * (Math.PI / 180)
});

svgPathElement.setAttribute("d", arrow.pathScript);
```

> **Note:** `arrowTest.js` is written to run inside [Obsidian](https://obsidian.md) (it references `app.vault.adapter` and Obsidian's CSS variables). It's kept here as a working example but isn't required by the library — consider moving Obsidian-specific demos into a top-level `examples/` folder as the project grows.

## Roadmap

- [ ] Additional shapes (circles, curves, polygons)
