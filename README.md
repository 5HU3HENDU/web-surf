# web-surf

A zoomable map of the web, inspired by [thiings.co](https://www.thiings.co/things).
Each tile is a website's icon + name. Drag to pan, scroll or pinch to zoom,
tap a tile for its info and a link out to the site.

## Run

No build step. Open `index.html` in a browser, or serve the folder with any
static host (GitHub Pages works as-is).

## Add or edit a site

Edit `sites.js` — one entry per site:

```js
{ name: "Example", domain: "example.com", url: "https://www.example.com", cat: "Tools", desc: "One short line about it" },
```

- `domain` is used for the icon (via Google's favicon service) and shown on the detail card.
- `cat` drives the category chips at the top.
- Keep `desc` to one short line.

Icons come from `https://www.google.com/s2/favicons?domain=...`; if an icon
fails to load, the tile falls back to the site's first letter.
