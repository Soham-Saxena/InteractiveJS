// Scripts/glMatrix.js
const fs = require("fs");
const path = require("path");

function loadGlMatrix() {
  if (!globalThis.__glMatrix) {
    const filePath = path.join(__dirname, "gl-matrix-min.js");
    const code = fs.readFileSync(filePath, "utf8");
    const module = { exports: {} };
    new Function("module", "exports", code)(module, module.exports);
    globalThis.__glMatrix = module.exports;
  }
  return globalThis.__glMatrix;
}

module.exports = { loadGlMatrix };