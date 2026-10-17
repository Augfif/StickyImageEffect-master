import yanqianghua from "../../images/岩墙花.jpg";
import jiumeihua from "../../images/九朵梅.jpg";
import yizihua from "../../images/椅子花.jpg";
import liyu from "../../images/鲤鱼跃龙门.jpg";
import yangqueniao from "../../images/阳雀鸟.jpg";
import sishibagou from "../../images/四十八勾.jpg";
import shanxinghua from "../../images/山兴花.jpg";
import babajia from "../../images/粑粑架.jpg";
import wanzigechuanghua from "../../images/万字格窗花.jpg";
import laoshujianv from "../../images/老鼠嫁女.jpg";

/**
 * The only file you need to edit for the opener.
 *
 * The camera path is generated from this array, so adding, removing or
 * reordering a beat changes nothing else. An entry with `image: null` still
 * joins the sequence -- the camera flies past a dark empty frame with no copy.
 */
export const introBeats = [
  { image: yanqianghua, title: "岩墙花", meta: "最难岩墙椅子花" },
  { image: jiumeihua, title: "九朵梅", meta: "九梅含韧久安康" },
  { image: yizihua, title: "椅子花", meta: "椅织锦纹藏巧艺" },
  { image: liyu, title: "鲤鱼跃龙门", meta: "鲤跃锦图盼前程" },
  { image: yangqueniao, title: "阳雀鸟", meta: "阳雀成双载希望" },
  // 后五个纹样的 meta 也压成七字，与前五条同一节奏。
  { image: sishibagou, title: "四十八勾", meta: "四十八勾巧相扣" },
  { image: shanxinghua, title: "山兴花", meta: "山形兴旺万物生" },
  { image: babajia, title: "粑粑架", meta: "五谷丰登仓廪盈" },
  { image: wanzigechuanghua, title: "万字格窗花", meta: "万字窗格福常驻" },
  { image: laoshujianv, title: "老鼠嫁女", meta: "鼠嫁喜临婚姻美" }
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
    ai: { label: '<span class="latin">AI</span>互动', hint: "生成造型" }
  },
  skip: "跳过",
  scrollHint: "向下滚动"
};
