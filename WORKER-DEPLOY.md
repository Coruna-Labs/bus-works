# Live data — deploying the Worker

The map reads bus positions from a URL. Right now that's the simulated
`data/buses.json`. The Worker becomes that URL with **real** iTranvias data.
Nothing else in the app changes.

## 1. Deploy the Worker

Easiest (no install):

1. Go to <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Worker**.
2. Name it e.g. `bus-works-live`. Click **Deploy** (creates a default worker).
3. Click **Edit code**, delete the sample, paste all of `worker.js`, **Save and Deploy**.
4. You get a URL like `https://bus-works-live.<you>.workers.dev`.

Test it in the browser: open that URL. You should see JSON with `count`,
`buses`, and `lines_ok`. If `count` is 0, see step 3 below.

## 2. Point the map at the Worker

In `index.html`, find the poll fetch (in `pollBuses`):

```js
const res = await fetch("data/buses.json?t=" + Date.now());
```

Change it to your Worker URL:

```js
const res = await fetch("https://bus-works-live.<you>.workers.dev?t=" + Date.now());
```

That's the whole switch. The dots now show real buses.

## 3. Fixing the line IDs (the one likely snag)

We confirmed line id `600` works, but iTranvias uses internal ids that are NOT
the GTFS route names ("1", "6A", ...). So most of the guessed ids in `worker.js`
(`LINES`) may return nothing on the first deploy.

To find the real ids: the Worker response includes `lines_ok` — the ids that
returned buses. If it's short or empty, we need the correct id list. Two ways:

- Open the live map on tranviascoruna.com, watch the network tab for
  `queryitr_v3.php?...dato=<N>` calls — those `N` values are the real ids.
- Or paste me the `lines_ok` from a live deploy plus any ids you spot, and I'll
  correct the `LINES` array.

Once `LINES` holds the real ids, every line's buses appear.

## Notes

- The Worker caches ~8s so it isn't hammering iTranvias — polite, and plenty
  fresh for a bus map.
- `line` in the output is currently the iTranvias id. Once we know the id→route
  mapping, we map it back to GTFS names ("1", "6A") so dot colors/numbers match
  the network layer. Flag for the follow-up pass.
