# A Coruña Bus Network — Bus Works · Coruña Labs

One coherent, full-screen map of the entire city bus network, built on the
operator's own open data. The whole network shows at rest in a quiet grey;
selecting a line brings it forward in its official Tranvías color. Live vehicle
positions are the next milestone.

## Features

- **Trilingual** — Galician (default), Spanish, English. Toggle in the masthead.
  UI language persists across visits (localStorage) and is shareable via URL.
  Feed-native place names are left untranslated (a stop is called what it's called).
- **Shareable views** — language and selected line live in the URL
  (`?lang=en&line=6A`), so any view can be bookmarked or sent to someone.
  Galician is the clean default and is omitted from the URL.
- **Grey at rest, official color on selection** — the network reads as one
  legible whole; the selected line is the subject, painted in the operator's own
  color with a dark casing so even pale colors stay legible.
- **Bounded camera** — panning is fenced to the network's extent; you can't zoom
  out past the resting frame or wander off to empty sea. Zoom-in stays free.

## Run it locally

Static site, no build step. Serve the folder (browsers block `fetch` of files
opened directly):

```bash
cd coruna-bus-map
node split.js ~/geojson/coruna/coruna.geojson   # once, to load real route data
node simulate-buses.js                          # once, to seed data/buses.json
python3 -m http.server 8000
```

Open <http://localhost:8000>.

### Watching buses move (simulated)

The map polls `data/buses.json` every 10s and glides dots between updates.
To see them actually move against the placeholder, run the simulator in a
second terminal so it rewrites the file continuously:

```bash
node simulate-buses.js --loop     # rewrites data/buses.json every 3s
```

This is a stand-in for live data — it drives buses along the real route
geometry so the dot layer and glide animation can be judged before the
Cloudflare Worker exists. `buses.json` shape (the contract the Worker will
match): `{ updated, buses: [{ line, lat, lon, status }] }`.

- At rest: every bus is a small muted grey dot ("the whole city, moving").
- Select a line: its buses brighten to the line's official color and grow;
  the rest fade back.

## Data

- `data/routes.geojson`, `data/stops.geojson` — split from the combined
  `gtfs-to-geojson` output via `split.js`.
- `official_colors.json` — line → hex, from Compañía de Tranvías de La Coruña.
  These are mirrored inside `index.html` (the `OFFICIAL` map); lines without an
  official color (UDC, BUH, future lines) fall back to the operator red.
- Geometry source: <https://nap.transportes.gob.es/Files/Detail/1376> (official GTFS).

## Files

- `index.html` — the whole app (MapLibre GL via CDN)
- `split.js` — splits combined GeoJSON into routes + stops
- `simulate-buses.js` — generates placeholder `buses.json` (stand-in for live data)
- `data/` — network GeoJSON + buses.json
- `official_colors.json` — operator line colors
- Basemap: CARTO Positron (light grey, free, no API key)

## Next

- The Cloudflare Worker: polls the iTranvías endpoint for all lines, bundles
  positions into the `buses.json` shape, and serves it. Swapping the map from the
  simulated file to the Worker is a one-line change to the fetch URL.
- Empty / degraded states (feed down, no buses at night) — paired with the Worker.
