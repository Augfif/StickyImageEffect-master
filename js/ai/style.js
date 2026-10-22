import { aiCopy } from "./copy.js";
import { accessories, defaultAccessoryUrl } from "./accessories.js";
import { patternBySlug, shotsForPattern } from "./patterns.js";
import chairUrl from "../../images/ai/chair.png";
import demoResultUrl from "../../images/ai/demo-result.png";

const copy = aiCopy.studio;

// TEMPORARY DEMO: the ai-drawing backend is not wired up for this showing, so
// the page runs a fixed 20s job and ends on one hardcoded photo instead of
// calling the API. Set DEMO to false to restore the real request.
const DEMO = true;
const DEMO_SECONDS = 20;

// Dev and preview reach the ai-drawing backend through the proxy in
// vite.config.js, so the browser only ever sees its own origin. A deployed build
// can point VITE_AI_API_BASE at an absolute origin instead -- which then needs
// the backend to answer CORS.
const API_BASE = (import.meta.env.VITE_AI_API_BASE || "").replace(/\/+$/, "");
const ENDPOINT = `${API_BASE}/api/v1/styled-look`;

const MAX_BYTES = 30 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/bmp",
  "image/gif",
  "image/tiff",
  "image/heic",
  "image/heif"
];
const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".bmp",
  ".gif",
  ".tif",
  ".tiff",
  ".heic",
  ".heif"
];

const byId = id => document.getElementById(id);
const ui = {
  states: {
    invalid: byId("state-invalid"),
    form: byId("state-form"),
    waiting: byId("state-waiting"),
    result: byId("state-result")
  },
  invalidTitle: byId("invalid-title"),
  invalidBody: byId("invalid-body"),
  invalidAction: byId("invalid-action"),
  patternShot: byId("pattern-shot"),
  patternEyebrow: byId("pattern-eyebrow"),
  patternTitle: byId("pattern-title"),
  patternMeta: byId("pattern-meta"),
  patternCopy: byId("pattern-copy"),
  accessoryTitle: byId("accessory-title"),
  accessoryHint: byId("accessory-hint"),
  accessoryCount: byId("accessory-count"),
  accessoryOptions: byId("accessory-options"),
  selfieDrop: byId("selfie-drop"),
  selfieInput: byId("selfie-input"),
  selfieTitle: byId("selfie-title"),
  selfieHint: byId("selfie-hint"),
  selfiePreview: byId("selfie-preview"),
  error: byId("error"),
  submit: byId("submit"),
  waitingTitle: byId("waiting-title"),
  waitingStage: byId("waiting-stage"),
  waitingTime: byId("waiting-time"),
  waitingProgress: byId("waiting-progress"),
  waitingBar: byId("waiting-bar"),
  waitingHint: byId("waiting-hint"),
  cancel: byId("cancel"),
  resultTitle: byId("result-title"),
  resultImage: byId("result-image"),
  resultHint: byId("result-hint"),
  download: byId("download"),
  retry: byId("retry"),
  back: byId("back-link")
};

const state = {
  files: { selfie: null },
  previewUrls: { selfie: null },
  selectedAccessories: new Set(),
  resultUrl: null,
  controller: null,
  clockId: null,
  startedAt: 0,
  busy: false
};

const uploads = {
  selfie: {
    drop: ui.selfieDrop,
    input: ui.selfieInput,
    preview: ui.selfiePreview
  }
};

function updateAccessoryCount() {
  const count = state.selectedAccessories.size;
  ui.accessoryCount.textContent =
    `${copy.accessoryCountPrefix} ${count} ${copy.accessoryCountSuffix}`;
}

function createAccessoryCard(accessory) {
  const label = document.createElement("label");
  label.className = "studio__accessory";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "studio__accessory-input";
  input.value = accessory.id;
  input.dataset.accessoryId = accessory.id;
  input.setAttribute("aria-label", accessory.title);
  input.addEventListener("change", () => {
    if (input.checked) state.selectedAccessories.add(accessory.id);
    else state.selectedAccessories.delete(accessory.id);
    updateAccessoryCount();
  });

  const card = document.createElement("span");
  card.className = "studio__accessory-card";

  const image = document.createElement("img");
  image.className = "studio__accessory-img";
  image.src = accessory.image;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";

  const name = document.createElement("span");
  name.className = "studio__accessory-name";
  name.textContent = accessory.title;

  const check = document.createElement("span");
  check.className = "studio__accessory-check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = "✓";

  card.append(image, name, check);
  label.append(input, card);
  return label;
}

function renderAccessories() {
  const groups = [
    {
      key: "wearable",
      title: copy.accessoryWearableGroup,
      items: accessories.filter(accessory => accessory.group === "wearable")
    },
    {
      key: "scene",
      title: copy.accessorySceneGroup,
      items: accessories.filter(accessory => accessory.group === "scene")
    }
  ];

  const fragment = document.createDocumentFragment();
  groups.forEach(group => {
    if (!group.items.length) return;
    const section = document.createElement("div");
    section.className = "studio__accessory-group";

    const title = document.createElement("p");
    title.className = "studio__accessory-group-title";
    title.textContent = group.title;

    const grid = document.createElement("div");
    grid.className = "studio__accessory-grid";
    group.items.forEach(accessory => grid.append(createAccessoryCard(accessory)));

    section.append(title, grid);
    fragment.append(section);
  });

  ui.accessoryOptions.replaceChildren(fragment);
  updateAccessoryCount();
}

