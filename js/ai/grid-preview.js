import { gsap } from "gsap";

/**
 * Grid to full preview.
 *
 * Hovering a tile makes the opposite half of the grid step aside and the hovered
 * picture scale up to fill it. Why each number below is what it is, and which of
 * them are load bearing, is in the references/ folder next to this starter.
 *
 * Hover only: the effect is driven by mouseenter, so a touch device gets the
 * plain grid the stylesheet falls back to.
 */

const DEFAULTS = {
  // How much smaller than its 2x2 block of cells the pane ends up, in vw. The
  // shrink is split across the two edges, so each one pulls in by half of it.
  // The stylesheet's --gp-shrink is the same number; the grid gap (--gp-gap) is
  // a separate knob that only has to match it by taste.
  shrinkVw: 5,
  // Must match --gp-arm. Cosmetic: the plus sign the iris starts from.
  armVw: 5,
  // Columns in the grid. The halves are split by `index % columns`.
  columns: 4,
  hoverDelay: 100,
  detailHold: 0.5,
  resizeDelay: 150
};

// How far the tiles the pane covers shift as they fade, in vw. Both signs are
// chosen so the group converges on the centre of its own 2x2 block.
const TILE_DRIFT_VW = 2.5;

// Zero area: every point sits on the pane's centre or on an edge midpoint, so the
// cover disappears completely. This is NOT "the full rectangle", which is the
// reading that turns the iris into a wipe and hides the picture at the end.
const COLLAPSED_CLIP = `polygon(
  50% 0%, 50% 0%, 50% 50%, 100% 50%,
  100% 50%, 50% 50%, 50% 100%, 50% 100%,
  50% 50%, 0% 50%, 0% 50%, 50% 50%
)`;

/** A 12 point plus sign, arms `x` and `y` percent of the pane's own box. */
function crossClip(x, y) {
  const l = 50 - x / 2;
  const r = 50 + x / 2;
  const t = 50 - y / 2;
  const b = 50 + y / 2;
  return `polygon(
    ${l}% 0%, ${r}% 0%, ${r}% ${t}%, 100% ${t}%,
    100% ${b}%, ${r}% ${b}%, ${r}% 100%, ${l}% 100%,
    ${l}% ${b}%, 0% ${b}%, 0% ${t}%, ${l}% ${t}%
  )`;
}

/** Resolves once every image has loaded or failed. */
export function preloadImages(images) {
  return Promise.all(
    Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    })
  );
}

/** Which half of the grid a tile sits in. */
function halfOf(tile, columns) {
  return Number(tile.dataset.index) % columns < columns / 2 ? "left" : "right";
}

function splitHalves(tiles, columns) {
  return tiles.reduce(
    (acc, tile) => {
      acc[halfOf(tile, columns)].push(tile);
      return acc;
    },
    { left: [], right: [] }
  );
}

/**
 * Builds one pane, filling it with the pictures of the tiles it will display.
 *
 * The pictures are copied from the tiles so that the tile list and the picture
 * list cannot drift apart; a tile's extra `data-detail` images come along and
 * become the pane's cross fading gallery.
 */
function createPane(modifier, tiles) {
  const pane = document.createElement("div");
  pane.className = `gp-preview gp-preview--${modifier}`;

  const images = document.createElement("div");
  images.className = "gp-preview__images";
  tiles.forEach(tile => {
    Array.from(tile.querySelectorAll("img")).forEach(source => {
      const src = source.getAttribute("src");
      if (!src) return;
      const copy = document.createElement("img");
      copy.dataset.id = tile.dataset.index;
      copy.src = src;
      copy.alt = "";
      const width = source.getAttribute("width");
      const height = source.getAttribute("height");
      if (width) copy.setAttribute("width", width);
      if (height) copy.setAttribute("height", height);
      images.appendChild(copy);
    });
  });

  const caption = document.createElement("div");
  caption.className = "gp-preview__caption";
  const title = document.createElement("p");
  title.className = "gp-preview__title";
  const meta = document.createElement("p");
  meta.className = "gp-preview__meta";
  caption.append(title, meta);

  // Painted last and therefore above the pictures: the part of it left after the
  // clip is what still covers them.
  const inside = document.createElement("div");
  inside.className = "gp-preview__inside";

  pane.append(images, caption, inside);
  return pane;
}

