Custom MapLibre styles live in this directory.

Available map style ids:

- `positron` -> `https://tiles.openfreemap.org/styles/positron`
- `liberty` -> `https://tiles.openfreemap.org/styles/liberty`
- `custom` -> `/map-styles/positron-custom.json`

The app now uses `custom` by default. If `positron-custom.json` is missing or invalid,
the loader falls back to `positron` automatically.

`positron-custom.json` must be a complete MapLibre style JSON, not a partial diff.
Safe top-level fields to edit include:

- `projection`
- `sources`
- `sprite`
- `glyphs`
- `layers`
- optional view metadata such as `center`, `zoom`, or `metadata`

Safe layer-level edits include:

- `filter`
- `layout`
- `paint`
- `minzoom`
- `maxzoom`
- reordering layers when you need to change visual priority

In this Positron-based style, borders are already separated:

- `boundary_2` -> country borders
- `boundary_3` -> regional/admin borders (`admin_level` 3..6)
- `boundary_disputed` -> disputed borders

The current custom style keeps `boundary_3`, hides `boundary_2` and
`boundary_disputed`, softens minor roads, and hides lower-value labels like
country labels, catch-all place labels, and airport labels.

Good next tweaks in Maputnik:

- lighten or thin local roads a bit more
- tune `boundary_3` opacity if regional borders still feel heavy
- restore individual label layers selectively if some context feels too sparse
