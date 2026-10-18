/**
 * The opener's single fabric strip.
 *
 * Every beat becomes one tall panel in the same strip, so scrolling pulls the
 * cloth up through the loom instead of cross-fading ten separate photographs.
 * The images are zoomed around a per-beat focus point, which turns the runway
 * shots into the fabric close-ups the opening needs.
 */
export function createLoom({ root, cloth, beats, totalPanels, lastCenter = 1 }) {
  const heroPanel = document.createElement("div");
  heroPanel.className = "loom__panel loom__panel--hero";
  cloth.appendChild(heroPanel);

  beats.forEach((beat, index) => {
    const panel = document.createElement("div");
    panel.className = "loom__panel";

    const image = document.createElement("img");
    image.src = beat.image;
    image.alt = "";
    image.decoding = "async";
    // The strip is one tall fixed element; lazy loading does not see the
    // off-screen panels the way it would in normal document flow. Load the
    // whole cloth up front so a seam never opens onto an empty panel.
    image.loading = "eager";

    const fabric = beat.fabric || { x: 50, y: 50, zoom: 2.6 };
    panel.style.setProperty("--focus-x", `${fabric.x}%`);
    panel.style.setProperty("--focus-y", `${fabric.y}%`);
    panel.style.setProperty("--zoom", fabric.zoom);

    const seam = document.createElement("span");
    seam.className = "loom__seam";
    seam.setAttribute("aria-hidden", "true");

    panel.append(image, seam);
    cloth.appendChild(panel);
  });

  cloth.style.setProperty("--panels", totalPanels);

  const heroShare = 1 / totalPanels;
  const beatPanels = totalPanels - 2; // ten beats, hero panel excluded

  return {
    setProgress(progress) {
      const clamped = Math.min(1, Math.max(0, progress));
      // Panel 0 is the title cloth; the ten beats follow it. Align the strip
      // with the same beat centres the copy uses, otherwise a seam drifts into
      // the middle of every label.
      const rawOffset =
        clamped <= heroShare
          ? clamped / heroShare
          : 1 +
            ((clamped - heroShare) / (lastCenter - heroShare)) * beatPanels;
      // The last pattern holds in the opening while the fork fades in.
      const offset = Math.min(beatPanels + 1, rawOffset);
      // A plain 2D translate keeps the browser from promoting the whole
      // 9,000px strip into one texture that phones cannot paint all at once.
      cloth.style.transform =
        `translateY(${(-offset / totalPanels) * 100}%)`;
    },
    show(visible) {
      root.classList.toggle("is-hidden", !visible);
    }
  };
}
