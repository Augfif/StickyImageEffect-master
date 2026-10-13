import {
  spring
} from "popmotion";

// Fraction of the viewport height the sheet shows right after it opens.
const PEEK_RATIO = 0.175;
// Releasing the drag keeps the original feel: slightly under damped, no
// snapping and no extra inertia, the velocity is handed straight to the
// spring so the panel eases to a stop right where the finger let go.
const RELEASE_SPRING = {
  stiffness: 300,
  damping: 30,
  mass: 1,
  restSpeed: 0.5,
  restDelta: 0.5
};
// Opening and closing are the first beat of a three beat move (photo recedes,
// glass frosts, copy follows), so they are deliberately slower and softer than
// a release.
const OPEN_SPRING = {
  stiffness: 170,
  damping: 24,
  mass: 1,
  restSpeed: 0.5,
  restDelta: 0.5
};
// Reduced motion swaps the spring for a short, gently eased move.
const REDUCED_MOTION_MS = 300;
// The close button floats just above the seam, on the photo side, like the
// ultranoir project page. CLOSE_INSET is how close to the top of the screen it
// is allowed to end up before it stops following the seam and parks instead.
const CLOSE_GAP = 36;
const CLOSE_INSET = 24;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Honours the os / browser preference, with an explicit escape hatch for
// previewing the full length move on a machine that reports "reduce":
//   main.html?motion=full
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !new URLSearchParams(window.location.search).has("motion");

/**
 * White content layer holding a slide's long copy.
 *
 * Not a dialog: the photo keeps its full brightness and this block simply
 * continues below it, meeting it at a seam that carries the close button.
 * It is anchored to the bottom of the viewport and driven by a single
 * translateY value, so "how much of it is on screen" is always one number:
 *
 *   y = closedY     the whole panel sits below the viewport
 *   y = collapsedY  the peek state, 17.5vh of white visible at the bottom
 *   y = expandedY   the top edge is at the top of the screen, photo covered
 *
 * The panel grows with its content (min-height is one viewport), so a long
 * article can be revealed by dragging the same single layer up.
 */
class Sheet {
  constructor({
    data = [],
    onOpen,
    onResize,
    onApply,
    onClose
  } = {}) {
    this.data = data;
    this.onOpen = onOpen;
    this.onResize = onResize;
    this.onApply = onApply;
    this.onClose = onClose;

    this.isOpen = false;
    this.index = -1;
    this.y = 0;
    this.motion = null;
    this.drag = null;
    this.rafId = 0;

    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    this.panelH = this.vh;
    this.peek = PEEK_RATIO * this.vh;
    this.closedY = this.panelH;
    this.collapsedY = this.panelH - this.peek;
    this.expandedY = 0;

    this.build();

    this.onWindowResize = this.onWindowResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onCloseClick = this.onCloseClick.bind(this);
  }

  /* ---------------------------------------------------------------- DOM */

  build() {
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    // Not a modal: the panel is the picture's own content layer continuing
    // below the photo, so it stays a plain labelled region.
    sheet.setAttribute("role", "region");
    sheet.setAttribute("aria-label", "介绍");
    sheet.setAttribute("aria-hidden", "true");

    const close = document.createElement("button");
    close.className = "sheet__close";
    close.type = "button";
    close.setAttribute("aria-label", "关闭介绍");

    const body = document.createElement("div");
    body.className = "sheet__body";

    const title = document.createElement("h2");
    title.className = "sheet__title";
    // Placeholder headline, replaced by real copy later.
    title.textContent = "介绍";

    const content = document.createElement("div");
    content.className = "sheet__content";
    content.hidden = true;

    body.appendChild(title);
    body.appendChild(content);
    sheet.appendChild(close);
    sheet.appendChild(body);

    this.sheet = sheet;
    this.closeButton = close;
    this.content = content;
  }

  mount(container) {
    container.appendChild(this.sheet);

    this.closeButton.addEventListener("click", this.onCloseClick);
    this.sheet.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("resize", this.onWindowResize);
    window.addEventListener("orientationchange", this.onWindowResize);
  }

  /* ----------------------------------------------------------- geometry */

  // Current top edge of the panel, in viewport pixels: vh while closed,
  // 0.65vh at the peek state and 0 once it fills the screen.
  get sheetTop() {
    return this.vh - this.panelH + this.y;
  }

  measure() {
    this.vw = window.innerWidth;
    this.vh = window.innerHeight;
    // min-height in css is one viewport, but round the measurement up so a
    // sub pixel layout never leaves a hairline of photo under the panel.
    this.panelH = Math.max(this.sheet.offsetHeight, this.vh);
    this.peek = PEEK_RATIO * this.vh;
    this.closedY = this.panelH;
    this.collapsedY = this.panelH - this.peek;
    this.expandedY = Math.max(0, this.panelH - this.vh);
    if (this.collapsedY < this.expandedY) this.collapsedY = this.expandedY;
  }

  applyY(y) {
    this.y = y;
    this.sheet.style.transform = `translateY(${y}px)`;
    // The close button sits on the seam between the photo and the panel, so
    // it rides the panel's top edge -- CLOSE_GAP above it, on the photo side.
    // Once the seam reaches the top of the screen it parks just inside it
    // instead of sliding out of view, and flips to dark because it is over
    // the white panel by then.
    const seam = this.sheetTop;
    this.closeButton.classList.toggle("is-parked", seam < CLOSE_INSET);
    this.closeButton.style.top = `${Math.max(-CLOSE_GAP, CLOSE_INSET - seam)}px`;
    if (this.onApply) {
      this.onApply({
        sheetTop: seam,
        // 0 while the panel is still below the viewport, 1 once it reaches the
        // peek height. Drives the photo recede and, with a delay, the copy.
        openness: clamp((this.vh - seam) / this.peek, 0, 1),
        viewportHeight: this.vh,
        viewportWidth: this.vw
      });
    }
  }

