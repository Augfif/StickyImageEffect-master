import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

import { Cursor } from "../Cursor.js";
import { introBeats, introCopy } from "./beats.js";
import { createIntroScene } from "./scene.js";
import {
  buildTextLayer,
  splitTexts,
  heroTimeline,
  heroExitTimeline,
  beatTimeline
} from "./text.js";
import { createProgress } from "./progress.js";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// Same escape hatch as the slideshow: `/?motion=full` plays the long version
// on a machine that reports "reduce".
const reducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !new URLSearchParams(window.location.search).has("motion");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// --- dom ------------------------------------------------------------------

const canvas = document.getElementById("intro-canvas");
const textLayer = document.getElementById("intro-text");
const hint = document.getElementById("intro-hint");
const startBtn = document.getElementById("intro-start");
const skipBtn = document.getElementById("intro-skip");
const loader = document.getElementById("intro-loader");
const curtain = document.getElementById("intro-curtain");
const scrollEl = document.getElementById("intro-scroll");

document.getElementById("intro-hint-label").textContent = introCopy.scrollHint;
document.getElementById("intro-start-label").textContent = introCopy.cta;
document.getElementById("intro-start-hint").textContent = introCopy.ctaHint;
skipBtn.textContent = introCopy.skip;

// Same ring the slideshow draws, and base.css already hides the native one.
new Cursor(document.querySelector(".cursor"));

const scene = createIntroScene(canvas, introBeats, { reduced: reducedMotion });
const progress = createProgress({
  fill: document.getElementById("intro-progress-fill"),
  value: document.getElementById("intro-progress-value")
});
const layer = buildTextLayer(textLayer, introBeats, introCopy);

// One screen of scroll per beat, plus a screen and a bit for the opening move.
scrollEl.style.height = `${introBeats.length * 92 + 70}svh`;

// --- timeline maths -------------------------------------------------------

const beatCount = introBeats.length;
// The opening move owns the first slice of the scroll, the beats share the
// rest; both the camera and the copy use these two numbers so they stay in
// step.
const HERO_SHARE = 0.05;
const SPAN = 1 - HERO_SHARE;
const centerFor = index => HERO_SHARE + (index / (beatCount - 1)) * SPAN;
const halfWindow = SPAN / (beatCount - 1) / 2;
const cameraProgress = p => clamp((p - HERO_SHARE) / SPAN, 0, 1);

let smoother = null;
let splits = null;

function lockScroll(locked) {
  // Before the smoother exists the lock is plain css; once it is running the
  // plugin owns the scroll and pausing it is enough.
  if (smoother) smoother.paused(locked);
  document.documentElement.classList.toggle("intro-locked", locked && !smoother);
}

function enterSite() {
  curtain.classList.add("is-on");
  window.setTimeout(() => {
    window.location.href = "main.html";
  }, 420);
}

startBtn.addEventListener("click", enterSite);
skipBtn.addEventListener("click", enterSite);

window.addEventListener("resize", () => scene.resize());
window.addEventListener("keydown", event => {
  if (event.key === "Enter" && startBtn.classList.contains("is-visible")) {
    enterSite();
  }
});

// --- wiring ---------------------------------------------------------------

function wireScroll() {
  if (!reducedMotion) {
    smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 0.72,
      effects: false,
      smoothTouch: 0.1
    });
    smoother.scrollTop(0);
    // Measuring is done; hand the scroll back to the plugin, still paused
    // until the opening move finishes.
    document.documentElement.classList.remove("intro-locked");
    smoother.paused(true);
  }

  splits = splitTexts(layer);
  heroExitTimeline(layer.hero.el, splits.heroChars, scrollEl);

  layer.blocks.forEach((block, index) => {
    if (!block) return;
    const center = centerFor(index);
    beatTimeline(
      splits.beatChars[index],
      scrollEl,
      (center - halfWindow) * 100,
      (center + halfWindow) * 100
    );
  });

  ScrollTrigger.create({
    trigger: scrollEl,
    start: "top top",
    end: "bottom bottom",
    onUpdate: self => {
      const p = self.progress;
      scene.setProgress(cameraProgress(p));
      progress.set(p);
      startBtn.classList.toggle("is-visible", p > 0.965);
      hint.classList.toggle("is-gone", p > 0.02);
    }
  });
}

function runOpening() {
  const blend = { value: 1 };
  const duration = reducedMotion ? 0.5 : 3.4;
  const tl = gsap.timeline();

  tl.to(
    blend,
    {
      value: 0,
      duration,
      ease: "power2.inOut",
      onUpdate: () => scene.setIntroBlend(blend.value)
    },
    0
  );
  tl.add(heroTimeline(splits.heroChars, reducedMotion ? 0.05 : 0.6), 0);
  tl.call(
    () => {
      lockScroll(false);
      hint.classList.add("is-visible");
    },
    null,
    Math.max(0.2, duration - 0.25)
  );
}

async function boot() {
  lockScroll(true);
  scene.setProgress(0);
  scene.setIntroBlend(1);
  scene.start();

  await scene.load();
  // Let the loader animation finish its arc before the opening move.
  await new Promise(resolve =>
    window.setTimeout(resolve, reducedMotion ? 120 : 900)
  );

  loader.classList.add("is-gone");
  wireScroll();
  runOpening();

  gsap.delayedCall(reducedMotion ? 0.4 : 1.6, () =>
    skipBtn.classList.add("is-visible")
  );
}

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);
boot();
