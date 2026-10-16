import yanqianghua from "../../images/岩墙花.jpg";
import jiumeihua from "../../images/九朵梅.jpg";
import yizihua from "../../images/椅子花.jpg";
import liyu from "../../images/鲤鱼跃龙门.jpg";
import yangqueniao from "../../images/阳雀鸟.jpg";

/**
 * The only file you need to edit for the opener.
 *
 * `image: null` slots are the ones still waiting for a photo: the camera
 * still flies past them, they just render as a dark empty frame with no text.
 * Drop a picture in and give it a title / meta and it joins the sequence --
 * the camera path is generated from the array, so nothing else changes.
 */
export const introBeats = [
  { image: yanqianghua, title: "岩墙花", meta: "最难岩墙椅子花" },
  { image: jiumeihua, title: "九朵梅", meta: "九梅含韧久安康" },
  { image: yizihua, title: "椅子花", meta: "椅织锦纹藏巧艺" },
  { image: liyu, title: "鲤鱼跃龙门", meta: "鲤跃锦图盼前程" },
  { image: yangqueniao, title: "阳雀鸟", meta: "阳雀成双载希望" },
  // 以下五张还没放进 images/，先占位
  { image: null, title: "", meta: "" },
  { image: null, title: "", meta: "" },
  { image: null, title: "", meta: "" },
  { image: null, title: "", meta: "" },
  { image: null, title: "", meta: "" }
];

export const introCopy = {
  title: "土家织锦",
  subtitle: "十幅纹样，十种祝愿",
  // The two doors at the end of the scroll. `hint` is the small second line
  // inside the ring -- keep it short enough to sit on one line.
  //
  // A label may carry markup. `.latin` wraps a run of latin letters so css can
  // bring it down to the width of one brush glyph: the opener draws its copy in
  // STXingkai, whose latin is both wider and heavier than its chinese, and an
  // unmarked "AI" ended up occupying a glyph and a half next to the 互动.
  actions: {
    main: { label: "赏织锦", hint: "浏览织锦纹样" },
    ai: { label: '<span class="latin">AI</span>互动', hint: "即将上线" }
  },
  skip: "跳过",
  scrollHint: "向下滚动"
};
