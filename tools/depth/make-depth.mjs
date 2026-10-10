/**
 * Prepares the photos the page serves and generates their depth maps:
 *
 *   1. sync  - copy photos that are newer in tujia/ (the drop folder) over to
 *              images/ (the folder the page imports)
 *   2. resize - scale images/*.jpg down to a 2048px long edge: a phone cannot
 *              hold five 12 megapixel textures on the GPU, 2048 is still well
 *              above what any phone or retina screen resolves
 *   3. depth  - write `images/<name>-depth.png`, an 8 bit grayscale disparity
 *              map where bright = close, exactly what the shader expects
 *
 * Usage:
 *   npm --prefix tools/depth install   # once
 *   npm run depth                      # images that are new/changed only
 *   node tools/depth/make-depth.mjs --force
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "onnx-community/depth-anything-v2-small";
const DTYPE = "q8";
const DEPTH_MAX_EDGE = 1600; // depth is smooth, it does not need more
const PHOTO_MAX_EDGE = 2048; // what actually gets uploaded as a texture
const SOURCE_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const DEPTH_SUFFIX = "-depth.png";

const here = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.resolve(here, "..", "..", "images");
const dropDir = path.resolve(here, "..", "..", "tujia");
const force = process.argv.includes("--force");

/** Reads the Windows system proxy, if one is configured. */
function systemProxy() {
  if (process.platform !== "win32") return null;
  try {
    const query = execSync(
      'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" /v ProxyServer',
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const match = query.match(/ProxyServer\s+REG_SZ\s+(\S+)/);
    if (!match) return null;
    return match[1].includes("://") ? match[1] : `http://${match[1]}`;
  } catch {
    return null;
  }
}

/**
 * Node's fetch ignores the system proxy unless NODE_USE_ENV_PROXY was set
 * before the process started, and the first run has to download the model
 * from huggingface.co. So when a proxy is in play, re-launch once with the
 * environment prepared instead of patching the agent at runtime.
 */
function ensureProxy() {
  const envProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const proxy = envProxy || systemProxy();
  if (!proxy) return;

  const ready =
    process.env.DEPTH_PROXY_READY === "1" ||
    (envProxy && process.env.NODE_USE_ENV_PROXY === "1");
  if (ready) {
    console.log(`[depth] proxy in effect: ${proxy}`);
    return;
  }

  console.log(`[depth] re-launching with proxy ${proxy}`);
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        HTTPS_PROXY: proxy,
        HTTP_PROXY: proxy,
        NODE_USE_ENV_PROXY: "1",
        DEPTH_PROXY_READY: "1"
      }
    }
  );
  process.exit(child.status === null ? 1 : child.status);
}

function listSources() {
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`images folder not found: ${imagesDir}`);
  }
  return fs
    .readdirSync(imagesDir)
    .filter((name) => SOURCE_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .filter((name) => !name.toLowerCase().endsWith(DEPTH_SUFFIX))
    .sort()
    .map((name) => {
      const source = path.join(imagesDir, name);
      const target = path.join(
        imagesDir,
        `${path.parse(name).name}${DEPTH_SUFFIX}`
      );
      return { name, source, target };
    });
}

function isUpToDate({ source, target }) {
  if (force || !fs.existsSync(target)) return false;
  return fs.statSync(target).mtimeMs >= fs.statSync(source).mtimeMs;
}

/**
 * The page imports images/, but photos usually get dropped into tujia/ first.
 * Copy anything that is newer there over, so a replaced original is picked up
 * without having to remember which folder the code reads.
 */
function syncDropFolder() {
  if (!fs.existsSync(dropDir)) return 0;
  let copied = 0;
  for (const name of fs.readdirSync(dropDir)) {
    if (!SOURCE_EXTENSIONS.includes(path.extname(name).toLowerCase())) continue;
    const source = path.join(dropDir, name);
    const target = path.join(imagesDir, name);
    const isNewer =
      !fs.existsSync(target) ||
      fs.statSync(source).mtimeMs > fs.statSync(target).mtimeMs;
    if (!isNewer) continue;
    fs.copyFileSync(source, target);
    copied++;
    console.log(`[assets] ${name}: copied from tujia/ (newer than images/)`);
  }
  return copied;
}

