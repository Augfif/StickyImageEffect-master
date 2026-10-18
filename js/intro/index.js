import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

import { Cursor } from "../Cursor.js";
import { introBeats, introCopy } from "./beats.js";
import { createLoom } from "./cloth.js";
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
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

// `?at=end` boots straight onto the two fabric cards. The AI page sends the
// reader back here, and replaying the whole opening move just to reach a pair
// of destinations they have already seen would waste their time.
const atEnd = params.get("at") === "end";

// --- dom ------------------------------------------------------------------

const textLayer = document.getElementById("intro-text");
const hint = document.getElementById("intro-hint");
const skipBtn = document.getElementById("intro-skip");
const loader = document.getElementById("intro-loader");
const curtain = document.getElementById("intro-curtain");
const scrollEl = document.getElementById("intro-scroll");
const loomEl = document.getElementById("loom");
const choiceEl = document.getElementById("intro-choice");
const choiceMain = document.getElementById("intro-choice-main");
const choiceAi = document.getElementById("intro-choice-ai");
const choiceReplay = document.getElementById("intro-choice-replay");

// Where the two cards lead. Both pages are only ever reached from here, so the
// urls live in one place.
const ROUTES = {
  main: "main.html",
  ai: "ai.html"
};

document.getElementById("intro-hint-label").textContent = coarsePointer
  ? introCopy.scrollHintTouch
  : introCopy.scrollHint;
document.getElementById("intro-choice-kicker").textContent =
  introCopy.choice.kicker;
document.getElementById("intro-choice-title").textContent =
  introCopy.choice.title;
document.getElementById("intro-choice-main-label").textContent =
  introCopy.choice.main.label;
document.getElementById("intro-choice-main-hint").textContent =
  introCopy.choice.main.hint;
document.getElementById("intro-choice-ai-label").textContent =
  introCopy.choice.ai.label;
document.getElementById("intro-choice-ai-hint").textContent =
  introCopy.choice.ai.hint;
choiceReplay.textContent = introCopy.choice.replay;
skipBtn.textContent = introCopy.skip;

// Same ring the slideshow draws, and base.css already hides the native one.
new Cursor(document.querySelector(".cursor"));

const progress = createProgress({
  fill: document.getElementById("intro-progress-fill"),
  value: document.getElementById("intro-progress-value")
});
const layer = buildTextLayer(textLayer, introBeats, introCopy);

const beatCount = introBeats.length;
const totalPanels = beatCount + 1;
scrollEl.style.height = `${totalPanels * 100}svh`;

// The title cloth owns the first panel; the ten beats share the rest, then the
// final eight percent holds the last pattern while the fork fades in.
const HERO_SHARE = 1 / totalPanels;
const FORK_SHARE = 0.08;
const LAST_CENTER = 1 - FORK_SHARE;
const SPAN = LAST_CENTER - HERO_SHARE;
const centerFor = index => HERO_SHARE + (index / (beatCount - 1)) * SPAN;
const halfWindow = SPAN / (beatCount - 1) / 2;

const loom = createLoom({
  root: loomEl,
  cloth: document.getElementById("loom-cloth"),
  beats: introBeats,
  totalPanels,
  lastCenter: LAST_CENTER
});

// --- timeline maths -------------------------------------------------------

let smoother = null;
let splits = null;
// Set once the opening move has handed the scroll back. The skip button can
// only be shown from then on, or it would be clickable while the scroll it
// drives is still locked.
let scrollReady = false;
let choiceVisible = false;

function setReachable(element, reachable) {
  element.tabIndex = reachable ? 0 : -1;
}

function revealChoice(visible) {
  if (choiceVisible === visible) return;
  choiceVisible = visible;
  choiceEl.classList.toggle("is-visible", visible);
  choiceEl.setAttribute("aria-hidden", String(!visible));
  document.body.classList.toggle("is-choice", visible);
  setReachable(choiceMain, visible);
  setReachable(choiceAi, visible);
  setReachable(choiceReplay, visible);

  if (visible) {
    loom.show(false);
    hint.classList.remove("is-visible");
    revealSkip(false);
  } else {
    loom.show(true);
  }
}

function revealSkip(visible) {
  skipBtn.classList.toggle("is-visible", visible);
  setReachable(skipBtn, visible);
}

function lockScroll(locked) {
  if (smoother) smoother.paused(locked);
  document.documentElement.classList.toggle("intro-locked", locked && !smoother);
}