// --- static copy -----------------------------------------------------------

ui.back.textContent = copy.back;
ui.invalidTitle.textContent = copy.invalidTitle;
ui.invalidBody.textContent = copy.invalidBody;
ui.invalidAction.textContent = copy.invalidAction;
ui.patternEyebrow.textContent = copy.eyebrow;
ui.accessoryTitle.textContent = copy.accessoryPickerTitle;
ui.accessoryHint.textContent = copy.accessoryPickerHint;
ui.selfieTitle.textContent = copy.selfieUploadTitle;
ui.selfieHint.textContent = copy.selfieUploadHint;
ui.waitingTitle.textContent = copy.waitingTitle;
ui.waitingHint.textContent = copy.waitingHint;
ui.cancel.textContent = copy.cancel;
ui.resultTitle.textContent = copy.resultTitle;
ui.resultHint.textContent = copy.resultHint;
ui.download.textContent = copy.download;
ui.retry.textContent = copy.retry;
ui.submit.textContent = copy.submitDisabled;
ui.patternCopy.replaceChildren(
  ...copy.intro.map(text => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  })
);
renderAccessories();

// The real service can take minutes and unknown time, so the bar only belongs
// to the fixed-length demo.
if (!DEMO) ui.waitingProgress.hidden = true;

// --- states ----------------------------------------------------------------

function show(name) {
  Object.entries(ui.states).forEach(([key, node]) => {
    node.hidden = key !== name;
  });
  window.scrollTo(0, 0);
}

function setError(message) {
  ui.error.textContent = message || "";
}

// --- the chosen pattern ----------------------------------------------------

const slug = new URLSearchParams(location.search).get("pattern");
const pattern = patternBySlug(slug);
const shots = pattern ? shotsForPattern(pattern) : [];

if (!pattern || pattern.pending || shots.length === 0) {
  show("invalid");
} else {
  document.title = `${pattern.title} · 造型生成`;
  ui.patternShot.src = shots[0];
  ui.patternShot.alt = pattern.title;
  ui.patternTitle.textContent = pattern.title;
  ui.patternMeta.textContent = pattern.meta || "";
  show("form");
}

// --- picking a picture -----------------------------------------------------

function checkFile(file) {
  if (!file) return copy.errorType;
  if (file.size > MAX_BYTES) return copy.errorSize;
  const type = (file.type || "").toLowerCase();
  const extension = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
  if (ACCEPTED_TYPES.includes(type) || ACCEPTED_EXTENSIONS.includes(extension)) {
    return "";
  }
  return copy.errorType;
}

function updateSubmit() {
  const ready = Boolean(state.files.selfie);
  ui.submit.disabled = !ready;
  ui.submit.textContent = ready ? copy.submit : copy.submitDisabled;
}

function clearUpload(key) {
  const field = uploads[key];
  state.files[key] = null;
  if (state.previewUrls[key]) {
    URL.revokeObjectURL(state.previewUrls[key]);
    state.previewUrls[key] = null;
  }
  field.preview.hidden = true;
  field.preview.removeAttribute("src");
  field.drop.classList.remove("has-file");
  field.input.value = "";
  updateSubmit();
}

function clearUploads() {
  Object.keys(uploads).forEach(clearUpload);
}

function acceptFile(key, file) {
  const problem = checkFile(file);
  if (problem) {
    setError(problem);
    clearUpload(key);
    return;
  }

  const field = uploads[key];
  setError("");
  state.files[key] = file;
  if (state.previewUrls[key]) URL.revokeObjectURL(state.previewUrls[key]);
  state.previewUrls[key] = URL.createObjectURL(file);
  field.preview.src = state.previewUrls[key];
  field.preview.hidden = false;
  field.drop.classList.add("has-file");
  updateSubmit();
}

Object.entries(uploads).forEach(([key, field]) => {
  field.input.addEventListener("change", () => {
    const file = field.input.files && field.input.files[0];
    if (!file) return;
    acceptFile(key, file);
    // Lets the same file be picked again after a rejected attempt.
    field.input.value = "";
  });

  ["dragenter", "dragover"].forEach(name => {
    field.drop.addEventListener(name, event => {
      event.preventDefault();
      field.drop.classList.add("is-dragging");
    });
  });

  ["dragleave", "dragend"].forEach(name => {
    field.drop.addEventListener(name, () => field.drop.classList.remove("is-dragging"));
  });

  field.drop.addEventListener("drop", event => {
    event.preventDefault();
    field.drop.classList.remove("is-dragging");
    const file = event.dataTransfer && event.dataTransfer.files[0];
    if (file) acceptFile(key, file);
  });
});

// Dropping anywhere else must not navigate away from the page.
window.addEventListener("dragover", event => event.preventDefault());
window.addEventListener("drop", event => event.preventDefault());

