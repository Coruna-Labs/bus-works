#!/usr/bin/env node
/*
 * simulate-buses.js — generate a placeholder buses.json in the exact shape the
 * Cloudflare Worker will later produce, by placing buses along real route
 * geometry and advancing them along their path.
 *
 * This is a stand-in for live data. It lets the map's dot layer + glide
 * animation be built and judged before the real Worker exists. It also stays
 * useful afterward as a deterministic test feed.
 *
 * Contract (per bus):  { line, lat, lon, status }
 *
 * Usage:
 *   node simulate-buses.js               # one snapshot -> data/buses.json
 *   node simulate-buses.js --loop        # rewrite data/buses.json every 3s
 *
 * The map polls data/buses.json on its own interval; --loop lets you watch
 * dots actually move against the static file during local development.
 */
const fs = require("fs");
const path = require("path");

const ROUTES = path.join(__dirname, "data", "routes.geojson");
const OUT = path.join(__dirname, "data", "buses.json");

// how many buses per line, and how fast they crawl along the path per tick
const BUSES_PER_LINE = 3;
const STEP = 0.003;            // path fraction per tick — halved for a calmer, realistic pace

function loadRoutes() {
  const fc = JSON.parse(fs.readFileSync(ROUTES, "utf8"));
  // for each route, flatten its first line-string into a single ordered path
  return fc.features.map((f) => {
    const g = f.geometry;
    let coords;
    if (g.type === "LineString") coords = g.coordinates;
    else if (g.type === "MultiLineString") coords = g.coordinates[0];
    else coords = [];
    return { line: f.properties.route_short_name, path: coords };
  }).filter((r) => r.path.length > 1);
}

// cumulative-length parametrization so movement speed is even along the path
function buildMeasured(path) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i], [x2, y2] = path[i + 1];
    const d = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, d, acc: total });
    total += d;
  }
  return { segs, total };
}

// position at parameter t in [0,1) along the measured path
function pointAt(measured, t) {
  const target = (t % 1) * measured.total;
  for (const s of measured.segs) {
    if (target <= s.acc + s.d) {
      const local = s.d === 0 ? 0 : (target - s.acc) / s.d;
      return [s.x1 + (s.x2 - s.x1) * local, s.y1 + (s.y2 - s.y1) * local];
    }
  }
  const last = measured.segs[measured.segs.length - 1];
  return [last.x2, last.y2];
}

const routes = loadRoutes();
const measured = routes.map((r) => ({ line: r.line, m: buildMeasured(r.path) }));

// each bus has a phase offset along its line and a per-tick advance
const buses = [];
measured.forEach((r) => {
  for (let i = 0; i < BUSES_PER_LINE; i++) {
    buses.push({ line: r.line, m: r.m, t: i / BUSES_PER_LINE });
  }
});

function snapshot() {
  const out = buses.map((b) => {
    const [lon, lat] = pointAt(b.m, b.t);
    b.t = (b.t + STEP) % 1;              // advance for next tick
    return {
      line: b.line,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5,
      status: "moving"
    };
  });
  fs.writeFileSync(OUT, JSON.stringify({ updated: Date.now(), buses: out }));
  return out.length;
}

if (process.argv.includes("--loop")) {
  console.log("Simulating — rewriting data/buses.json every 3s. Ctrl-C to stop.");
  console.log(`${snapshot()} buses written.`);
  setInterval(() => snapshot(), 3000);
} else {
  const n = snapshot();
  console.log(`Wrote data/buses.json — ${n} buses across ${routes.length} lines.`);
}
