import { aiCopy } from "./copy.js";
import { patterns, shotsForPattern } from "./patterns.js";
import { createGridPreview, preloadImages } from "./grid-preview.js";

const root = document.getElementById("grid");
document.getElementById("ai-back").textContent = aiCopy.grid.back;

const list = document.createElement("ul");
list.className = "gp__grid";

const tiles = patterns.map((pattern, index) => {
  const tile = document.createElement("li");
  tile.className = "gp__tile";
  tile.dataset.index = String(index);
  tile.dataset.title = pattern.title;
  tile.dataset.meta = pattern.meta || "";

  const shots = shotsForPattern(pattern);
  if (!shots.length) {
    tile.classList.add("gp__tile--pending");
    tile.textContent = "待补";
    return tile;
  }

  const link = document.createElement("a");
  link.className = "gp__tile-link";
  link.href = `ai-style.html?pattern=${encodeURIComponent(pattern.slug)}`;
  link.setAttribute("aria-label", `${pattern.title}：进入造型生成`);
  tile.append(link);

  const picture = document.createElement("img");
  picture.src = shots[0];
  picture.alt = pattern.title;
  link.append(picture);

  // The extra angles never render in the tile; createGridPreview() copies their
  // src into the pane, where they cross fade while the tile is hovered.
  shots.slice(1).forEach(src => {
    const detail = document.createElement("img");
    detail.src = src;
    detail.alt = "";
    detail.dataset.detail = "";
    link.append(detail);
  });

  return tile;
});

list.append(...tiles);
root.append(list);

createGridPreview(root);

preloadImages(root.querySelectorAll("img")).then(() => {
  document.body.classList.remove("gp-loading");
});