function applyProgress(p) {
  loom.setProgress(p);
  progress.set(p);

  // The cloth reaches its fork at the very end. Leaving a small lead-in keeps
  // the last pattern readable before the cards take over.
  const atFork = p > 0.97;
  revealChoice(atFork);
  revealSkip(scrollReady && !atFork && p <= 0.97);
  hint.classList.toggle("is-gone", p > 0.02 || atFork);
}

function enterSite(url) {
  curtain.classList.add("is-on");
  window.setTimeout(() => {
    window.location.href = url;
  }, 420);
}

const endScroll = () => Math.max(0, ScrollTrigger.maxScroll(window));

function scrollToActions() {
  const target = endScroll();

  if (smoother) {
    gsap.to(smoother, {
      scrollTop: target,
      duration: reducedMotion ? 0.25 : 1.2,
      ease: "power2.inOut",
      overwrite: true
    });
    return;
  }

  window.scrollTo({
    top: target,
    behavior: reducedMotion ? "auto" : "smooth"
  });
}

function replay() {
  revealChoice(false);
  if (smoother) {
    gsap.to(smoother, {
      scrollTop: 0,
      duration: reducedMotion ? 0.25 : 1.2,
      ease: "power2.inOut",
      overwrite: true
    });
    return;
  }
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
}

choiceMain.addEventListener("click", event => {
  event.preventDefault();
  enterSite(ROUTES.main);
});
choiceAi.addEventListener("click", event => {
  event.preventDefault();
  enterSite(ROUTES.ai);
});
choiceReplay.addEventListener("click", replay);
skipBtn.addEventListener("click", scrollToActions);

window.addEventListener("resize", () => {
  const label = document.getElementById("intro-hint-label");
  label.textContent = window.matchMedia("(pointer: coarse)").matches
    ? introCopy.scrollHintTouch
    : introCopy.scrollHint;
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
  heroExitTimeline(
    layer.hero.el,
    splits.heroChars,
    scrollEl,
    HERO_SHARE
  );

  layer.blocks.forEach((block, index) => {
    if (!block) return;
    const center = centerFor(index);
    beatTimeline(
      splits.beatChars[index],
      scrollEl,
      center - halfWindow,
      center + halfWindow
    );
  });

  const pageTrigger = ScrollTrigger.create({
    trigger: scrollEl,
    start: "top top",
    end: "bottom bottom",
    onUpdate: self => applyProgress(self.progress)
  });

  // A resize rebuilds ScrollTrigger's measurements without necessarily firing
  // onUpdate. Re-apply the current state so the fork cannot disappear at 100%.
  ScrollTrigger.addEventListener("refresh", () => {
    applyProgress(pageTrigger.progress);
  });
}

function runOpening() {
  const tl = gsap.timeline();

  tl.fromTo(
    loomEl,
    { opacity: 0, scale: 1.015 },
    { opacity: 1, scale: 1, duration: reducedMotion ? 0.35 : 1.1, ease: "power2.out" },
    0
  );
  tl.add(heroTimeline(splits.heroChars, reducedMotion ? 0.05 : 0.25), 0);
  tl.call(
    () => {
      lockScroll(false);
      hint.classList.add("is-visible");
      scrollReady = true;
      revealSkip(true);
    },
    null,
    reducedMotion ? 0.35 : 1.05
  );
}

async function preloadImages() {
  const load = Promise.all(
    introBeats.map(
      beat =>
        new Promise(resolve => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = resolve;
          image.src = beat.image;
        })
    )
  );
  const timeout = new Promise(resolve => window.setTimeout(resolve, 2200));
  await Promise.race([load, timeout]);
}

async function boot() {
  lockScroll(true);
  loom.setProgress(atEnd ? 1 : 0);

  await preloadImages();
  await new Promise(resolve =>
    window.setTimeout(resolve, reducedMotion || atEnd ? 80 : 420)
  );

  loader.classList.add("is-gone");
  wireScroll();

  if (atEnd) {
    lockScroll(false);
    scrollReady = true;
    ScrollTrigger.refresh();
    if (smoother) smoother.scrollTop(endScroll());
    else window.scrollTo(0, endScroll());
    revealChoice(true);
    return;
  }

  // A reload can restore the previous scroll position after the browser has
  // already painted the first frame. Put the strip back on its title panel.
  if (smoother) smoother.scrollTop(0);
  else window.scrollTo(0, 0);
  runOpening();
}

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);
boot();
