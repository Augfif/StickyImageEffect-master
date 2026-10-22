import * as THREE from "three";
import {
  fragment,
  vertex
} from "./shaders";

// Fake 3D tuning.
// Both knobs were 0.02 / 2deg; dialled back so the 3D reads as a hint of depth
// instead of the photo swinging around.
const PARALLAX_STRENGTH = 0.008; // max shift, as a fraction of the viewport height
const MAX_TILT = (0.8 * Math.PI) / 180; // radians, camera like plane tilt
const BACKGROUND_COLOR = 0x131319; // matches #app in css/styles.css
// Cover keeps a small border so the parallax never samples outside the photo.
const COVER_MARGIN = 0.97;
// Must stay in sync with "@media (min-width: 53em)" in css/styles.css: above it
// the desktop composition applies, below it slides may use their phone crop.
const DESKTOP_QUERY = "(min-width: 53em)";

// Flat depth: used before a depth map is decoded and whenever one is missing,
// so a slide without a depth map simply has no parallax instead of breaking.
function clampUnit(value) {
  if (typeof value !== "number" || isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function createFlatDepthTexture() {
  const texture = new THREE.DataTexture(
    new Uint8Array([128, 128, 128, 255]),
    1,
    1,
    THREE.RGBAFormat
  );
  texture.needsUpdate = true;
  return texture;
}

function GLManager(data) {
  this.data = data;
  this.totalEntries = data.length;
  this.loadedEntries = 0;
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
  camera.position.z = 5;

  const scene = new THREE.Scene();
  camera.lookAt = scene.position;

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  this.render = this.render.bind(this);
  this.loader = new THREE.TextureLoader();
  this.textures = data.map((entry, i) =>
    this.loader.load(entry.image, texture => {
      // Photos are not power-of-two. three.js only forces them onto a POT
      // canvas (which floors the size to 1024 and squashes the aspect) when
      // mipmapping is on, so keep mipmaps off: NPOT is fine with
      // ClampToEdge + Linear filtering and the photo stays at full detail.
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      this.onImageLoaded(i, texture);
    })
  );
  this.depths = data.map((entry, i) => {
    const flat = createFlatDepthTexture();
    // Fabric-only interludes have no depth map; the flat texture is already
    // the correct neutral fallback.
    if (!entry.depth) return flat;
    this.loader.load(
      entry.depth,
      texture => {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = false;
        this.depths[i] = texture;
        this.applyDepthUniforms();
        this.render();
      },
      undefined,
      () => {
        console.warn(
          `[GLManager] no depth map for "${entry.image}", running without parallax`
        );
      }
    );
    return flat;
  });
  this.fits = data.map(d => new THREE.Vector2(1, 1));
  this.focuses = data.map(d => new THREE.Vector2(0.5, 0.5));
  this.currentIndex = 0;
  this.nextIndex = 0;
  this.textureProgress = 0;
  this.camera = camera;
  this.scene = scene;
  this.renderer = renderer;
  this.initialRender = false;
  this.time = 0;
  this.loopRaf = null;
  this.loop = this.loop.bind(this);
}
GLManager.prototype.getViewSize = function () {
  const fovInRadians = (this.camera.fov * Math.PI) / 180;
  const viewSize = Math.abs(
    this.camera.position.z * Math.tan(fovInRadians / 2) * 2
  );

  return viewSize;
};

GLManager.prototype.getPlaneSize = function () {
  const viewSize = this.getViewSize();
  return {
    width: viewSize * 1.5,
    // The extra height is the margin the tilt and the parallax need so their
    // offsets never pull the plane's edge into view.
    height: viewSize * 1.12
  };
};
// The plane is bigger than the visible frustum so that the stick, wave and
// parallax offsets never reveal its edges. This is the plane UV to viewport
// UV scale. The camera keeps its default aspect of 1, so the visible frustum
// is viewSize wide and viewSize tall in world units: a plane UV unit covers
// exactly plane.width (or plane.height) viewport widths.
GLManager.prototype.getPlaneViewportScale = function () {
  const viewSize = this.getViewSize();
  const plane = this.getPlaneSize();

  return new THREE.Vector2(
    plane.width / viewSize,
    plane.height / viewSize
  );
};
// Per image fit, in image UV per viewport UV: below 1 crops the picture to
// fill the screen (cover), above 1 lets the shader letterbox it (contain).
// A slide may add `focus: { x, y, zoom }` to compose the crop around a
// subject: x/y is the image point that ends up in the middle of the screen
// and zoom > 1 pushes in (zoom < 1 pulls out).
GLManager.prototype.calculateFit = function (index, texture) {
  const image = texture.image;
  if (!image) return;

  const entry = this.data[index] || {};
  const isDesktop = window.matchMedia(DESKTOP_QUERY).matches;
  const focus =
    (isDesktop ? entry.focus : entry.focusMobile || entry.focus) || {};
  const zoom = focus.zoom > 0 ? focus.zoom : 1;
  const viewportAspect = window.innerWidth / window.innerHeight;
  const imageAspect = image.width / image.height;
  const ratio = viewportAspect / imageAspect;

  const cover =
    ratio >= 1
      ? new THREE.Vector2(COVER_MARGIN, COVER_MARGIN / ratio)
      : new THREE.Vector2(COVER_MARGIN * ratio, COVER_MARGIN);
  const contain =
    ratio >= 1
      ? new THREE.Vector2(ratio, 1)
      : new THREE.Vector2(1, 1 / ratio);

  // Portrait photos are shown whole with dark margins on the sides,
  // landscape photos keep filling the screen.
  this.fits[index] = (imageAspect < 1 ? contain : cover).multiplyScalar(
    1 / zoom
  );
  this.focuses[index] = new THREE.Vector2(
    clampUnit(focus.x),
    clampUnit(focus.y)
  );

  if (!this.mesh) return;
  if (this.currentIndex === index) {
    this.mesh.material.uniforms.u_textureFit.value = this.fits[index];
    this.mesh.material.uniforms.u_textureFocus.value = this.focuses[index];
  }
  if (this.nextIndex === index) {
    this.mesh.material.uniforms.u_texture2Fit.value = this.fits[index];
    this.mesh.material.uniforms.u_texture2Focus.value = this.focuses[index];
  }
};
GLManager.prototype.onImageLoaded = function (index, texture) {
  this.calculateFit(index, texture);
  if (this.initialRender) {
    this.loadedEntries++;
    if (this.loadedEntries === this.totalEntries) {
      document.body.classList.remove('loading');
    }
    this.render();
  }
};
GLManager.prototype.applyDepthUniforms = function () {
  if (!this.mesh) return;
  this.mesh.material.uniforms.u_depth.value = this.depths[this.currentIndex];
  this.mesh.material.uniforms.u_depth2.value = this.depths[this.nextIndex];
};
// Plane Stuff
GLManager.prototype.createPlane = function () {
  // Calculate bas of Isoceles triangle(camera)
  const viewSize = this.getViewSize();
  const {
    width,
    height
  } = this.getPlaneSize();

  const segments = 60;
  const geometry = new THREE.PlaneBufferGeometry(
    width,
    height,
    segments,
    segments
  );
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_texture: {
        type: "t",
        value: this.textures[this.currentIndex]
      },
      u_texture2: {
        type: "t",
        value: this.textures[this.nextIndex]
      },
      u_depth: {
        type: "t",
        value: this.depths[this.currentIndex]
      },
      u_depth2: {
        type: "t",
        value: this.depths[this.nextIndex]
      },
      u_textureFit: {
        type: "v2",
        value: this.fits[this.currentIndex]
      },
      u_texture2Fit: {
        type: "v2",
        value: this.fits[this.nextIndex]
      },
      u_textureFocus: {
        type: "v2",
        value: this.focuses[this.currentIndex]
      },
      u_texture2Focus: {
        type: "v2",
        value: this.focuses[this.nextIndex]
      },
      u_fabric1: {
        type: "f",
        value: this.data[this.currentIndex]?.motion === "pull" ? 1 : 0
      },
      u_fabric2: {
        type: "f",
        value: this.data[this.nextIndex]?.motion === "pull" ? 1 : 0
      },
      u_fabricPull: {
        type: "f",
        value: 0
      },
      u_planeViewportScale: {
        type: "v2",
        value: this.getPlaneViewportScale()
      },
      u_textureProgress: {
        type: "f",
        value: this.textureProgress
      },
      u_offset: {
        type: "f",
        value: 8
      },
      u_progress: {
        type: "f",
        value: 0
      },
      u_direction: {
        type: "f",
        value: 1
      },
      u_effect: {
        type: "f",
        value: 0
      },
      u_time: {
        type: "f",
        value: this.time
      },
      u_waveIntensity: {
        type: "f",
        value: 0
      },
      u_resolution: {
        type: "v2",
        value: new THREE.Vector2(window.innerWidth, window.innerHeight)
      },
      u_mouse: {
        type: "v2",
        value: new THREE.Vector2(0, 0)
      },
      u_parallaxStrength: {
        type: "f",
        value: PARALLAX_STRENGTH
      },
      u_background: {
        type: "v3",
        value: new THREE.Color(BACKGROUND_COLOR)
      }
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  this.scene.add(mesh);
  this.mesh = mesh;
};
GLManager.prototype.updateTexture = function (newIndex, progress) {
  let didChange = false;
  if (newIndex != null && this.newIndex !== this.currentIndex) {
    this.currentIndex = this.nextIndex;
    this.nextIndex = newIndex;
    this.textureProgress = 0;
    this.mesh.material.uniforms.u_textureProgress.value = 0;
    this.mesh.material.uniforms.u_texture.value = this.textures[
      this.currentIndex
    ];
    this.mesh.material.uniforms.u_texture2.value = this.textures[newIndex];
    this.mesh.material.uniforms.u_textureFit.value = this.fits[this.currentIndex];
    this.mesh.material.uniforms.u_texture2Fit.value = this.fits[newIndex];
    this.mesh.material.uniforms.u_textureFocus.value = this.focuses[
      this.currentIndex
    ];
    this.mesh.material.uniforms.u_texture2Focus.value = this.focuses[newIndex];
    this.mesh.material.uniforms.u_fabric1.value =
      this.data[this.currentIndex]?.motion === "pull" ? 1 : 0;
    this.mesh.material.uniforms.u_fabric2.value =
      this.data[newIndex]?.motion === "pull" ? 1 : 0;
    this.mesh.material.uniforms.u_depth.value = this.depths[this.currentIndex];
    this.mesh.material.uniforms.u_depth2.value = this.depths[newIndex];

    didChange = true;
  }
  if (progress != null && progress !== this.textureProgress) {
    this.mesh.material.uniforms.u_textureProgress.value = progress;
    this.textureProgress = progress;
    didChange = true;
  }

  if (!this.loopRaf && didChange) {
    this.render();
  }
};
GLManager.prototype.updateStickEffect = function ({
  progress,
  direction,
  waveIntensity
}) {
  this.mesh.material.uniforms.u_progress.value = progress;
  this.mesh.material.uniforms.u_direction.value = direction;
  this.mesh.material.uniforms.u_waveIntensity.value = waveIntensity;
  // this.render();
};

// Fabric slides use this instead of the usual photo-only deformation. The
// value is already normalized to a small UV offset by Showcase.
GLManager.prototype.updateFabricPull = function (pull) {
  if (!this.mesh) return;
  this.mesh.material.uniforms.u_fabricPull.value = pull;
  if (!this.loopRaf) this.render();
};

// Pointer position, normalized to [-1, 1] and smoothed by Showcase's spring,
// drives the fake 3D parallax and the plane tilt.
GLManager.prototype.updateMouseEffect = function ({
  position
}) {
  const halfWidth = window.innerWidth / 2;
  const halfHeight = window.innerHeight / 2;

  // +1 at the right edge and +1 at the top edge, so the shader can push the
  // close pixels towards the pointer with a single sign for both axes.
  const mouse = new THREE.Vector2(
    (position.x - halfWidth) / halfWidth,
    (halfHeight - position.y) / halfHeight
  );
  this.mesh.material.uniforms.u_mouse.value = mouse;

  // Camera like tilt: the side the pointer is on leans towards the viewer.
  this.mesh.rotation.y = -mouse.x * MAX_TILT;
  this.mesh.rotation.x = mouse.y * MAX_TILT;

  if (!this.loopRaf) {
    this.render();
  }
};
// Other stuff
GLManager.prototype.render = function () {
  if (!this.initialRender) {
    this.initialRender = true;
  }
  this.renderer.render(this.scene, this.camera);
};
GLManager.prototype.mount = function (container) {
  container.appendChild(this.renderer.domElement);
};
GLManager.prototype.unmount = function () {
  this.mesh.material.dispose();
  this.mesh.geometry.dispose();
  this.mesh = null;
  this.renderer = null;
  this.camera = null;
  this.scene = null;
  this.container = null;
};
GLManager.prototype.onResize = function () {
  this.renderer.setSize(window.innerWidth, window.innerHeight);
  this.mesh.material.uniforms.u_resolution.value = new THREE.Vector2(
    window.innerWidth,
    window.innerHeight
  );
  this.mesh.material.uniforms.u_planeViewportScale.value = this.getPlaneViewportScale();
  // this.camera.aspect = window.inenrWidth / window.innerHeight;
  // this.camera.updateProjectionMatrix();
  for (var i = 0; i < this.textures.length; i++) {
    if (this.textures[i].image) {
      this.calculateFit(i, this.textures[i]);
    }
  }

  this.render();
};

// The camera pushing in while the glass rises. Scaling the canvas with css
// rather than the shader keeps this out of the render loop entirely: the
// compositor does it, and the long press zoom in the shader (u_progress) is a
// different gesture that can never run at the same time.
GLManager.prototype.setRecede = function (progress) {
  const element = this.renderer && this.renderer.domElement;
  if (!element) return;
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0.001) {
    element.style.transform = "";
    return;
  }
  element.style.transform = `translateY(${-1 * p}%) scale(${1 + 0.045 * p})`;
};

GLManager.prototype.scheduleLoop = function () {
  if (this.loopRaf) return;
  this.loop();
};

GLManager.prototype.loop = function () {
  this.render();
  this.time += 0.1;
  this.mesh.material.uniforms.u_time.value = this.time;

  this.loopRaf = requestAnimationFrame(this.loop);
};

GLManager.prototype.cancelLoop = function () {
  cancelAnimationFrame(this.loopRaf);
  this.loopRaf = null;
};

export {
  GLManager
};
