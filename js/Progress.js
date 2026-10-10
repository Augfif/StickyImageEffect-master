const createEleWithClass = (tag, className) => {
  const ele = document.createElement(tag);
  ele.className = className;
  return ele;
};

/**
 * Vertical progress sidebar: up arrow, track + knob, "current / total"
 * label and a down arrow. The arrows are decorative, the whole element is
 * pointer-events: none so it never blocks the click & drag interaction.
 */
class Progress {
  constructor(total) {
    this.container = createEleWithClass("div", "progress");
    this.up = createEleWithClass("span", "progress__arrow progress__arrow--up");
    this.track = createEleWithClass("div", "progress__track");
    this.knob = createEleWithClass("span", "progress__knob");
    this.label = createEleWithClass("span", "progress__label");
    this.down = createEleWithClass(
      "span",
      "progress__arrow progress__arrow--down"
    );

    this.track.appendChild(this.knob);
    this.container.appendChild(this.up);
    this.container.appendChild(this.track);
    this.container.appendChild(this.label);
    this.container.appendChild(this.down);

    this.total = Math.max(total, 1);
    this.index = 0;
    this.dragging = false;
    this.renderLabel();
    // Paint the very first position without animating.
    this.apply(this.positionFor(this.index), false);
  }
  mount(container) {
    container.appendChild(this.container);
  }
  setTotal(total) {
    this.total = Math.max(total, 1);
    this.index = Math.min(this.index, this.total - 1);
    this.renderLabel();
    if (!this.dragging) {
      this.apply(this.positionFor(this.index), false);
    }
  }
  setIndex(index, { animate = true } = {}) {
    this.index = Math.max(0, Math.min(index, this.total - 1));
    this.renderLabel();
    // While dragging the knob is pinned to the middle of the track, only
    // the label follows the active slide.
    if (!this.dragging) {
      this.apply(this.positionFor(this.index), animate);
    }
  }
  setDragging(dragging) {
    if (this.dragging === dragging) return;
    this.dragging = dragging;
    this.apply(dragging ? 0.5 : this.positionFor(this.index), true);
  }
  // 0 = first slide at the bottom of the track, 1 = last slide at the top.
  positionFor(index) {
    return index / Math.max(this.total - 1, 1);
  }
  renderLabel() {
    this.label.innerHTML = `${this.index + 1} / ${this.total}`;
  }
  apply(progress, animate) {
    this.container.classList.toggle("progress--instant", !animate);
    this.container.style.setProperty("--progress", String(progress));
  }
}

export { Progress };
