import rock from "../../images/opening/rock-crop.jpg";
import plum from "../../images/opening/plum-crop.jpg";
import chair from "../../images/opening/chair.jpg";
import carp from "../../images/opening/carp.jpg";
import magpie from "../../images/opening/magpie-crop.jpg";
import hook from "../../images/opening/hook.jpg";
import catfoot from "../../images/opening/catfoot-crop.jpg";
import dragonphoenix from "../../images/opening/dragonphoenix-crop.jpg";
import suoluo from "../../images/opening/suoluo-crop.jpg";
import mouse from "../../images/opening/mouse.jpg";

/**
 * The only file you need to edit for the opener.
 *
 * The camera path is generated from this array, so adding, removing or
 * reordering a beat changes nothing else. An entry with `image: null` still
 * joins the sequence -- the camera flies past a dark empty frame with no copy.
 */
export const introBeats = [
  {
    image: rock,
    title: "岩墙花",
    meta: "最难岩墙椅子花",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  {
    image: plum,
    title: "九朵梅",
    meta: "九梅含韧久安康",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  {
    image: chair,
    title: "椅子花",
    meta: "椅织锦纹藏巧艺",
    fabric: { x: 50, y: 50, zoom: 1.05 }
  },
  {
    image: carp,
    title: "鲤鱼跃龙门",
    meta: "鲤跃锦图盼前程",
    fabric: { x: 50, y: 50, zoom: 1.05 }
  },
  {
    image: magpie,
    title: "阳雀花",
    meta: "阳雀成双载希望",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  // 后五个纹样的 meta 也压成七字，与前五条同一节奏。
  {
    image: hook,
    title: "四十八勾",
    meta: "四十八勾巧相扣",
    fabric: { x: 50, y: 50, zoom: 1.05 }
  },
  {
    image: catfoot,
    title: "猫脚迹花",
    meta: "山形兴旺万物生",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  {
    image: dragonphoenix,
    title: "龙凤呈祥",
    meta: "五谷丰登仓廪盈",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  {
    image: suoluo,
    title: "梭罗树",
    meta: "万字窗格福常驻",
    fabric: { x: 50, y: 50, zoom: 1.04 }
  },
  {
    image: mouse,
    title: "老鼠嫁女",
    meta: "鼠嫁喜临婚姻美",
    fabric: { x: 50, y: 50, zoom: 1.05 }
  }
];

export const introCopy = {
  title: "织造万象",
  subtitle: "土家织锦服饰数字展与沉浸式 AI 交互体验",
  // The two fabric cards at the end of the scroll. Keep each hint short
  // enough to sit on one line.
  choice: {
    kicker: "织造万象 · 目录",
    title: "这匹布，接下来怎么用？",
    main: { label: "赏织锦", hint: "十幅纹样 · 左右拖动浏览" },
    ai: { label: "AI 互动", hint: "上传照片 · 换料生成" },
    replay: "重看开场"
  },
  skip: "跳过",
  scrollHint: "向下滚动",
  scrollHintTouch: "向上滑动"
};
