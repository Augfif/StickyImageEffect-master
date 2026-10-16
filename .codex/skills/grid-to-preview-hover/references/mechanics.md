# Mechanics

Everything below is extracted from `codrops-grid-to-preview/` in this repository
(Codrops, MIT). File references point at that copy.

## 1. Two grid layers

`.products__grid` and `.products__preview` are siblings inside `.products`, and both
declare the identical grid: `grid-template-columns: repeat(4, 1fr)`,
`grid-template-rows: repeat(2, 1fr)`, the same `padding: 48px` and the same
`row-gap`/`column-gap` of `5vw` (`src/styles/shop.scss`).

The preview layer is taken out of flow with `position: absolute; inset: var(--page-padding)`
and given `pointer-events: none` and `z-index: 2`. Because its grid definition and
padding match the tile grid exactly, a pane placed on it lands on the same cells.
**That coincidence is the whole trick** -- the pane is never positioned, sized or
measured in JS.

A pane is `grid-column: auto / span 2; grid-row: 1 / span 2`, so within the 4 x 2
grid it occupies a 2 x 2 quadrant. There is one pane per half, placed at the start
of its own half.

## 2. The crossing rule

A tile in the **left** half (`i % 4` is 0 or 1) reveals the pane on the **right**,
because the pane appears where the pointer is not. Concretely in
`src/js/product-grid.js`:

```js
// container is the OPPOSITE half to the tiles that drive it
this.productPreviewRight = new ProductPreview({
  container: this.ui.containerRight,
  products:  tiles where i % 4 is 2 or 3   // the tiles this pane covers
})
```

So one pane is driven by the left-half tiles and covers (fades) the right-half
tiles. The reference names these `productPreviewLeft` / `productPreviewRight` after
the tiles, which reads backwards; the starter renames them `forLeftTiles` /
`forRightTiles`.

## 3. The timeline

`ProductPreview.buildTimeline()` (`src/js/product-preview.js`) builds one paused
timeline, `defaults: { ease: 'power2.inOut' }`, with two labels both at 0:

```js
.addLabel('preview', 0)
.addLabel('products', 0)
.to(container,  { opacity: 1 }, 'preview')
.to(container,  { scaleX: f.x, scaleY: f.y, transformOrigin: 'center center' }, 'preview')
.to(tiles,      { opacity: 0,
                  x: i => i % 2 === 0 ? '2.5vw' : '-2.5vw',
                  y: i => i < 2   ? '2.5vw' : '-2.5vw' }, 'products')
.fromTo(inside, { clipPath: <cross> }, { clipPath: <degenerate> }, 'preview')
```

- All four start together. There is no stagger and no sequencing.
- The four tiles the pane covers fade to 0 and shift 2.5vw. Both signs are chosen
  so the group converges on the centre of its own 2x2 block, not so it spreads:
  `x` is positive for a tile in the block's left column, `y` is positive for the
  block's top row. Because the tiles are already at opacity 0 by the time the
  move reads, the shift is a shuffle under the arriving picture rather than
  something the eye follows.
- `setProduct(tile)` calls `timeline.play()` on enter and `timeline.reverse()` on
  leave. Reversing rather than rebuilding is why the leave never pops.

## 4. The clip-path iris

`inside` (`.product-preview__inside`) is an opaque panel of the page background
covering the pane, sitting above the pane's images. It is clipped to a **12 point
plus sign**, and the animation collapses that plus to nothing:

