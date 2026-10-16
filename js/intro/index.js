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

const params = new URLSearchParams(window.location.search);
// Same escape hatch as the slideshow: `/?motion=full` plays the long version
// on a machine that reports "reduce".
const reducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !params.has("motion");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// `?at=end` boots straight onto the two doors. The AI page sends the reader
// back here, and replaying the whole opening move just to reach a pair of
// buttons they have already seen would waste their time.
const atEnd = params.get("at") === "end";

// --- dom ------------------------------------------------------------------

const canvas = document.getElementById("intro-canvas");
const textLayer = document.getElementById("intro-text");
const hint = document.getElementById("intro-hint");
const actions = document.getElementById("intro-actions");
const mainBtn = document.getElementById("intro-action-main");
const aiBtn = document.getElementById("intro-action-ai");
const skipBtn = document.getElementById("intro-skip");
const loader = document.getElementById("intro-loader");
const curtain = document.getElementById("intro-curtain");
const scrollEl = document.getElementById("intro-scroll");

// Where the two doors lead. Both pages are only ever reached from here, so the
// urls live in one place.
const ROUTES = {
  main: "main.html",
  ai: "ai.html"
};

document.getElementById("intro-hint-label").textContent = introCopy.scrollHint;
// innerHTML, not textContent: a label may carry the `.latin` span that sizes
// latin runs down to the brush face, see the comment on introCopy.actions.
document.getElementById("intro-action-main-label").innerHTML =
  introCopy.actions.main.label;
document.getElementById("intro-action-main-hint").textContent =
  introCopy.actions.main.hint;
document.getElementById("intro-action-ai-label").innerHTML =
  introCopy.actions.ai.label;
document.getElementById("intro-action-ai-hint").textContent =
  introCopy.actions.ai.hint;
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
// Set once the opening move has handed the scroll back. The skip button can
// only be shown from then on, or it would be clickable while the scroll it
// drives is still locked.
let scrollReady = false;

// Faded out is not the same as unreachable: the doors sit in the dom from the
// first frame, so without this a reader tabbing through the opener would land
// on two invisible buttons. With a single button that was untidy, with two it
// is two stops on nothing.
function setReachable(element, reachable) {
  element.tabIndex = reachable ? 0 : -1;
}

function revealActions(visible) {
  actions.classList.toggle("is-visible", visible);
  setReachable(mainBtn, visible);
  setReachable(aiBtn, visible);
}

function revealSkip(visible) {
  skipBtn.classList.toggle("is-visible", visible);
  setReachable(skipBtn, visible);
}

function lockScroll(locked) {
  // Before the smoother exists the lock is plain css; once it is running the
  // plugin owns the scroll and pausing it is enough.
  if (smoother) smoother.paused(locked);
  document.documentElement.classList.toggle("intro-locked", locked && !smoother);
}

function enterSite(url) {
  curtain.classList.add("is-on");
  window.setTimeout(() => {
    window.location.href = url;
  }, 420);
}

// Distance to the end of the opener, in the same units ScrollSmoother clamps
// its own scrollTop against, so ask ScrollTrigger rather than guess from
// scrollHeight (the smoother pins the wrapper and drives the native scroll).
const endScroll = () => Math.max(0, ScrollTrigger.maxScroll(window));

function scrollToActions() {
  const target = endScroll();

  if (smoother) {
    // Tween the plugin's own scrollTop: every frame writes a new native scroll
    // position, so the corridor and the beat copy scrub all the way down
    // instead of the page jumping and the content easing in afterwards.
    gsap.to(smoother, {
      scrollTop: target,
      duration: 1.2,
      ease: "power2.inOut",
      overwrite: true
    });
    return;
  }

  window.scrollTo({ top: target, behavior: "smooth" });
}

mainBtn.addEventListener("click", () => enterSite(ROUTES.main));
aiBtn.addEventListener("click", () => enterSite(ROUTES.ai));
skipBtn.addEventListener("click", scrollToActions);

window.addEventListener("resize", () => scene.resize());
window.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  if (!actions.classList.contains("is-visible")) return;
  // Enter on a focused button already activates it. Only the "nothing is
  // focused" case needs the shortcut, otherwise the door would fire twice.
  if (event.target === mainBtn || event.target === aiBtn || event.target === skipBtn) {
    return;
  }
  enterSite(ROUTES.main);
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
      revealActions(p > 0.965);
      // The doors are on screen, so the shortcut to them has done its job.
      revealSkip(scrollReady && p <= 0.965);
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
      scrollReady = true;
      revealSkip(true);
    },
    null,
    Math.max(0.2, duration - 0.25)
  );
}

async function boot() {
  lockScroll(true);
  // Landing on the doors means landing on the last beat, so the camera starts
  // on its final pose instead of the entry pose outside the corridor.
  scene.setProgress(atEnd ? 1 : 0);
  scene.setIntroBlend(atEnd ? 0 : 1);
  scene.start();

  await scene.load();
  // Let the loader animation finish its arc before the opening move. Landing
  // on the doors skips the move, so there is nothing long to wait for.
  await new Promise(resolve =>
    window.setTimeout(resolve, reducedMotion || atEnd ? 120 : 900)
  );

  loader.classList.add("is-gone");
  wireScroll();

  if (atEnd) {
    lockScroll(false);
    // The skip button is the way back down, so it has to be armed here too:
    // the reader can still scroll up into the corridor from the doors, and
    // without this it stayed hidden for the whole way back. The scroll trigger
    // keeps it out of sight while the doors themselves are on screen.
    scrollReady = true;
    // The beat windows are measured off the scroll length, so all that is left
    // is to put the scroll where the doors live. No animation: the reader
    // asked to arrive, not to travel.
    ScrollTrigger.refresh();
    if (smoother) smoother.scrollTop(endScroll());
    else window.scrollTo(0, endScroll());
    return;
  }

  runOpening();
}

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);
boot();
