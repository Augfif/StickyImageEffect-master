import {
  GLManager
} from "./GLManager";
import {
  spring,
  parallel
} from "popmotion";
import {
  Grab
} from "./Grab";
import {
  reach
} from "./reach";

// onFullscreenStart
// onFullscreenFinish
// onZoomOutStart
// onZoomOutFinish
// onAciveIndexChange
// onIndexChange
function Showcase(data, options = {}) {
  this.GL = new GLManager(data);
  this.GL.createPlane();

  this.data = data;

  this.progress = 0;
  this.direction = 1;
  this.waveIntensity = 0;

  // Set while the copy sheet is open: the slideshow keeps whatever pose it
  // was in, but no new zoom out / drag gesture can start.
  this.locked = false;
  // True between onGrabStart and onGrabEnd, so a gesture that was already in
  // flight when the sheet opened is still allowed to finish.
  this.grabbing = false;

  this.options = options;

  this.index = {
    target: 0,
    current: 0,
    initial: 0,
    scrollSize: window.innerHeight / 6,
    active: 0
  };

  // Start at the middle of the viewport, so the very first mouse move does
  // not sweep the parallax in from a corner.
  this.follower = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  this.followerSpring = null;

  this.slidesSpring = null;

  // this.slides = new Slides(data);

  this.grab = new Grab({
    onGrabStart: this.onGrabStart.bind(this),
    onGrabMove: this.onGrabMove.bind(this),
    onGrabEnd: this.onGrabEnd.bind(this)
  });
}

Showcase.prototype.mount = function (container) {
  this.GL.mount(container);
  // this.slides.mount(container);
  // container.appendChild(this.slidesContainer);
};
Showcase.prototype.render = function () {
  this.GL.render();
};

function clamp(num, min, max) {
  return Math.max(min, Math.min(num, max));
}

Showcase.prototype.onMouseMove = function (ev) {
  if (this.locked) return;

  if (this.followerSpring) {
    this.followerSpring.stop();
    this.followerSpring = null;
    // this.follower.vx = 0;
    // this.follower.vy = 0;
  }

  this.followerSpring = reach({
    from: {
      x: this.follower.x,
      y: this.follower.y
    },
    to: {
      x: ev.clientX,
      y: ev.clientY
    },
    velocity: {
      x: this.follower.vx,
      y: this.follower.vy
    },
    stiffness: 500,
    damping: 50,
    mass: 1
  }).start({
    update: position => {
      const velocity = {
        x: position.x - this.follower.x,
        y: position.y - this.follower.y
      };
      this.GL.updateMouseEffect({
        position
      });
      this.follower = {
        x: position.x,
        y: position.y,
        vx: velocity.x,
        vy: velocity.y
      };
    },
    complete: () => {
      this.GL.updateMouseEffect({
        position: this.follower
      });
      this.follower.vx = 0;
      this.follower.vy = 0;
    }
  });
};

