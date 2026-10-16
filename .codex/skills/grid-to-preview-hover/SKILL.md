---
name: grid-to-preview-hover
description: Build a hover-revealed image grid where hovering one tile makes the opposite half of the grid step aside and that picture scale up to fill it, with a clip-path iris and an optional detail-image gallery. Use for "product grid to preview", "hover to enlarge in place", or when porting the Codrops Grid to Full Preview effect.
metadata:
  short-description: Hover a grid tile to enlarge it in place
---

# Grid to Full Preview on Hover

Hovering a tile in a 4 x 2 image grid makes the **opposite half** of the grid step
aside -- its four tiles fade out and shuffle 2.5vw toward the centre of their block
-- and the hovered picture scales up to fill that half. A caption row sits just
under the enlarged image. Leaving the tile runs the whole move backwards.

The effect is layout driven rather than `position: fixed` trickery: the two preview
panes are a second grid layer laid over the first, so they inherit the exact cell
geometry and stay aligned at any viewport size. Nothing is measured from the tiles
themselves.

Reference implementation: Codrops *Grid to Full Preview* by Gwen Bogaert (MIT),
<https://tympanus.net/codrops/?p=93410>. A copy of that project lives in this
repository at `codrops-grid-to-preview/`.

## Read the mechanics before editing

[references/mechanics.md](references/mechanics.md) holds the timeline, the geometry
math and the exact clip-path values. Read it before changing the starter: five
things in it look like accidents and are load bearing.

## Starter

`assets/grid-preview-starter/` is a working port you can copy into a page:
`index.html`, `grid-preview.css`, `grid-preview.js`. Plain CSS, no SCSS, and no
package beyond `gsap`.

```js
import { createGridPreview } from "./grid-preview.js";

createGridPreview(document.getElementById("grid"));
```

Mount it once the tiles are in the DOM. The factory builds both preview panes from
the tiles itself, so a page only has to supply the grid and the pictures.

## Non-negotiable details

- The preview layer is `pointer-events: none`. Without it the panes swallow the
  hover and nothing responds.
- A pane's size comes from `grid-column: auto / span 2` plus `grid-row: 1 / span 2`,
  never from a width or height.
- `shrinkVw` is not the grid gap. It is how much smaller than its 2x2 block of
  cells the pane ends up, split across the two edges; the gap only spaces the
  grid and nothing in JS reads it. The reference happens to set the two equal.
- Tiles need `contain: size`, or scaling a pane reflows its neighbours mid move.
- Hover is debounced, and a pointer that leaves before the delay fires must cancel
  the pending switch.
- `onResize` kills and rebuilds the timeline, and a pane that is open when the
  viewport changes is snapped to the settled pose rather than closed or animated.
  The cross arm widths are percentages of the pane and the scale is in vw, so
  values baked into an old timeline go stale the moment the viewport changes.

## Adapting the tile count

The layout is 4 columns x 2 rows with the split rule `i % 4`, which yields two 2x2
panes. Changing the columns or rows means changing the pane span and the split rule
together; updating one and not the other is how this effect usually breaks.

## Host project conventions

If the host page hides the pointer globally (a `cursor: none` rule, or
`cursor: none !important` on everything the way this repository's `base.css` does),
remember to mount that project's custom cursor on the new page as well, or the page
ships with no pointer at all.
