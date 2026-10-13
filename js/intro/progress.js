/**
 * Thin rail at the bottom of the opener: neutral white to match the
 * slideshow's sidebar, plus the zero padded percentage above it.
 */
export function createProgress({ fill, value }) {
  let last = -1;

  return {
    set(progress) {
      const clamped = Math.min(1, Math.max(0, progress));
      const percent = Math.round(clamped * 100);
      if (percent === last) return;
      last = percent;
      fill.style.width = `${percent}%`;
      value.textContent = `${String(percent).padStart(3, "0")}%`;
    }
  };
}
