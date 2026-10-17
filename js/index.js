import { Showcase } from "./Showcase";
import { Slides } from "./Slides";
import { Sheet } from "./Sheet";
import { Cursor } from "./Cursor";
import { Progress } from "./Progress";
import tujia from "../images/岩墙花.jpg";
import tujiaDepth from "../images/岩墙花-depth.png";
import jiumeihua from "../images/九朵梅.jpg";
import jiumeihuaDepth from "../images/九朵梅-depth.png";
import yizihua from "../images/椅子花.jpg";
import yizihuaDepth from "../images/椅子花-depth.png";
import liyu from "../images/鲤鱼跃龙门.jpg";
import liyuDepth from "../images/鲤鱼跃龙门-depth.png";
import yangqueniao from "../images/阳雀鸟.jpg";
import yangqueniaoDepth from "../images/阳雀鸟-depth.png";

const container = document.getElementById("app");
// #app clips the canvas with overflow: hidden, which still makes it a scroll
// container: focusing an element inside it can make the browser scroll it and
// shift the whole composition. Nothing here scrolls, so keep it pinned.
container.addEventListener("scroll", () => {
  container.scrollTop = 0;
  container.scrollLeft = 0;
});
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
    meta: "最难岩墙椅子花",
    detail:
      "<p>岩墙花取土家山寨的层叠石墙入纹：直线与方块交错堆叠，远看像一堵起伏的岩壁。土家有「最难岩墙椅子花」的说法，说的就是它织造的繁复。</p><p>顺着每一道墙缝去看，能找到重复的节奏——那是织娘把山寨的壮阔，一寸一寸织进了布面。</p>"
  },
  {
    image: jiumeihua,
    depth: jiumeihuaDepth,
    // 与第一张同一套处理：桌面保留完整人物、照片收成右侧竖画面，
    // y 略抬到 0.58 是因为这张的头饰更高，避免切到银冠顶部。
    focus: { x: 0.3, y: 0.58, zoom: 1.6 },
    // 竖屏手机：整幅照片高度 + 两侧轻微裁切，人物与织锦都在画面内。
    focusMobile: { x: 0.45, y: 0.55, zoom: 1.5 },
    title: "九朵梅",
    meta: "九梅含韧久安康",
    detail:
      "<p>清代蚕丝织锦，主体是九朵简化的梅花。梅花在土家织锦里象征坚韧，「九」取长久之意，合起来是长久安康。</p><p>九朵并非简单重复：花心与枝丫的走向一直在变，整幅布因此有了呼吸感。</p>"
  },
  {
    image: yizihua,
    depth: yizihuaDepth,
    // 竖图同一套处理；y 抬到 0.60 是因为人物与横织锦整体偏上。
    focus: { x: 0.3, y: 0.6, zoom: 1.6 },
    focusMobile: { x: 0.48, y: 0.55, zoom: 1.45 },
    title: "椅子花",
    meta: "椅织锦纹藏巧艺",
    detail:
      "<p>把土家木屋里的太师椅提炼成几何图案——靠背、扶手、椅腿都被压平成方块与折线。</p><p>它考的是织工是否工整：线条一旦歪斜，椅子就散了架，所以在西兰卡普里属于高难纹样。</p>"
  },
  {
    image: liyu,
    depth: liyuDepth,
    // 横图：桌面用 <1 的 zoom 把整张照片缩成右侧卡片（左 30% 留暗底给标题，
    // 与竖图那几张的观感一致）；手机上 cover 本身已裁到 28.6% 宽，zoom 1 即可。
    focus: { x: 0.286, y: 0.5, zoom: 0.68 },
    focusMobile: { x: 0.52, y: 0.5, zoom: 1 },
    title: "鲤鱼跃龙门",
    meta: "鲤跃锦图盼前程",
    detail:
      "<p>晚近融合进来的吉祥纹样，红、黑、蓝三色搭配，画面饱满热闹。鲤鱼跃过龙门，寄托寒窗成才、前程顺遂的祝愿。</p><p>它比传统几何纹样更像一幅叙事画：鱼、浪、门都铺在同一块布上。</p>"
  },
  {
    image: yangqueniao,
    depth: yangqueniaoDepth,
    // 竖图，人物与斜挂的长织锦偏右下，聚焦点相应右移。
    focus: { x: 0.3, y: 0.5, zoom: 1.6 },
    focusMobile: { x: 0.53, y: 0.55, zoom: 1.5 },
    title: "阳雀鸟",
    meta: "阳雀成双载希望",
    detail:
      "<p>土家的代表性动物纹样。传说阳雀一叫，春耕就开始了，所以它常以成对的姿态出现。</p><p>成双的阳雀象征新生与希望，也寄托着对来年收成的期盼。</p>"
  }
];

// `sheet` is referenced lazily from the slide callback, so declaring it below
// is fine: nothing runs before both are created and mounted.
const slides = new Slides(slidesData, {
  onReadMore: index => sheet.open(index)
});
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

const sheet = new Sheet({
  data: slidesData,
  // Hands the copy its resting rect before the panel starts moving, then
  // takes the gesture over: no zoom out, no drag to switch slides.
  onOpen: index => {
    slides.beginReading(index);
    showcase.setLocked(true);
  },
  // Lets the copy re-measure its resting rect before the new geometry lands.
  onResize: () => slides.measureReading(),
  // One clock for the whole move: the photo recedes, the glass frosts (css)
  // and the copy follows late -- all off the same openness.
  onApply: ({ sheetTop, openness }) => {
    slides.setReading(sheetTop);
    showcase.setRecede(openness);
  },
  onClose: index => {
    showcase.setLocked(false);
    slides.endReading();
    slides.focusReadMore(index);
  }
});

showcase.mount(container);
slides.mount(container);
progress.mount(document.body);
sheet.mount(document.body);
showcase.render();

window.addEventListener("resize", function() {
  showcase.onResize();
});

window.addEventListener("mousemove", function(ev) {
  showcase.onMouseMove(ev);
});
