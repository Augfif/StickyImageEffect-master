import { gsap } from "gsap";
import { aiCopy } from "./copy.js";
import { patterns, shotsForPattern } from "./patterns.js";
import { createPatternMenu, preloadImages } from "./menu.js";

const list = document.getElementById("list");

document.getElementById("ai-back").textContent = aiCopy.grid.back;
document.getElementById("ai-eyebrow").textContent = aiCopy.grid.eyebrow;
document.getElementById("ai-title").textContent = aiCopy.grid.title;

// The pattern list, the picture file names and the links all come from
// patterns.js, so adding a pattern is a one line change there.
const rows = patterns.map((pattern, index) => {
  const shots = shotsForPattern(pattern);
  const row = document.createElement("li");
  row.className = "pl__row";

  if (!shots.length) {
    row.classList.add("pl__row--pending");
    row.textContent = "待补";
    return row;
  }

  const link = document.createElement("a");
  link.className = "pl__item";
  link.href = `ai-style.html?pattern=${encodeURIComponent(pattern.slug)}`;
  link.setAttribute("aria-label", `${pattern.title}：进入造型生成`);
  // Read by js/ai/menu.js to build the hover reveal.
  link.dataset.image = shots[0];

  const number = document.createElement("span");
  number.className = "pl__index";
  number.textContent = String(index + 1).padStart(2, "0");
  number.setAttribute("aria-hidden", "true");

  // Only shown where the hover reveal cannot exist, i.e. touch devices.
  const thumb = document.createElement("img");
  thumb.className = "pl__thumb";
  thumb.src = shots[0];
  thumb.alt = "";
  thumb.width = 54;
  thumb.height = 72;
  thumb.decoding = "async";

  const text = document.createElement("span");
  text.className = "pl__text";

  // The mask is what lets the title rise out of nothing on first paint.
  const title = document.createElement("span");
  title.className = "pl__title";
  const titleInner = document.createElement("span");
  titleInner.className = "pl__title-inner";
  titleInner.textContent = pattern.title;
  title.append(titleInner);

  const meta = document.createElement("span");
  meta.className = "pl__meta";
  meta.textContent = pattern.meta || "";

  text.append(title, meta);

  const arrow = document.createElement("span");
  arrow.className = "pl__arrow";
  arrow.setAttribute("aria-hidden", "true");

  link.append(number, thumb, text, arrow);
  row.append(link);
  return row;
});

list.append(...rows);

createPatternMenu(list);

const titles = list.querySelectorAll(".pl__title-inner");
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  gsap.set(titles, { yPercent: 0 });
} else {
  gsap.fromTo(
    titles,
    { yPercent: 110 },
    { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.05, delay: 0.12 }
  );
}

// Until the pictures are decoded a hover could reveal an empty box, so the
// list starts hidden (body.pl-loading) and lifts once everything is ready.
preloadImages(list.querySelectorAll("img")).then(() => {
  document.body.classList.remove("pl-loading");
});
