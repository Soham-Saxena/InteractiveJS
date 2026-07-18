# Animation Framework

A lightweight, dependency-free JavaScript module for interpolating and orchestrating **stateful animations**. Instead of being tied to CSS/DOM properties, it animates arbitrary state (numbers, positions, colors — anything you can lerp), driven by configurable easing curves and centralized playback control.

## Features

- **State animation** — animate any value or object, not just DOM styles
- **12 built-in easing functions** — linear, smoothstep, ease in/out/in-out, expo, circ, back, elastic, bounce — plus support for custom interpolation functions
- **Configurable transitions** — control duration, delay, and how the start/end states are blended (custom "mutator" functions)
- **Unified playback interface** (`Playable`) — every animatable object supports `play`, `pause`, `resume`, `reverse`, `forward`, `reset`, and `seek`
- **Centralized playback management** (`PlayableManager`) — register multiple animations under names and control them individually or in bulk, driven by a single `requestAnimationFrame` loop
- **Keyframes** — define a state at an absolute time with its own transition, including "hold" keyframes that pause interpolation

## Files

```
Animation Framework/
├── Playable.js          # Abstract base class defining the playback interface
├── Animation.js         # Interpolates a single state between a start and end value
├── Transition.js        # Duration, delay, interpolator, and mutator configuration
├── Interpolator.js      # Library of easing/interpolation functions
├── PlayableManager.js   # Manages and drives a collection of Playables
├── KeyFrame.js          # datastrcture to store state + timestamp + transition
└── Timeline.js          # (planned) sequencing of KeyFrames — not yet implemented
```

## Core Concepts

### `Playable`
An abstract base class that defines the common playback contract every animatable object implements: `play`, `pause`, `resume`, `reverse`, `forward`, `reset`, `seek`, and a `playableState` (`PLAYING`, `PAUSED`, `FINISHED`). It cannot be instantiated directly — `Animation` and `PlayableManager` both extend it.

### `Interpolator`
Wraps an easing function. Choose from the built-in library via `Interpolator.func` (e.g. `Interpolator.func.EASE_OUT_BOUNCE`), or supply your own custom function (it must map `0 → 0` and `1 → 1`).

### `Transition`
Describes *how* an animation progresses: `duration`, `delay`, which `Interpolator` to use, and a `mutator` function that blends the start and end states together at a given progress value (defaults to linear interpolation, but can be overridden for colors, vectors, etc.).

### `Animation`
Combines a `Transition` with a `start` and `end` state. Call `play(deltaTime)` on each frame to advance it; read `currentState` to get the interpolated value. Supports `onUpdate` and `onFinish` callbacks.

### `KeyFrame`
Represents a state at an absolute time, with its own `Transition` (or `KeyFrame.HOLD` to freeze at that state). Intended to be consumed by `Timeline` (not yet implemented) for multi-step animation sequences.

### `PlayableManager`
Holds a named collection of `Playable`s (e.g. multiple `Animation`s) and drives them together via a single `requestAnimationFrame` loop. Supports controlling one animation by name, several by name array, or all of them at once.

## Usage Example

You can require individual files, or pull everything in at once via the barrel `Index.js`:

```js
const { Animation, Transition, Interpolator, PlayableManager } = require("./Index.js");
```

```js
const Animation = require("./Animation.js");
const Transition = require("./Transition.js");
const Interpolator = require("./Interpolator.js");
const PlayableManager = require("./PlayableManager.js");

// Animate an object's x position from 0 to 100 over 500ms with an ease-out-back curve
const moveX = new Animation({
  transition: new Transition({
    duration: 500,
    interpType: Interpolator.func.EASE_OUT_BACK
  }),
  startState: 0,
  endState: 100,
  onUpdate: (value) => console.log("x:", value),
  onFinish: () => console.log("Animation complete")
});

const manager = new PlayableManager({
  names: ["moveX"],
  playables: [moveX]
});

manager.run();
```

## Roadmap

- [ ] Implement `Timeline.js` to sequence `KeyFrame`s into a single animatable track
