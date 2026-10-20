import { aiCopy } from "./copy.js";
import { patterns, shotsForPattern } from "./patterns.js";

const copy = aiCopy.grid;
const stage = document.getElementById("sample-stage");
const layers = document.getElementById("sample-layers");
const fabric = document.getElementById("sample-fabric");
const ambient = document.getElementById("sample-ambient");
const person = document.getElementById("sample-person");
const look = document.getElementById("sample-look");
const lookImg = document.getElementById("sample-look-img");
const number = document.getElementById("sample-number");
const name = document.getElementById("sample-name");
const meta = document.getElementById("sample-meta");
const cta = document.getElementById("sample-cta");
const list = document.getElementById("sample-list");
const rail = document.getElementById("sample-rail");
const switchButtons = Array.from(
  stage.querySelectorAll(".sample__switch-btn")
);

document.getElementById("ai-back").textContent = copy.back;
document.getElementById("ai-eyebrow").textContent = copy.eyebrow;
document.getElementById("ai-title").textContent = copy.title;

const usable = patterns.filter(
  pattern => pattern.person && shotsForPattern(pattern).length
);

let activeIndex = 0;
let switchTimer = null;

const indexButtons = [];
const railButtons = [];

usable.forEach((pattern, index) => {
  const shot = shotsForPattern(pattern)[0];
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sample__index-btn";
  button.innerHTML =
    `<span class="sample__index-num">${String(index + 1).padStart(2, "0")}</span>` +
    `<span class="sample__index-name">${pattern.title}</span>`;
  button.addEventListener("click", () => select(index));
  item.append(button);
  list.append(item);
  indexButtons.push(button);

  const railButton = document.createElement("button");
  railButton.type = "button";
  railButton.className = "sample__rail-btn";
  railButton.setAttribute(
    "aria-label",
    `${pattern.title}：查看布面与上身`
  );
  railButton.innerHTML =
    `<img src="${shot}" alt="" width="48" height="64" />` +
    `<span>${String(index + 1).padStart(2, "0")}</span>`;
  railButton.addEventListener("click", () => select(index));
  rail.append(railButton);
  railButtons.push(railButton);
});

function setSide(side) {
  stage.dataset.side = side;
  switchButtons.forEach(button => {
    const active = button.dataset.side === side;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function paint(index) {
  const pattern = usable[index];
  const shot = shotsForPattern(pattern)[0];
  const stageImage = pattern.stage || shot;
  const focus = pattern.personFocus || { x: 50, y: 30 };

  fabric.style.backgroundImage = `url("${stageImage}")`;
  ambient.style.backgroundImage = `url("${stageImage}")`;
  person.src = pattern.person;
  person.alt = `${pattern.title}的上身展示`;
  person.style.setProperty("--person-x", `${focus.x}%`);
  person.style.setProperty("--person-y", `${focus.y}%`);
  lookImg.src = pattern.person;
  lookImg.alt = "";
  lookImg.style.setProperty("--look-x", `${focus.x}%`);
  lookImg.style.setProperty("--look-y", `${focus.y}%`);
  number.textContent = `${String(index + 1).padStart(2, "0")} / ${usable.length}`;
  name.textContent = pattern.title;
  meta.textContent = pattern.meta || "";
  cta.href = `ai-style.html?pattern=${encodeURIComponent(pattern.slug)}`;

  indexButtons.forEach((button, i) => {
    const active = i === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", String(active));
  });
  railButtons.forEach((button, i) => {
    const active = i === index;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", String(active));
  });
}

function select(index, instant = false) {
  if (index === activeIndex && !instant) return;
  activeIndex = index;
  window.clearTimeout(switchTimer);
  setSide("fabric");

  if (instant) {
    paint(index);
    return;
  }

  layers.classList.add("is-switching");
  switchTimer = window.setTimeout(() => {
    paint(index);
    requestAnimationFrame(() => layers.classList.remove("is-switching"));
  }, 170);
}

switchButtons.forEach(button => {
  button.addEventListener("click", () => setSide(button.dataset.side));
});

look.addEventListener("click", () => setSide("person"));

window.addEventListener("keydown", event => {
  if (event.target instanceof Element && event.target.closest("button, a")) {
    return;
  }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const delta = event.key === "ArrowRight" ? 1 : -1;
  select((activeIndex + delta + usable.length) % usable.length);
});

// The first pair is needed before the stage can be shown; the rest can warm up
// in the background so switching feels immediate.
const firstShot = new Image();
const firstPerson = new Image();

Promise.all([
  new Promise(resolve => {
    firstShot.onload = resolve;
    firstShot.onerror = resolve;
  }),
  new Promise(resolve => {
    firstPerson.onload = resolve;
    firstPerson.onerror = resolve;
  })
]).then(() => {
  select(0, true);
  document.body.classList.remove("pl-loading");
});

firstShot.src = usable[0].stage || shotsForPattern(usable[0])[0];
firstPerson.src = usable[0].person;

const warm = () => {
  usable.slice(1).forEach(pattern => {
    const shot = new Image();
    shot.src = pattern.stage || shotsForPattern(pattern)[0];
    const model = new Image();
    model.src = pattern.person;
  });
};
if ("requestIdleCallback" in window) {
  window.requestIdleCallback(warm, { timeout: 1800 });
} else {
  window.setTimeout(warm, 900);
}
