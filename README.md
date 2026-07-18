# InteractiveJS

A JavaScript framework for building animated, interactive SVG widgets — usable in [Obsidian](https://obsidian.md) notes or standalone in the browser.

InteractiveJS is made up of a few layered pieces, each usable on its own but designed to build on one another:

```
InteractiveJS/
├── Animation Framework/   # Core: interpolation, easing, and playback control for arbitrary state
├── Geometry/               # SVG-drawable primitives (lines, arrows) with animatable properties
├── Grapher/                # A full interactive, pannable coordinate-plane widget
└── lib/                    # Bundled third-party dependencies (currently gl-matrix)
```

| Layer | What it does | Depends on |
|---|---|---|
| **Animation Framework** | Interpolates any state over time with configurable easing curves, delay/duration, and a unified `Playable` interface (`play`, `pause`, `reverse`, `seek`, ...). Manage many animations at once with `PlayableManager`. | — |
| **Geometry** | `Line` and `Arrow` primitives that output SVG path data, with an animatable `ArrowHead` (direction, size, fin angle, origin) powered by the Animation Framework. | Animation Framework |
| **Grapher** | A ready-to-use interactive coordinate plane: pannable grid with acceleration/deceleration physics, animated axis arrows, magnetic cursor snapping, and coordinate labels. | Geometry, Animation Framework, `lib/` (gl-matrix) |
| **lib** | Bundled third-party code, currently a vendored copy of [gl-matrix](https://github.com/toji/gl-matrix) plus a `glMatrix.js` loader that Grapher uses for 2D matrix/vector math. | — |

## Why

The goal is a general-purpose toolkit for building **live, animated widgets that can be dropped into notes** — graphs, diagrams, interactive explainers — rather than one-off scripts per widget. Grapher is the first full widget built on top of the framework; more are expected to be added over time (this is why the framework layers are kept generic rather than graph-specific).

## Installation

```js
const { Animation, Transition, Interpolator } = require("./InteractiveJS/Animation Framework/index.js");
const { Arrow, Line } = require("./InteractiveJS/Geometry/index.js");
const Grapher = require("./InteractiveJS/Grapher/Grapher.js");
```

See each subfolder's README for details and usage examples specific to that layer.

## Status & Roadmap

This is an early-stage, actively growing project. Known gaps right now:

- [ ] No `package.json` — not yet installable via npm; `gl-matrix` is vendored directly in `lib/` rather than declared as a dependency
- [ ] No tests to showcase functionality yet
- [ ] `Timeline.js` (keyframe sequencing) nneds to be implemented