```js
// from: a plus, arms `x` percent wide and `y` percent tall, centred
polygon(
  ${50 - x / 2}% 0%,      ${50 + x / 2}% 0%,
  ${50 + x / 2}% ${50 - y / 2}%,   100% ${50 - y / 2}%,
  100% ${50 + y / 2}%,   ${50 + x / 2}% ${50 + y / 2}%,
  ${50 + x / 2}% 100%,   ${50 - x / 2}% 100%,
  ${50 - x / 2}% ${50 + y / 2}%,   0% ${50 + y / 2}%,
  0% ${50 - y / 2}%,     ${50 - x / 2}% ${50 - y / 2}%
)

// to: every point on the centre or an edge midpoint, i.e. zero area
polygon(
  50% 0%,   50% 0%,   50% 50%,  100% 50%,
  100% 50%, 50% 50%,  50% 100%, 50% 100%,
  50% 50%,  0% 50%,   0% 50%,   50% 50%
)
```

**The end value is not the full rectangle**, which is the easy misreading. Points
3/6/9/12 all sit on the centre and the rest sit on edge midpoints, so the polygon
has no area and the cover vanishes. The iris reads as a brief light-coloured plus
that retracts into the middle as the picture arrives.

## 5. Geometry, and why it is recomputed on resize

`onResize()` (`src/js/product-preview.js`) turns viewport units into percentages
against the *pane's own* box, then rebuilds the timeline:

```js
const { width, height } = container.getBoundingClientRect()
const vw = window.innerWidth / 100
const arm = 5 * vw                               // 5vw of arm, in px
armWidth = { x: (arm / width) * 100, y: (arm / height) * 100 }

const widthInVw = width / vw, heightInVw = height / vw
const shrink = 5                                 // 5vw of shrink
scaleFactor = {
  x: (widthInVw - shrink) / widthInVw,
  y: (heightInVw - shrink) / heightInVw
}
```

The pane starts out exactly as wide as its two columns plus the gap between them.
Scaling about `center center` splits the shrink evenly between the two edges, so at
1600px wide `shrinkVw = 5` pulls each edge 40px in. The reference sets `shrinkVw`
equal to the gap so the inset follows the grid's rhythm, but nothing enforces that:
the gap is a CSS-only value and JS never reads it.

Measured on the reference at 1600 x 1000: pane 614 x 788 px, resulting
`matrix(0.8847, 0, 0, 0.9078, 0, 0)`.

## 6. The detail gallery

`setProduct(tile)` hides every image in the pane, shows only the ones whose
`data-id` matches the tile, and starts a `repeat: -1` timeline that sets each image
to `opacity: 1` in turn with a `+=0.5` hold. Any previous gallery timeline is
killed first.

With a single image per tile the timeline still runs but never changes anything,
so a project with one picture per subject can ignore this part (the starter keeps
it and lets it no-op).

## 7. Hover debounce

`product-grid.js` starts a 100 ms `setTimeout` on `mouseenter` and clears it on
`mouseleave`. Without the cancel, a pointer crossing a tile on its way somewhere
else still opens the pane and it flashes.

## 8. Porting deltas in `assets/grid-preview-starter/`

The starter is the same effect with these deliberate differences:

| Reference | Starter | Why |
| --- | --- | --- |
| SCSS with nesting | plain CSS, custom properties | host projects here have no preprocessor |
| `debounce` package | inline three-line debounce | avoids a dependency for one call site |
| 24 hand-written pane `<img>` tags | panes built from the tiles in JS | one source of truth for tile list and images |
| `data-name` / `data-price` | `data-title` / `data-meta` | not a shop |
| category nav and "Add to cart" | omitted | decorative |
| `display: none` under 900 px | grid stays, pane layer off | a phone gets pictures instead of a blank page |
| light `#efefef` theme | dark `#131319`, via custom properties | matches this repository's pages |
| boot on `window.load` | `createGridPreview(root, options)` factory | callable, testable, returns `destroy()` |

Everything in sections 1-7 is preserved unchanged, including the exact clip-path
values and the label names.

## 9. Decorative parts worth ignoring

The `.frame` header, `.shop-categories` nav, `.breakpoint-disclaimer` and the
`loaderAnim` skeleton are demo chrome. `.product__cta` is a hover bar; drop it
unless the target page wants a call to action on hover.
