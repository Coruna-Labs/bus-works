#!/usr/bin/env node
/*
 * split.js — split a combined gtfs-to-geojson "lines-and-stops" file into
 * two files the map expects: data/routes.geojson and data/stops.geojson.
 *
 * Usage:
 *   node split.js ~/geojson/coruna/coruna.geojson
 *
 * Routes = LineString / MultiLineString features.
 * Stops  = Point features.
 */
const fs = require("fs");
const path = require("path");

const input = process.argv[2];
if (!input) {
  console.error("Usage: node split.js <path-to-combined.geojson>");
  process.exit(1);
}

const fc = JSON.parse(fs.readFileSync(input, "utf8"));
if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
  console.error("Input is not a FeatureCollection.");
  process.exit(1);
}

const isLine = (t) => t === "LineString" || t === "MultiLineString";
const isPoint = (t) => t === "Point" || t === "MultiPoint";

const routes = [];
const stops = [];
const other = [];

for (const f of fc.features) {
  const t = f.geometry && f.geometry.type;
  if (isLine(t)) routes.push(f);
  else if (isPoint(t)) stops.push(f);
  else other.push(t);
}

const outDir = path.join(process.cwd(), "data");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "routes.geojson"),
  JSON.stringify({ type: "FeatureCollection", features: routes })
);
fs.writeFileSync(
  path.join(outDir, "stops.geojson"),
  JSON.stringify({ type: "FeatureCollection", features: stops })
);

console.log(`routes.geojson  ${routes.length} features`);
console.log(`stops.geojson   ${stops.length} features`);
if (other.length) console.log(`(skipped ${other.length} non-line/point features: ${[...new Set(other)].join(", ")})`);
