import { Showcase } from "./Showcase";
import { Slides } from "./Slides";
import { Cursor } from "./Cursor";
import { Progress } from "./Progress";
import image2 from "../images/2.jpg";
import image3 from "../images/3.jpg";
import image4 from "../images/4.jpg";
import image5 from "../images/5.jpg";
import depth2 from "../images/2-depth.png";
import depth3 from "../images/3-depth.png";
import depth4 from "../images/4-depth.png";
import depth5 from "../images/5-depth.png";
import tujia from "../images/岩墙花.jpg";
import tujiaDepth from "../images/岩墙花-depth.png";

const container = document.getElementById("app");
const cursor = new Cursor(document.querySelector(".cursor"));
const slidesData = [
  {
    image: tujia,
    depth: tujiaDepth,
    // 聚焦在画中布匹上：x/y 是落在画面中心的图片坐标（y 自下往上），
    // zoom 越大越近。zoom 1.6 保留完整人物，照片收成右侧一块竖画面。
    focus: { x: 0.3, y: 0.55, zoom: 1.6 },
    // 竖屏手机：视野更窄，用 1.5 倍把整幅照片高度收进来，横向上同时保留
    // 左侧布匹和右侧人物（裁掉最左 14% 与最右 19% 的空白/衣摆）。
    focusMobile: { x: 0.48, y: 0.55, zoom: 1.5 },
    title: "岩墙花",
    meta: "最难岩墙椅子花"
  },
  {
    image: image2,
    depth: depth2,
    title: "Barcelona",
    meta: "Spain / Catalonia"
  },
  {
    image: image3,
    depth: depth3,
    title: "Málaga",
    meta: "Spain / Andalusia"
  },
  {
    image: image4,
    depth: depth4,
    title: "Pamplona",
    meta: "Spain / Navarre"
  },
  {
    image: image5,
    depth: depth5,
    title: "Bilbao",
    meta: "Spain / Biscay"
  }
];

const slides = new Slides(slidesData);
const progress = new Progress(slidesData.length);
const showcase = new Showcase(slidesData, {
  onActiveIndexChange: activeIndex => {
    slides.onActiveIndexChange(activeIndex);
    progress.setIndex(activeIndex);
  },
  onIndexChange: index => {
    slides.onMove(index);
  },
  onZoomOutStart: ({ activeIndex }) => {
    cursor.enter();
    slides.appear();
    // Long press: pin the knob to the middle of the track.
    progress.setDragging(true);
  },
  onZoomOutFinish: ({ activeIndex }) => {},
  onFullscreenStart: ({ activeIndex }) => {
    cursor.leave();
    slides.disperse(activeIndex);
    // Released: the knob animates back to the slide we landed on.
    progress.setDragging(false);
    progress.setIndex(activeIndex);
  },
  onFullscreenFinish: ({ activeIndex }) => {}
});

showcase.mount(container);
slides.mount(container);
progress.mount(document.body);
showcase.render();

window.addEventListener("resize", function() {
  showcase.onResize();
});

window.addEventListener("mousemove", function(ev) {
  showcase.onMouseMove(ev);
});
