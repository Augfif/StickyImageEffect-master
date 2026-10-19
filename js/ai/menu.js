import { gsap } from "gsap";

/**
 * Hover-revealed image list, after Codrops' Rapid Image Hover Menu
 * (https://github.com/codrops/RapidImageHoverMenu, MIT).
 *
 * The reference is hover only: on a touch device it draws a text menu and no
 * pictures at all. Here the pictures matter more than the menu does, so the
 * reveal is an *enhancement*: only pointers that can actually hover get it,
 * everyone else keeps the inline thumbnails the stylesheet shows them.
 *
 * How it works:
 *   - each row owns a hidden `.pl__reveal` box with its own picture;
 *   - entering slides the picture in from the side the pointer came from
 *     (two layers moving in opposite directions under an overflow mask);
 *   - while the pointer stays, a rAF loop eases the box towards the cursor and
 *     adds rotation / brightness from the pointer's speed;
 *   - leaving slides it back out the same way.
 */

// Tuning. The reference uses 0.2s / ±60° / brightness 4; the dark room here
// wants a quieter version of the same gesture, so the two extremes come down.
const WIPE_DURATION = 0.2;
const WIPE_EASE = "sine.out";
const FOLLOW = 0.08; // fraction of the remaining distance closed per frame
const SPEED_MAX = 100; // px per frame that counts as "full speed"
const ROTATION_MAX = 25; // degrees
const BRIGHTNESS_MAX = 1.6;
const REDUCED_FADE = 0.15; // seconds, used instead of the wipe
const RAISED_Z = 10;
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const map = (x, a, b, c, d) => ((x - a) * (d - c)) / (b - a) + c;
const lerp = (a, b, n) => (1 - n) * a + n * b;
const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The pointer position is shared by every row: only one row is ever told to
 * follow it, and keeping a single cache is what makes the wipe direction stay
 * consistent when the pointer slides from one row straight into the next.
 */
const pointer = { x: 0, y: 0 };
let pointerDelta = 0; // consumed once per frame, so a resting pointer calms down
let lastPointerX = 0;
let direction = 1; // +1: entering from the right, -1: from the left
let directionKnown = false;

window.addEventListener(
  "pointermove",
  event => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (directionKnown) {
      pointerDelta += lastPointerX - event.clientX;
      if (event.clientX !== lastPointerX) {
        direction = event.clientX > lastPointerX ? 1 : -1;
      }
    }
    lastPointerX = event.clientX;
    directionKnown = true;
  },
  { passive: true }
);

const hoverMedia = window.matchMedia(HOVER_QUERY);
let canHover = hoverMedia.matches;

/** Resolves once every picture has loaded or failed. */
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

class MenuRow {
  constructor(link) {
    this.link = link;
    this.row = link.closest(".pl__row") || link;
    this.source = link.dataset.image;
    this.frame = null;
    this.tween = null;
    this.visible = false;
    this.anchor = null; // "focus" while the row is reached by keyboard
    // Reduced motion keeps the picture parked at the row's right instead of
    // following the pointer; without the follow loop a pointer-tracked pose
    // would be whatever position the pointer had when the row was entered.
    this.staticPose = false;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.rotation = 0;
    this.brightness = 1;
    this.build();
    this.bind();
  }

  build() {
    const reveal = document.createElement("div");
    reveal.className = "pl__reveal";
    reveal.setAttribute("aria-hidden", "true");

    const inner = document.createElement("div");
    inner.className = "pl__reveal-inner";
    const image = document.createElement("div");
    image.className = "pl__reveal-img";
    image.style.backgroundImage = `url("${this.source}")`;

    inner.append(image);
    reveal.append(inner);
    this.link.append(reveal);

    this.reveal = reveal;
    this.inner = inner;
    this.image = image;
  }

  bind() {
    this.onEnter = () => {
      if (!canHover) return;
      this.anchor = null;
      this.show();
    };
    this.onLeave = () => {
      if (!canHover) return;
      this.hide();
    };
    // A mouse click also focuses the link; only a keyboard focus should park
    // the picture at the row's right edge.
    this.onFocus = () => {
      if (!canHover) return;
      if (!this.link.matches(":focus-visible")) return;
      this.anchor = "focus";
      this.show();
    };
    this.onBlur = () => {
      if (!canHover) return;
      this.hide();
    };

    this.link.addEventListener("pointerenter", this.onEnter);
    this.link.addEventListener("pointerleave", this.onLeave);
    this.link.addEventListener("focus", this.onFocus);
    this.link.addEventListener("blur", this.onBlur);
  }