/** Scales oversized photos down in place so the GPU upload stays affordable. */
async function normalizePhotos(sharp) {
  const files = fs
    .readdirSync(imagesDir)
    .filter(name => SOURCE_EXTENSIONS.includes(path.extname(name).toLowerCase()))
    .filter(name => !name.toLowerCase().endsWith(DEPTH_SUFFIX));

  let resized = 0;
  for (const name of files) {
    const file = path.join(imagesDir, name);
    // Read into memory first: sharp keeps the source file open (and Windows
    // refuses the rewrite) when it is handed a path.
    const input = fs.readFileSync(file);
    const meta = await sharp(input).metadata();
    const longest = Math.max(meta.width, meta.height);
    if (!longest || longest <= PHOTO_MAX_EDGE) continue;

    const scale = PHOTO_MAX_EDGE / longest;
    const width = Math.round(meta.width * scale);
    const height = Math.round(meta.height * scale);
    const pipeline = sharp(input).resize({
      width,
      height,
      kernel: "lanczos3"
    });
    const buffer = path.extname(name).toLowerCase() === ".png"
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();

    fs.writeFileSync(file, buffer);
    resized++;
    console.log(
      `[assets] ${name}: ${meta.width}x${meta.height} -> ${width}x${height} ` +
        `(${(buffer.length / 1024).toFixed(0)}KB)`
    );
  }
  return resized;
}

function normalizeToBytes(values) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  const span = max - min || 1;
  const bytes = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) {
    bytes[i] = Math.round(((values[i] - min) / span) * 255);
  }
  return bytes;
}

ensureProxy();

const { pipeline } = await import("@huggingface/transformers");
const sharp = (await import("sharp")).default;

// 1. sync + 2. resize happen before anything is measured, so the depth maps
// below always describe the photo the page will actually serve.
syncDropFolder();
await normalizePhotos(sharp);

const jobs = listSources();
const pending = jobs.filter((job) => !isUpToDate(job));

if (jobs.length === 0) {
  console.log(`[depth] no source images in ${imagesDir}`);
  process.exit(0);
}
if (pending.length === 0) {
  console.log(`[depth] all ${jobs.length} depth maps are up to date`);
  process.exit(0);
}

console.log(
  `[depth] ${pending.length}/${jobs.length} image(s) need a depth map (model ${MODEL}, ${DTYPE})`
);
const startedAt = Date.now();
const estimator = await pipeline("depth-estimation", MODEL, { dtype: DTYPE });
console.log(
  `[depth] model ready in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
);

let failed = 0;
for (let i = 0; i < pending.length; i++) {
  const job = pending[i];
  const label = `[${i + 1}/${pending.length}] ${job.name}`;
  try {
    const t0 = Date.now();
    const output = await estimator(job.source);
    const tensor = output.predicted_depth;
    const height = tensor.dims[0];
    const width = tensor.dims[1];
    const pixels = normalizeToBytes(tensor.data);

    const longest = Math.max(width, height);
    const scale = longest > DEPTH_MAX_EDGE ? DEPTH_MAX_EDGE / longest : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const png = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels: 1 }
    })
      .resize({ width: targetWidth, height: targetHeight, kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(job.target, png);
    console.log(
      `${label} -> ${path.basename(job.target)} (${targetWidth}x${targetHeight}, ` +
        `${(png.length / 1024).toFixed(0)}KB, ${((Date.now() - t0) / 1000).toFixed(1)}s)`
    );
  } catch (error) {
    failed++;
    console.log(`${label} FAILED: ${error && error.message ? error.message : error}`);
  }
}

console.log(
  `[depth] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s` +
    (failed ? `, ${failed} failed` : "")
);
process.exit(failed ? 1 : 0);
