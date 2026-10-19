import { aiCopy } from "./copy.js";
import { patternBySlug, shotsForPattern } from "./patterns.js";
import chairUrl from "../../images/ai/chair.png";

const copy = aiCopy.studio;

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
  accessoryDrop: byId("accessory-drop"),
  accessoryInput: byId("accessory-input"),
  accessoryTitle: byId("accessory-title"),
  accessoryHint: byId("accessory-hint"),
  accessoryPreview: byId("accessory-preview"),
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
  files: { accessory: null, selfie: null },
  previewUrls: { accessory: null, selfie: null },
  resultUrl: null,
  controller: null,
  clockId: null,
  startedAt: 0,
  busy: false
};

const uploads = {
  accessory: {
    drop: ui.accessoryDrop,
    input: ui.accessoryInput,
    preview: ui.accessoryPreview
  },
  selfie: {
    drop: ui.selfieDrop,
    input: ui.selfieInput,
    preview: ui.selfiePreview
  }
};

// --- static copy -----------------------------------------------------------

ui.back.textContent = copy.back;
ui.invalidTitle.textContent = copy.invalidTitle;
ui.invalidBody.textContent = copy.invalidBody;
ui.invalidAction.textContent = copy.invalidAction;
ui.patternEyebrow.textContent = copy.eyebrow;
ui.accessoryTitle.textContent = copy.accessoryUploadTitle;
ui.accessoryHint.textContent = copy.accessoryUploadHint;
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
  const ready = Boolean(state.files.accessory && state.files.selfie);
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
// pattern supplies the fabric, the two uploads supply person and accessory,
// and the chair stays a bundled default so the existing contract keeps working.
let presetsPromise = null;

function loadPresets() {
  if (!presetsPromise) {
    presetsPromise = Promise.all([fetchBlob(shots[0]), fetchBlob(chairUrl)])
      .then(([fabric, chair]) => ({ fabric, chair }))
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

function tickClock() {
  const elapsed = (performance.now() - state.startedAt) / 1000;
  ui.waitingTime.textContent = formatClock(elapsed);
  const stage = elapsed < 8 ? 0 : elapsed < 120 ? 1 : 2;
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

async function generate() {
  if (!state.files.accessory || !state.files.selfie || state.busy) return;

  state.busy = true;
  setError("");
  show("waiting");
  startClock();

  const controller = new AbortController();
  state.controller = controller;

  try {
    const presets = await loadPresets();
    const body = new FormData();
    body.append("person", state.files.selfie, state.files.selfie.name);
    body.append("fabric", presets.fabric, `${pattern.title}.jpg`);
    body.append("accessory", state.files.accessory, state.files.accessory.name);
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