class Preview {
  constructor({ container, tiles, options }) {
    this.ui = {
      container,
      // The tiles this pane makes room for: the ones occupying the cells it
      // covers, i.e. the half it sits on.
      tiles,
      inside: container.querySelector(".gp-preview__inside"),
      title: container.querySelector(".gp-preview__title"),
      meta: container.querySelector(".gp-preview__meta"),
      images: Array.from(container.querySelectorAll(".gp-preview__images > img"))
    };
    this.options = options;
    this.imagesById = this.ui.images.reduce((acc, img) => {
      (acc[img.dataset.id] = acc[img.dataset.id] || []).push(img);
      return acc;
    }, {});
    this.timeline = null;
    this.gallery = null;
    this.isOpen = false;
    this.currentId = null;
  }

  build() {
    const box = this.ui.container.getBoundingClientRect();
    const vw = window.innerWidth / 100;

    // Percentages of the pane's own box, so the arms stay square on screen
    // whatever the pane's aspect happens to be.
    const armPx = this.options.armVw * vw;
    const armX = box.width ? (armPx / box.width) * 100 : 0;
    const armY = box.height ? (armPx / box.height) * 100 : 0;

    // Everything in the pane's width is vw except the single gap between its two
    // columns, so taking exactly one gap off the pane is what lands its edge on
    // the grid's outer edge instead of overhanging it.
    const widthInVw = box.width / vw;
    const heightInVw = box.height / vw;
    const scaleX = widthInVw ? (widthInVw - this.options.shrinkVw) / widthInVw : 1;
    const scaleY = heightInVw ? (heightInVw - this.options.shrinkVw) / heightInVw : 1;

    // kill() stops a timeline but leaves the inline styles it wrote on the DOM,
    // and a new timeline reads its start values from the DOM on first render.
    // Without this reset a rebuilt timeline tweens from the previous viewport's
    // numbers -- and its opacity tween runs 1 to 1, which leaves the pane stuck
    // open the next time the pointer leaves.
    this.resetStyles();

    if (this.timeline) this.timeline.kill();
    this.timeline = gsap
      .timeline({ paused: true, defaults: { ease: "power2.inOut" } })
      .addLabel("preview", 0)
      .addLabel("products", 0)
      .to(this.ui.container, { opacity: 1 }, "preview")
      .to(
        this.ui.container,
        { scaleX, scaleY, transformOrigin: "center center" },
        "preview"
      )
      .to(
        this.ui.tiles,
        {
          opacity: 0,
          x: i => (i % 2 === 0 ? `${TILE_DRIFT_VW}vw` : `-${TILE_DRIFT_VW}vw`),
          y: i => (i < 2 ? `${TILE_DRIFT_VW}vw` : `-${TILE_DRIFT_VW}vw`)
        },
        "products"
      )
      .fromTo(
        this.ui.inside,
        { clipPath: crossClip(armX, armY) },
        { clipPath: COLLAPSED_CLIP },
        "preview"
      );
  }

  resetStyles() {
    gsap.set(this.ui.container, {
      clearProps: "opacity,transform,scale,scaleX,scaleY,transformOrigin"
    });
    gsap.set(this.ui.tiles, { clearProps: "opacity,transform,x,y" });
    gsap.set(this.ui.inside, { clearProps: "clipPath" });
  }

