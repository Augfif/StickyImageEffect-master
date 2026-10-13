import * as THREE from "three";

// Matches #app in css/styles.css and the slideshow's background, so the two
// pages feel like the same room.
const BACKGROUND = 0x131319;
// Corridor geometry. Every camera move is derived from the beat index, so the
// ten slots line up without anyone hand placing ten camera poses.
const START_Z = -9;
const BEAT_GAP = 7.4;
const PLANE_LONG_EDGE = 8.2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

// Where a beat's plane hangs in the corridor: alternating sides, receding
// depth, a gentle high / low sway, turned slightly towards the centre line.
function slotFor(index) {
  const side = index % 2 === 0 ? -1 : 1;
  return {
    side,
    x: side * (2.5 + (index % 3) * 0.6),
    y: ((index % 4) - 1.5) * 0.85,
    z: START_Z - index * BEAT_GAP,
    rotationY: -side * 0.32
  };
}

// Camera pose for a beat: parked back and a little above the plane, looking
// across at it from the other side of the corridor.
function cameraPoseFor(slot) {
  return {
    position: new THREE.Vector3(slot.x * 0.25, slot.y * 0.8 + 0.5, slot.z + 7.8),
    target: new THREE.Vector3(slot.x * 0.55, slot.y * 0.9, slot.z)
  };
}

export function createIntroScene(canvas, beats, options = {}) {
  const reduced = !!options.reduced;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.fog = new THREE.Fog(BACKGROUND, 16, 82);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 240);
  scene.add(camera);

  const loader = new THREE.TextureLoader();
  const planes = [];
  const cameraPoints = [];
  const targetPoints = [];

  beats.forEach((beat, index) => {
    const slot = slotFor(index);
    const pose = cameraPoseFor(slot);
    cameraPoints.push(pose.position);
    targetPoints.push(pose.target);

    // Land on either side of the corridor, turned towards the middle.
    const group = new THREE.Group();
    group.position.set(slot.x, slot.y, slot.z);
    group.rotation.y = slot.rotationY;
    scene.add(group);

    // Placeholders are a dark pane with a hairline outline, so the rhythm of
    // the sequence still reads while the photos are missing.
    const geometry = new THREE.PlaneBufferGeometry(
      PLANE_LONG_EDGE * 0.75,
      PLANE_LONG_EDGE
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x15151b,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);

    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        fog: true
      })
    );
    group.add(frame);

    // A soft halo behind every pane keeps the corridor from reading as empty
    // black between beats.
    const halo = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(PLANE_LONG_EDGE * 1.5, PLANE_LONG_EDGE * 1.7),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: true
      })
    );
    halo.position.z = -0.2;
    group.add(halo);

    planes.push({
      group,
      mesh,
      material,
      frame,
      halo,
      index,
      opacity: 0.5,
      driftPhase: index * 1.7,
      baseY: slot.y
    });
  });

  const cameraCurve = new THREE.CatmullRomCurve3(
    cameraPoints,
    false,
    "catmullrom",
    0.5
  );
  const targetCurve = new THREE.CatmullRomCurve3(
    targetPoints,
    false,
    "catmullrom",
    0.5
  );

  // Entry pose for the opening move: well outside the corridor, looking at the
  // first beat, so the auto-play reads as a camera pushing in.
  const firstPose = cameraPoseFor(slotFor(0));
  const entryPosition = firstPose.position.clone().add(new THREE.Vector3(0, 4.4, 34));
  const entryTarget = firstPose.target.clone();

  let progress = 0; // 0..1 along the camera curve
  let introBlend = 1; // 1 = entry pose, 0 = the curve
  let running = false;
  let raf = null;
  let time = 0;

  const workingPosition = new THREE.Vector3();
  const workingTarget = new THREE.Vector3();

  function sizeToViewport() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function fitPlane(entry, texture) {
    const image = texture.image;
    if (!image || !image.width) return;
    const portrait = image.height >= image.width;
    const height = portrait ? PLANE_LONG_EDGE : PLANE_LONG_EDGE * (image.height / image.width);
    const width = portrait ? PLANE_LONG_EDGE * (image.width / image.height) : PLANE_LONG_EDGE;
    const geometry = new THREE.PlaneBufferGeometry(width, height);
    entry.mesh.geometry.dispose();
    entry.mesh.geometry = geometry;
    entry.frame.geometry.dispose();
    entry.frame.geometry = new THREE.EdgesGeometry(geometry);
  }

  function onTexture(entry, texture) {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    fitPlane(entry, texture);
    entry.material.map = texture;
    entry.material.color.set(0xffffff);
    entry.material.needsUpdate = true;
    entry.frame.material.opacity = 0;
  }

  function load() {
    const jobs = beats.map((beat, index) => {
      if (!beat.image) return Promise.resolve();
      return new Promise(resolve => {
        loader.load(
          beat.image,
          texture => {
            onTexture(planes[index], texture);
            resolve();
          },
          undefined,
          () => resolve() // a missing photo must not hold up the opener
        );
      });
    });
    return Promise.all(jobs);
  }

  function render() {
    time += 1 / 60;

    const curvePoint = cameraCurve.getPointAt(clamp(progress, 0, 1));
    const lookPoint = targetCurve.getPointAt(clamp(progress, 0, 1));

    workingPosition.copy(entryPosition).lerp(curvePoint, 1 - introBlend);
    workingTarget.copy(entryTarget).lerp(lookPoint, 1 - introBlend);
    camera.position.copy(workingPosition);
    camera.lookAt(workingTarget);

    const active = clamp(progress, 0, 1) * (beats.length - 1);

    for (let i = 0; i < planes.length; i++) {
      const plane = planes[i];
      const distance = Math.abs(active - i);
      // The beat the camera is parked on stays bright, its neighbours fall
      // back, and anything further away is fog anyway.
      const focus = 1 - clamp(distance, 0, 1);
      const target = 0.45 + 0.55 * focus * focus;
      plane.opacity = lerp(plane.opacity, target, 0.12);
      plane.material.opacity = plane.opacity;
      if (plane.halo) {
        plane.halo.material.opacity = 0.05 * plane.opacity;
      }
      if (plane.frame.material.opacity > 0.001) {
        plane.frame.material.opacity = 0.22 * plane.opacity;
      }
      if (!reduced) {
        plane.group.position.y =
          plane.baseY + Math.sin(time * 0.42 + plane.driftPhase) * 0.09;
        plane.group.rotation.z =
          Math.sin(time * 0.31 + plane.driftPhase) * 0.006;
      }
    }

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(render);
  }

  return {
    load,
    start() {
      if (running) return;
      running = true;
      sizeToViewport();
      raf = requestAnimationFrame(render);
    },
    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    resize: sizeToViewport,
    setProgress(value) {
      progress = clamp(value, 0, 1);
    },
    setIntroBlend(value) {
      introBlend = clamp(value, 0, 1);
    },
    dispose() {
      this.stop();
      renderer.dispose();
    }
  };
}