  /** Centres the picture on the pointer (or on the row, for keyboard focus). */
  measure() {
    const width = this.reveal.offsetWidth;
    const height = this.reveal.offsetHeight;
    const rect = this.link.getBoundingClientRect();

    if (this.anchor === "focus" || this.staticPose) {
      this.targetX = rect.width * 0.62 - width / 2;
      this.targetY = rect.height / 2 - height / 2;
      return;
    }

    this.targetX = pointer.x - rect.left - width / 2;
    this.targetY = pointer.y - rect.top - height / 2;
  }

  applyPose() {
    gsap.set(this.reveal, {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      filter: `brightness(${this.brightness.toFixed(3)})`
    });
  }

  show() {
    this.visible = true;
    if (this.tween) this.tween.kill();
    gsap.set(this.row, { zIndex: RAISED_Z });

    this.staticPose = prefersReducedMotion();
    // Back into layout before measuring: display: none reports a zero box.
    this.reveal.style.display = "block";
    this.measure();
    this.x = this.targetX;
    this.y = this.targetY;
    this.rotation = 0;
    this.brightness = 1;
    this.applyPose();
    this.reveal.style.opacity = "1";

    if (this.staticPose) {
      this.tween = gsap.fromTo(
        this.reveal,
        { opacity: 0 },
        { opacity: 1, duration: REDUCED_FADE, ease: WIPE_EASE }
      );
      return;
    }

    // The two layers travel in opposite directions inside a hidden-overflow
    // mask, which reads as the picture being wiped in rather than sliding.
    this.tween = gsap
      .timeline()
      .fromTo(
        this.inner,
        { xPercent: direction * 100 },
        { xPercent: 0, duration: WIPE_DURATION, ease: WIPE_EASE },
        0
      )
      .fromTo(
        this.image,
        { xPercent: -direction * 100 },
        { xPercent: 0, duration: WIPE_DURATION, ease: WIPE_EASE },
        0
      );

    this.loop();
  }

  hide() {
    if (!this.reveal) return;
    this.visible = false;
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    if (this.tween) this.tween.kill();
    gsap.set(this.row, { zIndex: 1 });
    this.anchor = null;

    const settle = () => {
      this.reveal.style.opacity = "0";
      this.reveal.style.display = "none";
    };

    if (this.staticPose) {
      this.tween = gsap.to(this.reveal, {
        opacity: 0,
        duration: REDUCED_FADE,
        ease: WIPE_EASE,
        onComplete: settle
      });
      return;
    }

    this.tween = gsap
      .timeline({ onComplete: settle })
      .to(
        this.inner,
        { xPercent: -direction * 100, duration: WIPE_DURATION, ease: WIPE_EASE },
        0
      )
      .to(
        this.image,
        { xPercent: direction * 100, duration: WIPE_DURATION, ease: WIPE_EASE },
        0
      );
  }

  loop() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => this.render());
  }

  render() {
    this.frame = null;
    if (!this.visible) return;

    // One frame's worth of movement, then forget it: a pointer that stops
    // moving has to let go of the rotation instead of freezing it.
    const delta = pointerDelta;
    pointerDelta = 0;

    this.measure();
    this.x = lerp(this.x, this.targetX, FOLLOW);
    this.y = lerp(this.y, this.targetY, FOLLOW);

    const speed = clamp(Math.abs(delta), 0, SPEED_MAX);
    const tilt = this.anchor === "focus" ? 0 : map(speed, 0, SPEED_MAX, 0, delta < 0 ? ROTATION_MAX : -ROTATION_MAX);
    const glow = this.anchor === "focus" ? 1 : map(speed, 0, SPEED_MAX, 1, BRIGHTNESS_MAX);
    this.rotation = lerp(this.rotation, tilt, FOLLOW);
    this.brightness = lerp(this.brightness, glow, FOLLOW);

    this.applyPose();
    this.loop();
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.tween) this.tween.kill();
    this.link.removeEventListener("pointerenter", this.onEnter);
    this.link.removeEventListener("pointerleave", this.onLeave);
    this.link.removeEventListener("focus", this.onFocus);
    this.link.removeEventListener("blur", this.onBlur);
    this.reveal.remove();
  }
}

export function createPatternMenu(root) {
  const rows = Array.from(root.querySelectorAll(".pl__item"))
    .filter(link => link.dataset.image)
    .map(link => new MenuRow(link));

  const onModeChange = event => {
    canHover = event.matches;
    if (!canHover) rows.forEach(row => row.hide());
  };
  hoverMedia.addEventListener("change", onModeChange);

  return {
    destroy() {
      hoverMedia.removeEventListener("change", onModeChange);
      rows.forEach(row => row.destroy());
    }
  };
}
