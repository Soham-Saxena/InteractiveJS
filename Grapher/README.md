# Grapher

An interactive, pannable SVG coordinate plane widget — a full example of what [InteractiveJS](../README.md) is meant to build. Composes [Geometry](../Geometry/README.md) primitives and the [Animation Framework](../Animation%20Framework/README.md) into a single graphing-calculator-style component.

## Files

```
Grapher/
└── Grapher.js
```

`Grapher.js` pulls in `Arrow` and `Line` from [Geometry](../Geometry/README.md) (via its barrel `index.js`), `Interpolator` from [Animation Framework](../Animation%20Framework/README.md), and `vec2`/`mat2d` from the vendored [gl-matrix](https://github.com/toji/gl-matrix) in [`../lib`](../lib) (via `glMatrix.js`'s `loadGlMatrix()`).

## Features

- Renders an axis + grid inside a single SVG `<g>` element (`grapher.graph`), ready to append anywhere
- **WASD panning** with real acceleration/deceleration physics — the grid ramps up to a max velocity and coasts to a stop rather than moving instantly
- **Animated axis arrowheads** — fin angle flattens while panning and springs back when the grid comes to rest, driven by the Animation Framework
- **Magnetic cursor snapping** — hovering near an axis snaps a cursor indicator to the nearest grid point, with a coordinate label (`(x, y)`) that types itself out
- Custom SVG cursor and configurable styling for the border, axis, grid lines, and labels
- Internally converts between SVG pixel space and graph coordinate space using a `mat2d` transformation matrix, so panning/zooming logic works in coordinate units, not pixels

## Usage

```js
const Grapher = require("./Grapher.js");

const grapher = new Grapher({
  aspectRatio: { height: 400, width: 400 },
  gridSeparation: 25,
  border: true,
  padding: 5
});

document.body.appendChild(grapher.graph);
```

Focus the graph (click into it) and use **W / A / S / D** to pan. Hover near an axis to see the magnetic cursor and coordinate label.

### Configuration options

`Grapher`'s constructor accepts (all optional):

| Option | Default | Description |
|---|---|---|
| `aspectRatio` | `{ height: 300, width: 300 }` | Size of the graph |
| `border` | `true` | Whether to draw a border around the graph |
| `labelBorder` | `true` | Whether coordinate labels have a border |
| `borderStyle` / `axisStyle` / `gridStyle` / `labelStyling` | — | CSS-style strings for customizing appearance |
| `padding` | `5` | Padding between the bounding box and the axes |
| `gridSeparation` | `25` | Distance in px between grid lines |
| `labelOffset` / `labelPadding` | `10` / `6` | Spacing for coordinate labels |
| `axisTolerance` | `9` | How close the cursor must be to an axis to trigger snapping |
| `radius` | `3` | Radius of the snapped point indicator |

## Roadmap

- [ ] Zoom support (currently only panning is implemented)
- [ ] Plotting functions/data points on the graph