  /** Pass a tile to open on it, or null to close. */
  setTile(tile) {
    if (this.gallery) {
      this.gallery.kill();
      this.gallery = null;
    }

    if (!tile) {
      this.isOpen = false;
      this.currentId = null;
      // Reverse rather than rebuild: that is why leaving never pops.
      this.timeline.reverse();
      return;
    }

    const id = tile.dataset.index;
    this.isOpen = true;
    this.currentId = id;
    this.ui.title.textContent = tile.dataset.title || "";
    this.ui.meta.textContent = tile.dataset.meta || "";

    const images = this.imagesById[id] || [];
    gsap.set(this.ui.images, { opacity: 0 });
    gsap.set(images, { opacity: 1 });

    this.timeline.play();
    this.startGallery(images);
  }

  /** Cross fades a tile's detail images. With one image there is nothing to do. */
  startGallery(images) {
    if (images.length < 2) return;
    const gallery = gsap.timeline({ repeat: -1 });
    images.forEach(image => {
      gallery
        .set(images, { opacity: 0 })
        .set(image, { opacity: 1 })
        .to(image, { duration: 0, opacity: 1 }, `+=${this.options.detailHold}`);
    });
    this.gallery = gallery;
  }

  /**
   * The arm widths are percentages of the pane and the scale is in vw, so every
   * number baked into the timeline is stale the moment the viewport changes.
   *
   * A resize must not close a pane the pointer is still resting on, and must not
   * animate either, so an open pane is snapped straight to the pose the new
   * viewport implies.
   */
  rebuild() {
    if (this.gallery) {
      this.gallery.kill();
      this.gallery = null;
    }
    const { isOpen, currentId } = this;
    this.build();
    if (!isOpen) return;
    this.timeline.progress(1);
    this.startGallery(this.imagesById[currentId] || []);
  }

  destroy() {
    if (this.timeline) this.timeline.kill();
    if (this.gallery) this.gallery.kill();
  }
}

export function createGridPreview(root, options = {}) {
  const settings = { ...DEFAULTS, ...options };
  const tiles = Array.from(root.querySelectorAll(".gp__tile"));
  if (!tiles.length) throw new Error("createGridPreview: no .gp__tile found");

  const halves = splitHalves(tiles, settings.columns);

  // A pane holds the pictures of the half it DISPLAYS, which is the half opposite
  // its own position: the pane sitting on the left shows the right half.
  const panes = {
    left: createPane("left", halves.right),
    right: createPane("right", halves.left)
  };

  const layer = document.createElement("div");
  layer.className = "gp__previews";
  layer.append(panes.left, panes.right);
  root.appendChild(layer);

  // Triggering on a left tile uses the RIGHT pane, and that pane makes room by
  // fading the tiles of the half it occupies.
  const leftPane = new Preview({
    container: panes.left,
    tiles: halves.left,
    options: settings
  });
  const rightPane = new Preview({
    container: panes.right,
    tiles: halves.right,
    options: settings
  });
  const paneFor = tile =>
    halfOf(tile, settings.columns) === "left" ? rightPane : leftPane;

  leftPane.build();
  rightPane.build();

  let pending = null;
  let active = null;

  function clearPending() {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
  }

  function onEnter(event) {
    const tile = event.currentTarget;
    // A pointer crossing a tile on its way somewhere else must not open the pane,
    // or it flashes.
    clearPending();
    pending = window.setTimeout(() => {
      pending = null;
      active = tile;
      paneFor(tile).setTile(tile);
    }, settings.hoverDelay);
  }

  function onLeave() {
    clearPending();
    if (!active) return;
    paneFor(active).setTile(null);
    active = null;
  }

  tiles.forEach(tile => {
    tile.addEventListener("mouseenter", onEnter);
    tile.addEventListener("mouseleave", onLeave);
  });

  let resizeTimer = null;
  function onResize() {
    if (resizeTimer !== null) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = null;
      leftPane.rebuild();
      rightPane.rebuild();
    }, settings.resizeDelay);
  }
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      clearPending();
      tiles.forEach(tile => {
        tile.removeEventListener("mouseenter", onEnter);
        tile.removeEventListener("mouseleave", onLeave);
      });
      window.removeEventListener("resize", onResize);
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      leftPane.destroy();
      rightPane.destroy();
      layer.remove();
    }
  };
}
