const createEleWithClass = (tag, className) => {
  const ele = document.createElement(tag);
  ele.className = className;
  return ele;
};

// Slides whose copy contains Chinese characters switch to the brush face,
// see .slide--cjk in css/styles.css.
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// A tap on "Read more" is a press that barely moves and lifts quickly; a
// press and drag is still the slideshow gesture.
const TAP_SLOP = 10; // px
const TAP_DURATION = 600; // ms

// The copy fades out while the sheet keeps rising: fully opaque as long as at
// least 45% of the screen is still visible above the sheet, gone once only
// 15% is left. Below the fade window the copy is also pushed off screen by
// the panel itself, which is why it can safely fade to nothing.
const COPY_FADE_FROM = 0.45;
const COPY_FADE_TO = 0.15;
// Height of the sheet's peek state, must match PEEK_RATIO in js/Sheet.js.
const PEEK_RATIO = 0.175;
// The copy trails the panel instead of being welded to it: each frame it
// closes this fraction of the remaining distance (time constant, seconds), so
// the text glides to the middle with a soft tail instead of stopping dead
// with the spring. The tail is what makes the copy read as the third beat.
const FOLLOW_TAU = 0.12;
// Head start for the other two beats: the copy only starts moving once the
// photo has begun to recede and the glass has begun to frost.
const COPY_LAG = 0.12;
const FOLLOW_SETTLED = 0.2; // px
const FOLLOW_SETTLED_OPACITY = 0.004;

class Slides {
  constructor(data, options = {}) {
    this.data = data;
    this.options = options;
    this.container = createEleWithClass("div", "slides");
    this.currentIdx = 0;
    // { index, slide, copy, restRect, target, current, raf } while a sheet is
    // open.
    this.reading = null;
    this.tickReading = this.tickReading.bind(this);
    this.slides = this.data.map((entry, index) => {
      const slide = createEleWithClass("div", "slide");
      const copy = createEleWithClass("div", "slide-copy");
      const title = createEleWithClass("h1", "slide-title");
      const meta = createEleWithClass("p", "slide-meta");
      // A button, not a link: it opens the sheet in place and keyboard
      // activation (Enter / Space) comes for free.
      const more = createEleWithClass("button", "slide-more");
      more.type = "button";
      slide.classList.add(index !== 0 ? "next" : "show-meta");
      if (CJK.test(entry.title) || CJK.test(entry.meta)) {
        slide.classList.add("slide--cjk");
      }
      meta.innerHTML = entry.meta;
      title.innerHTML = entry.title;
      more.innerHTML = 'Read more';
      copy.appendChild(meta);
      copy.appendChild(title);
      slide.appendChild(copy);
      slide.appendChild(more);
      this.container.appendChild(slide);

      this.bindReadMore(more, index);
      return slide;
    });
  }
  bindReadMore(more, index) {
    const open = () => {
      if (this.options.onReadMore) {
        this.options.onReadMore(index, more);
      }
    };

    // Pointer events cover mouse, touch and pen at once, and unlike click
    // they still fire on touch where the slideshow's grab handler calls
    // preventDefault() on touchstart for everything outside the sheet.
    let press = null;
    more.addEventListener("pointerdown", ev => {
      press = {
        x: ev.clientX,
        y: ev.clientY,
        t: performance.now(),
        id: ev.pointerId
      };
    });
    more.addEventListener("pointerup", ev => {
      const start = press;
      press = null;
      if (!start || start.id !== ev.pointerId) return;
      const distance = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
      const elapsed = performance.now() - start.t;
      if (distance <= TAP_SLOP && elapsed <= TAP_DURATION) open();
    });
    more.addEventListener("pointercancel", () => {
      press = null;
    });
    // Keyboard activation, and a safety net for browsers that swallow
    // pointerup. Sheet.open() is idempotent, so a repeat is harmless.
    more.addEventListener("click", open);
  }
  mount(container) {
    container.appendChild(this.container);
  }
  onActiveIndexChange(activeIndex) {
    this.currentIdx = activeIndex;
    for (let i = 0; i < this.slides.length; i++) {
      if (activeIndex === i) {
        this.slides[i].classList.remove("next");
        this.slides[i].classList.remove("prev");
      } else {
        if (activeIndex > i) {
          this.slides[i].classList.remove("next");
          this.slides[i].classList.add("prev");
        } else {
          this.slides[i].classList.add("next");
          this.slides[i].classList.remove("prev");
        }
      }
    }
  }
  onMove(indexFloat) {
    this.container.style.transform = `translateY(${(indexFloat * 100) /
      this.slides.length}%)`;
  }
  /* -------------------------------------------------- reading the sheet */