Showcase.prototype.onGrabMove = function (scroll) {
  if (this.locked && !this.grabbing) return;

  this.index.target = clamp(
    this.index.initial + scroll.delta / this.index.scrollSize,
    -this.data.length + 0.51,
    0.49
  );

  const index = clamp(Math.round(-this.index.target), 0, this.data.length - 1);

  if (this.index.active !== index) {
    this.index.active = index;
    if (this.options.onActiveIndexChange) {
      this.options.onActiveIndexChange(this.index.active);
    }
    // this.slides.onActiveIndexChange(this.index.active);

    this.GL.updateTexture(index);
    if (this.textureProgressSpring) {
      this.textureProgressSpring.stop();
      this.textureProgressSpring = null;
    }
    this.textureProgressSpring = spring({
      from: 0,
      to: 1,
      stiffness: 400,
      damping: 30
    }).start(val => {
      this.GL.updateTexture(null, val);
    });
  }

  if (this.slidesPop) {
    this.slidesPop.stop();
  }
  this.slidesPop = reach({
    from: {
      index: this.index.current
    },
    to: {
      index: this.index.target
    },
    restDelta: 0.001
  }).start({
    update: val => {
      // this.slides.onMove(index);
      if (this.options.onIndexChange) {
        this.options.onIndexChange(val.index);
      }
      this.index.current = val.index;
    },
    complete: val => {
      if (this.options.onIndexChange) {
        this.options.onIndexChange(val.index);
      }
      this.index.current = val.index;
    }
  });
};
Showcase.prototype.onGrabStart = function () {
  if (this.locked) return;
  this.grabbing = true;

  if (this.options.onZoomOutStart) {
    this.options.onZoomOutStart({
      activeIndex: this.index.active
    });
  }
  // this.slides.appear();
  this.index.initial = this.index.current;

  if (this.GLStickPop) {
    this.GLStickPop.stop();
  }
  this.GL.scheduleLoop();

  const directionSpring = spring({
    from: this.progress === 0 ? 0 : this.direction,
    to: 0,
    mass: 1,
    stiffness: 800,
    damping: 2000
  });
  const progressSpring = spring({
    from: this.progress,
    to: 1,
    mass: 5,
    stiffness: 350,
    damping: 500
  });

  const waveTarget = this.data[this.index.active]?.waveIntensity ?? 0.5;
  const waveIntensitySpring = spring({
    from: this.waveIntensity,
    to: waveTarget,
    mass: 5,
    stiffness: 10,
    damping: 200
  });
  this.GLStickPop = parallel(
    progressSpring,
    directionSpring,
    waveIntensitySpring
  ).start({
    update: values => {
      if (this.progress !== values[0]) {}
      this.progress = values[0];
      this.direction = values[1];
      this.waveIntensity = values[2];

      this.GL.updateStickEffect({
        progress: this.progress,
        direction: this.direction,
        waveIntensity: this.waveIntensity
      });
    },
    complete: () => {
      if (this.options.onZoomOutFinish) {
        this.options.onZoomOutFinish({
          activeIndex: this.index.active
        });
      }
    }
  });
};
Showcase.prototype.snapCurrentToActiveIndex = function () {
  if (this.slidesPop) {
    this.slidesPop.stop();
  }
  this.slidesPop = reach({
    from: {
      index: this.index.current
    },
    to: {
      index: Math.round(this.index.target)
    },
    restDelta: 0.001
  }).start({
    complete: () => {},
    update: val => {
      // this.slides.onMove(val);
      if (this.options.onIndexChange) {
        this.options.onIndexChange(val.index);
      }
      this.index.current = val.index;
    }
  });
};

Showcase.prototype.onGrabEnd = function () {
  if (this.locked && !this.grabbing) return;
  this.grabbing = false;

  if (this.options.onFullscreenStart) {
    this.options.onFullscreenStart({
      activeIndex: this.index.active
    });
  }
  // this.slides.disperse(this.index.active);

  this.snapCurrentToActiveIndex();

  if (this.GLStickPop) {
    this.GLStickPop.stop();
  }
  const directionSpring = spring({
    from: this.progress === 1 ? 1 : this.direction,
    to: 1,
    mass: 1,
    stiffness: 800,
    damping: 2000
  });
  const progressSpring = spring({
    from: this.progress,
    to: 0,
    mass: 4,
    stiffness: 400,
    damping: 70,
    restDelta: 0.0001
  });
  const waveIntensitySpring = spring({
    from: this.waveIntensity,
    to: 0,
    mass: 0.1,
    stiffness: 800,
    damping: 50
  });

  this.GLStickPop = parallel(
    progressSpring,
    directionSpring,
    waveIntensitySpring
  ).start({
    update: values => {
      this.progress = values[0];
      this.direction = values[1];
      this.waveIntensity = values[2];
      this.GL.updateStickEffect({
        progress: this.progress,
        direction: this.direction,
        waveIntensity: this.waveIntensity
      });
    },
    complete: () => {
      if (this.options.onFullscreenFinish) {
        this.options.onFullscreenFinish({
          activeIndex: this.index.active
        });
      }
      this.GL.cancelLoop();
    }
  });
};

Showcase.prototype.onResize = function () {
  this.GL.onResize();
};

Showcase.prototype.setLocked = function (locked) {
  this.locked = !!locked;
  // Belt and braces: the sheet carves itself out of Grab's listeners already,
  // this also stops a press on the photo behind it from creating drag state.
  this.grab.setEnabled(!this.locked);
  if (this.locked && this.followerSpring) {
    this.followerSpring.stop();
    this.followerSpring = null;
  }
};

// First beat of the reading transition: the photo itself backs off a touch, so
// the glass pane reads as a change of scene instead of a slab arriving.
Showcase.prototype.setRecede = function (progress) {
  this.GL.setRecede(progress);
};
export {
  Showcase
};
