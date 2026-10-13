import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The opener's copy is Chinese, so the beats fly on the vertical axis with a
// short per character stagger -- the horizontal push the reference used reads
// as noise once every "word" is a single glyph.
const IN_FROM = { y: 30, opacity: 0 };
const OUT_TO = { y: -24, opacity: 0 };

function makeBlock(className, title, meta, tag) {
  const block = document.createElement("div");
  block.className = className;

  const titleEl = document.createElement(tag);
  titleEl.className = "beat__title";
  titleEl.textContent = title;
  block.appendChild(titleEl);

  if (meta) {
    const metaEl = document.createElement("p");
    metaEl.className = "beat__meta";
    metaEl.textContent = meta;
    block.appendChild(metaEl);
  }

  return { block, titleEl, metaEl: block.querySelector(".beat__meta") };
}

export function buildTextLayer(container, beats, copy) {
  const hero = document.createElement("div");
  hero.className = "beat beat--center beat--hero";

  const heroTitle = document.createElement("h1");
  heroTitle.className = "beat__title";
  heroTitle.textContent = copy.title;
  const heroMeta = document.createElement("p");
  heroMeta.className = "beat__meta";
  heroMeta.textContent = copy.subtitle;
  hero.appendChild(heroTitle);
  hero.appendChild(heroMeta);
  container.appendChild(hero);

  const blocks = beats.map((beat, index) => {
    if (!beat.title && !beat.meta) return null;
    // The camera passes each pane on alternating sides, so the copy takes the
    // opposite side of the frame instead of landing on top of the photo.
    const side = index % 2 === 0 ? "beat--right" : "beat--left";
    const { block, titleEl, metaEl } = makeBlock(
      `beat ${side}`,
      beat.title,
      beat.meta,
      "h2"
    );
    container.appendChild(block);
    return { el: block, titleEl, metaEl };
  });

  return { hero: { el: hero, titleEl: heroTitle, metaEl: heroMeta }, blocks };
}

export function splitTexts(layer) {
  const splits = [];
  const chars = array => {
    const out = [];
    array.forEach(el => {
      if (!el) return;
      const split = new SplitText(el, { type: "chars" });
      splits.push(split);
      out.push(...(split.chars || []));
    });
    return out;
  };

  const heroChars = chars([layer.hero.titleEl, layer.hero.metaEl]);
  const beatChars = layer.blocks.map(block =>
    block ? chars([block.titleEl, block.metaEl]) : []
  );

  return {
    heroChars,
    beatChars,
    revert() {
      splits.forEach(split => split.revert());
      splits.length = 0;
    }
  };
}

export function heroTimeline(heroChars, delay = 0.35) {
  return gsap
    .timeline()
    .fromTo(
      heroChars,
      IN_FROM,
      {
        y: 0,
        opacity: 1,
        duration: 1,
        stagger: 0.05,
        ease: "power3.out"
      },
      delay
    );
}

export function heroExitTimeline(heroEl, heroChars, scrollEl) {
  return gsap.timeline({
    scrollTrigger: {
      trigger: scrollEl,
      start: "0% top",
      end: "5% top",
      scrub: 0.28
    }
  }).to(heroChars, {
    y: -26,
    opacity: 0,
    duration: 1,
    stagger: 0.015,
    ease: "power2.in"
  });
}

export function beatTimeline(chars, scrollEl, startPercent, endPercent) {
  if (!chars.length) return null;
  return gsap
    .timeline({
      scrollTrigger: {
        trigger: scrollEl,
        start: `${startPercent}% top`,
        end: `${endPercent}% top`,
        scrub: 0.28
      }
    })
    .fromTo(chars, IN_FROM, {
      y: 0,
      opacity: 1,
      duration: 0.3,
      stagger: 0.02,
      ease: "power3.out"
    })
    .to({}, { duration: 0.4 })
    .to(chars, {
      ...OUT_TO,
      duration: 0.3,
      stagger: -0.02,
      ease: "power2.in"
    });
}

export { ScrollTrigger };