// --- the pictures the browser supplies --------------------------------------

async function fetchBlob(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`asset ${response.status}: ${url}`);
  return response.blob();
}

// The backend takes four references: 人物、布匹、配饰、椅子. The selected
// pattern supplies the fabric, the visitor's selfie supplies person, and the
// accessory/chair picker is display-only for now, so both defaults stay fixed
// to keep the existing API contract working.
let presetsPromise = null;

function loadPresets() {
  if (!presetsPromise) {
    presetsPromise = Promise.all([
      fetchBlob(shots[0]),
      fetchBlob(defaultAccessoryUrl),
      fetchBlob(chairUrl)
    ])
      .then(([fabric, accessory, chair]) => ({ fabric, accessory, chair }))
      .catch(error => {
        presetsPromise = null;
        throw error;
      });
  }
  return presetsPromise;
}

// --- generating ------------------------------------------------------------

function formatClock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function setProgress(ratio) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  ui.waitingBar.style.width = `${percent}%`;
  ui.waitingProgress.setAttribute("aria-valuenow", String(percent));
}

function tickClock() {
  const elapsed = (performance.now() - state.startedAt) / 1000;
  ui.waitingTime.textContent = formatClock(elapsed);
  if (DEMO) setProgress(elapsed / DEMO_SECONDS);
  const marks = DEMO ? [DEMO_SECONDS * 0.35, DEMO_SECONDS * 0.75] : [8, 120];
  const stage = elapsed < marks[0] ? 0 : elapsed < marks[1] ? 1 : 2;
  ui.waitingStage.textContent = copy.waitingStages[stage];
}

function startClock() {
  state.startedAt = performance.now();
  tickClock();
  state.clockId = window.setInterval(tickClock, 250);
}

function stopClock() {
  if (state.clockId) {
    window.clearInterval(state.clockId);
    state.clockId = null;
  }
}

function userError(message) {
  const error = new Error(message);
  error.userMessage = message;
  return error;
}

async function failureMessage(response) {
  if (response.status === 422) return copy.errors.VALIDATION;
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* a proxy or a crash can answer with html */
  }
  const code = payload && payload.error && payload.error.code;
  if (code && copy.errors[code]) return copy.errors[code];
  if (payload && payload.error && payload.error.message) return payload.error.message;
  return copy.errors.GENERATION_FAILED;
}

function showResult(blob, contentType) {
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.resultUrl = URL.createObjectURL(blob);
  ui.resultImage.src = state.resultUrl;
  ui.resultImage.alt = `${pattern.title} 造型结果`;
  const extension = /jpe?g/i.test(contentType) ? "jpg" : "png";
  ui.download.href = state.resultUrl;
  ui.download.setAttribute("download", `${pattern.title}-造型.${extension}`);
  show("result");
}

// The demo result is a bundled asset, so it is served from our own origin and
// the download attribute still saves it under a friendly name.
function showDemoResult() {
  if (state.resultUrl) {
    URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = null;
  }
  ui.resultImage.src = demoResultUrl;
  ui.resultImage.alt = `${pattern.title} 造型结果`;
  ui.download.href = demoResultUrl;
  ui.download.setAttribute("download", `${pattern.title}-造型.png`);
  show("result");
}

// Resolves when the fake job is done; rejects with AbortError so the shared
// cancel path in generate() keeps working unchanged.
function demoWait(signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      window.clearTimeout(timer);
      const error = new Error("demo cancelled");
      error.name = "AbortError";
      reject(error);
    };
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, DEMO_SECONDS * 1000);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function generate() {
  if (!state.files.selfie || state.busy) return;

  state.busy = true;
  setError("");
  show("waiting");
  setProgress(0);
  startClock();

  const controller = new AbortController();
  state.controller = controller;

  try {
    if (DEMO) {
      await demoWait(controller.signal);
      showDemoResult();
      return;
    }

    const presets = await loadPresets();
    const body = new FormData();
    body.append("person", state.files.selfie, state.files.selfie.name);
    body.append("fabric", presets.fabric, `${pattern.title}.jpg`);
    body.append("accessory", presets.accessory, "accessory.png");
    body.append("chair", presets.chair, "chair.png");

    const response = await fetch(ENDPOINT, {
      method: "POST",
      body,
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw userError(await failureMessage(response));

    const blob = await response.blob();
    showResult(blob, response.headers.get("Content-Type") || "image/png");
  } catch (error) {
    if (error.name === "AbortError") {
      show("form");
      setError(copy.errors.CANCELLED);
      return;
    }
    show("form");
    setError(error.userMessage || copy.errors.NETWORK);
  } finally {
    state.busy = false;
    state.controller = null;
    stopClock();
  }
}

ui.submit.addEventListener("click", generate);

ui.cancel.addEventListener("click", () => {
  if (state.controller) state.controller.abort();
});

ui.retry.addEventListener("click", () => {
  if (state.resultUrl) {
    URL.revokeObjectURL(state.resultUrl);
    state.resultUrl = null;
  }
  clearUploads();
  setError("");
  show("form");
});