  beginReading(index) {
    const slide = this.slides[index];
    if (!slide) return;
    this.endReading();
    this.reading = {
      index,
      slide,
      copy: slide.querySelector(".slide-copy"),
      restRect: null,
      // Where the copy should end up, and where it currently is, both as
      // offsets from its resting spot.
      target: null,
      current: null,
      raf: null,
      lastTime: 0
    };
    slide.classList.add("is-reading");
    // Lets css fade the phone's bottom scrim out from behind the glass pane.
    document.body.classList.add("is-reading");
    this.measureReading();
  }
  // Resting position of the copy, measured with every transform cleared so
  // the centre point stays correct across resizes.
  measureReading() {
    if (!this.reading) return;
    const copy = this.reading.copy;
    const transform = copy.style.transform;
    const opacity = copy.style.opacity;
    copy.style.transform = "";
    copy.style.opacity = "";
    this.reading.restRect = copy.getBoundingClientRect();
    copy.style.transform = transform;
    copy.style.opacity = opacity;
  }
  // Driven every frame by the sheet; `sheetTop` is the top edge of the panel
  // in viewport pixels. Only the target is set here -- tickReading() eases the
  // copy towards it, which keeps the motion smooth even though the sheet's
  // spring, a drag and a resize all push very different numbers in.
  setReading(sheetTop) {
    const reading = this.reading;
    if (!reading || !reading.restRect) return;

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const rect = reading.restRect;

    // 0 while the sheet is still off screen, 1 once it reaches its peek height;
    // clamped so dragging higher keeps the copy parked (and fading). Remapped
    // so the copy leaves a beat after the panel does.
    const openness = clamp(
      (clamp((vh - sheetTop) / (PEEK_RATIO * vh), 0, 1) - COPY_LAG) /
        (1 - COPY_LAG),
      0,
      1
    );
    // Share of the screen still visible above the panel: 1 while closed,
    // 0.825 at the peek state, 0 when the panel fills the screen.
    const strip = clamp(sheetTop / vh, 0, 1);
    const opacity = clamp(
      (strip - COPY_FADE_TO) / (COPY_FADE_FROM - COPY_FADE_TO),
      0,
      1
    );

    const dx = (vw / 2 - (rect.left + rect.width / 2)) * openness;
    const dy = (sheetTop / 2 - (rect.top + rect.height / 2)) * openness;

    if (!reading.current) {
      // Starts from the resting spot, which is exactly transform: none.
      reading.current = { dx: 0, dy: 0, opacity: 1 };
      reading.copy.style.opacity = "1";
    }
    reading.target = { dx, dy, opacity };

    if (reading.raf == null) {
      reading.lastTime = performance.now();
      reading.raf = requestAnimationFrame(this.tickReading);
    }
  }
  // Exponential follower: frame rate independent, and it keeps converging for
  // a moment after the sheet stops moving, so there is never a hard stop.
  tickReading(now) {
    const reading = this.reading;
    if (!reading || !reading.target || !reading.current) {
      if (reading) reading.raf = null;
      return;
    }

    const dt = Math.min(64, Math.max(1, now - reading.lastTime)) / 1000;
    reading.lastTime = now;
    const k = 1 - Math.exp(-dt / FOLLOW_TAU);

    const current = reading.current;
    const target = reading.target;
    current.dx += (target.dx - current.dx) * k;
    current.dy += (target.dy - current.dy) * k;
    current.opacity += (target.opacity - current.opacity) * k;

    const settled =
      Math.abs(target.dx - current.dx) < FOLLOW_SETTLED &&
      Math.abs(target.dy - current.dy) < FOLLOW_SETTLED &&
      Math.abs(target.opacity - current.opacity) < FOLLOW_SETTLED_OPACITY;
    if (settled) {
      current.dx = target.dx;
      current.dy = target.dy;
      current.opacity = target.opacity;
    }

    reading.copy.style.transform =
      `translate3d(${current.dx.toFixed(2)}px, ${current.dy.toFixed(2)}px, 0)`;
    reading.copy.style.opacity = current.opacity.toFixed(3);

    reading.raf = settled ? null : requestAnimationFrame(this.tickReading);
  }
  endReading() {
    if (!this.reading) return;
    const reading = this.reading;
    if (reading.raf != null) cancelAnimationFrame(reading.raf);
    reading.copy.style.transform = "";
    reading.copy.style.opacity = "";
    reading.slide.classList.remove("is-reading");
    document.body.classList.remove("is-reading");
    this.reading = null;
  }
  focusReadMore(index) {
    const slide = this.slides[index];
    if (!slide) return;
    const more = slide.querySelector(".slide-more");
    if (more) more.focus({
      preventScroll: true
    });
  }
  appear() {
    this.container.classList.add("scrolling");
    this.slides[this.currentIdx].classList.remove("show-meta");
  }
  disperse(activeIndex) {
    //this.currentIdx = activeIndex;
    this.slides[this.currentIdx].classList.add("show-meta");
    this.container.classList.remove("scrolling");
    for (let index = 0; index < this.data.length; index++) {
      if (index > activeIndex) {
        this.slides[index].classList.add("next");
        this.slides[index].classList.remove("prev");
      } else if (index < activeIndex) {
        this.slides[index].classList.remove("next");
        this.slides[index].classList.add("prev");
      } else {
        this.slides[index].classList.remove("next");
        this.slides[index].classList.remove("prev");
      }
    }
  }
}

export {
  Slides
};
