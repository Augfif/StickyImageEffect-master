import { Cursor } from "../Cursor.js";
import { aiCopy } from "./copy.js";
import { patternBySlug, shotsForPattern } from "./patterns.js";
import accessoryUrl from "../../images/ai/accessory.png";
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
  drop: byId("drop"),
  input: byId("person-input"),
  uploadTitle: byId("upload-title"),
  uploadHint: byId("upload-hint"),
  preview: byId("preview"),
  defaultsTitle: byId("defaults-title"),
  accessoryShot: byId("accessory-shot"),
  chairShot: byId("chair-shot"),
  accessoryLabel: byId("accessory-label"),
  chairLabel: byId("chair-label"),
  defaultNote: byId("default-note"),
  defaultNote2: byId("default-note-2"),
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
  file: null,
  previewUrl: null,
  resultUrl: null,
  controller: null,
  clockId: null,
  startedAt: 0,
  busy: false
};

// --- static copy -----------------------------------------------------------

ui.back.textContent = copy.back;
ui.invalidTitle.textContent = copy.invalidTitle;
ui.invalidBody.textContent = copy.invalidBody;
ui.invalidAction.textContent = copy.invalidAction;
ui.patternEyebrow.textContent = copy.eyebrow;
ui.uploadTitle.textContent = copy.uploadTitle;
ui.uploadHint.textContent = copy.uploadHint;
ui.defaultsTitle.textContent = copy.defaultsTitle;
ui.accessoryLabel.textContent = copy.accessory;
ui.chairLabel.textContent = copy.chair;
ui.defaultNote.textContent = copy.defaultNote;
ui.defaultNote2.textContent = copy.defaultNote;
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
  ui.accessoryShot.src = accessoryUrl;
  ui.chairShot.src = chairUrl;
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

function clearFile() {
  state.file = null;
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
  ui.preview.hidden = true;
  ui.preview.removeAttribute("src");
  ui.drop.classList.remove("has-file");
  ui.input.value = "";
  ui.submit.disabled = true;
  ui.submit.textContent = copy.submitDisabled;
}

function acceptFile(file) {
  const problem = checkFile(file);
  if (problem) {
    setError(problem);
    clearFile();
    return;
  }
  setError("");
  state.file = file;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.previewUrl = URL.createObjectURL(file);
  ui.preview.src = state.previewUrl;
  ui.preview.hidden = false;
  ui.drop.classList.add("has-file");
  ui.submit.disabled = false;
  ui.submit.textContent = copy.submit;
}

ui.input.addEventListener("change", () => {
  const file = ui.input.files && ui.input.files[0];
  if (file) {
    acceptFile(file);
    // Lets the same file be picked again after a rejected attempt.
    ui.input.value = "";
  }
});

["dragenter", "dragover"].forEach(name => {
  ui.drop.addEventListener(name, event => {
    event.preventDefault();
    ui.drop.classList.add("is-dragging");
  });
});

["dragleave", "dragend"].forEach(name => {
  ui.drop.addEventListener(name, () => ui.drop.classList.remove("is-dragging"));
});

ui.drop.addEventListener("drop", event => {
  event.preventDefault();
  ui.drop.classList.remove("is-dragging");
  const file = event.dataTransfer && event.dataTransfer.files[0];
  if (file) acceptFile(file);
});

// Dropping anywhere else must not navigate away from the page.
window.addEventListener("dragover", event => event.preventDefault());
window.addEventListener("drop", event => event.preventDefault());

// --- the default accessory and chair ---------------------------------------

let defaultsPromise = null;

function loadDefaults() {
  if (!defaultsPromise) {
    defaultsPromise = Promise.all(
      [accessoryUrl, chairUrl].map(url =>
        fetch(url).then(response => {
          if (!response.ok) throw new Error(`default asset ${response.status}`);
          return response.blob();
        })
      )
    ).catch(error => {
      defaultsPromise = null;
      throw error;
    });
  }
  return defaultsPromise;
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
  if (!state.file || state.busy) return;

  state.busy = true;
  setError("");
  show("waiting");
  startClock();

  const controller = new AbortController();
  state.controller = controller;

  try {
    const [accessory, chair] = await loadDefaults();
    const body = new FormData();
    body.append("person_and_fabric", state.file, state.file.name);
    body.append("accessory", accessory, "accessory.png");
    body.append("chair", chair, "chair.png");

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
  clearFile();
  setError("");
  show("form");
});

// base.css hides the native pointer on every element.
new Cursor(document.querySelector(".cursor"));