  /* ------------------------------------------------------------ motion */

  stopMotion() {
    if (this.motion) {
      this.motion.stop();
      this.motion = null;
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  moveTo(target, {
    velocity = 0,
    onComplete,
    profile = RELEASE_SPRING
  } = {}) {
    this.stopMotion();

    if (prefersReducedMotion()) {
      this.transitionTo(target, onComplete);
      return;
    }

    this.motion = spring({
      from: this.y,
      to: target,
      velocity,
      ...profile
    }).start({
      update: value => this.applyY(value),
      complete: () => {
        this.motion = null;
        this.applyY(target);
        if (onComplete) onComplete();
      }
    });
  }

  // Reduced motion: no spring, but still stepped frame by frame. Everything
  // hanging off this position -- the photo recede, the copy, the cross -- has
  // to keep being fed, otherwise the whole move collapses into one snap.
  transitionTo(target, onComplete) {
    const from = this.y;
    const started = performance.now();

    const step = now => {
      const t = Math.min(1, (now - started) / REDUCED_MOTION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      this.applyY(from + (target - from) * eased);
      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
        return;
      }
      this.rafId = 0;
      this.applyY(target);
      if (onComplete) onComplete();
    };

    this.rafId = requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------- content */

  // `detail` is the future hook for real article copy: an HTML string per
  // slide entry. Nothing is written into it yet.
  setContent(entry) {
    const detail = entry && entry.detail ? entry.detail : "";
    this.content.innerHTML = detail;
    this.content.hidden = !detail;
    const label = entry && entry.title ? `${entry.title} 介绍` : "介绍";
    this.sheet.setAttribute("aria-label", label);
  }

  /* ---------------------------------------------------------- lifecycle */

  open(index) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.index = index;
    this.stopMotion();

    this.setContent(this.data[index]);
    this.measure();
    // Park it below the viewport first so the glide always starts from
    // off-screen instead of wherever it was left.
    this.applyY(this.closedY);

    this.sheet.setAttribute("aria-hidden", "false");
    this.sheet.classList.add("is-visible");
    // Flush layout between revealing the pane and frosting it. Adding both
    // classes in one recalc would hand the browser a single style change with
    // visibility flipping at the same time, and the blur would arrive already
    // finished instead of ramping up.
    void this.sheet.offsetHeight;
    this.sheet.classList.add("is-open");

    // Hands the copy its reference position before any transform is applied.
    if (this.onOpen) this.onOpen(index);

    this.moveTo(this.collapsedY, { profile: OPEN_SPRING });

    requestAnimationFrame(() => this.closeButton.focus());
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.stopMotion();

    this.sheet.classList.remove("is-open");

    // The copy keeps being driven by onApply while the panel falls, so it
    // glides home together with the sheet; onClose only runs once it has
    // landed and the inline styles can be handed back to css.
    this.moveTo(this.closedY, {
      profile: OPEN_SPRING,
      onComplete: () => {
        this.sheet.classList.remove("is-visible");
        this.sheet.setAttribute("aria-hidden", "true");
        if (document.activeElement === this.closeButton) {
          this.closeButton.blur();
        }
        if (this.onClose) this.onClose(this.index);
      }
    });
  }

  onCloseClick() {
    this.close();
  }

  onWindowResize() {
    if (!this.isOpen) return;
    this.measure();
    // Let the copy re-measure its resting rect with the transform cleared
    // before the fresh geometry is applied to it.
    if (this.onResize) this.onResize();
    this.applyY(clamp(this.y, this.expandedY, this.collapsedY));
  }

  /* -------------------------------------------------------------- drag */

  onPointerDown(ev) {
    if (!this.isOpen || this.drag) return;
    if (ev.button > 0) return;
    if (ev.target && ev.target.closest && ev.target.closest(".sheet__close")) {
      return;
    }

    this.stopMotion();

    this.drag = {
      id: ev.pointerId,
      startY: ev.clientY,
      y: this.y,
      lastY: ev.clientY,
      lastT: performance.now(),
      velocity: 0
    };
    this.sheet.classList.add("is-dragging");
    try {
      this.sheet.setPointerCapture(ev.pointerId);
    } catch (err) {
      /* pointer capture is a nicety, the window listeners still track it */
    }
  }

  onPointerMove(ev) {
    const drag = this.drag;
    if (!drag || ev.pointerId !== drag.id) return;

    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      drag.velocity = ((ev.clientY - drag.lastY) / dt) * 1000;
      drag.lastY = ev.clientY;
      drag.lastT = now;
    }

    // Free drag between the two ends, no snapping anywhere in between.
    this.applyY(clamp(drag.y + (ev.clientY - drag.startY),
      this.expandedY,
      this.collapsedY
    ));
  }

  onPointerUp(ev) {
    const drag = this.drag;
    if (!drag || ev.pointerId !== drag.id) return;

    this.drag = null;
    this.sheet.classList.remove("is-dragging");
    try {
      this.sheet.releasePointerCapture(ev.pointerId);
    } catch (err) {
      /* never captured */
    }

    // A pointer that sat still before lifting should not fling the panel.
    const idleFor = performance.now() - drag.lastT;
    const velocity = idleFor > 120 ? 0 : drag.velocity;
    this.moveTo(this.y, {
      velocity
    });
  }
}

export {
  Sheet
};
