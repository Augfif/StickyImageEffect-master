import personRock from "../../images/岩墙花.jpg";
import personPlum from "../../images/九朵梅.jpg";
import personChair from "../../images/椅子花.jpg";
import personCarp from "../../images/鲤鱼跃龙门.jpg";
import personMagpie from "../../images/阳雀鸟.jpg";
import personHook from "../../images/四十八勾.jpg";
import personCatfoot from "../../images/山兴花.jpg";
import personDragon from "../../images/粑粑架.jpg";
import personSuoluo from "../../images/万字格窗花.jpg";
import personMouse from "../../images/老鼠嫁女.jpg";
import stageRock from "../../images/opening/rock-crop.jpg";
import stagePlum from "../../images/opening/plum-crop.jpg";
import stageChair from "../../images/opening/chair.jpg";
import stageCarp from "../../images/opening/carp.jpg";
import stageMagpie from "../../images/opening/magpie-crop.jpg";
import stageHook from "../../images/opening/hook.jpg";
import stageCatfoot from "../../images/opening/catfoot-crop.jpg";
import stageDragon from "../../images/opening/dragonphoenix-crop.jpg";
import stageSuoluo from "../../images/opening/suoluo-crop.jpg";
import stageMouse from "../../images/opening/mouse.jpg";

/**
 * The ten patterns on the AI picker, in reading order.
 *
 * The byte-level assets have two jobs: `images/ai/shots/<slug>.jpg` supplies
 * the rail thumbnails and the backend's fabric file, while `stage` imports the
 * larger crop from images/opening/ for the full-screen cloth. `person` is the
 * modelled photograph used by the second face of the sample book.
 *
 * The full-resolution scans live in `images/ai/source/` only so the shots can
 * be regenerated; neither page fetches them.
 *
 * Shots are discovered from the file names instead of being imported one by
 * one, so dropping a file in is enough:
 *
 *   images/ai/shots/yanqianghua.jpg      the shot
 *   images/ai/shots/yanqianghua-2.jpg    a second angle, cross faded into it
 *
 * A pattern with one shot simply does not cycle, and one with none does not
 * break the build.
 */
const shotUrls = import.meta.glob("../../images/ai/shots/*.jpg", {
  eager: true,
  query: "?url",
  import: "default"
});

const shotsBySlug = new Map();
for (const [path, url] of Object.entries(shotUrls)) {
  const name = path.split("/").pop().replace(/\.[^.]+$/, "");
  const match = name.match(/^(.+?)(?:-(\d+))?$/);
  if (!match) continue;
  const [, slug, order] = match;
  if (!shotsBySlug.has(slug)) shotsBySlug.set(slug, []);
  shotsBySlug.get(slug).push({ order: order ? Number(order) : 1, url });
}

function shotsFor(slug) {
  const shots = shotsBySlug.get(slug) || [];
  return shots.sort((a, b) => a.order - b.order).map(shot => shot.url);
}

export const patterns = [
  {
    slug: "yanqianghua",
    title: "岩墙花",
    meta: "最难岩墙椅子花",
    stage: stageRock,
    person: personRock,
    personFocus: { x: 50, y: 28 }
  },
  {
    slug: "jiuduomei",
    title: "九朵梅",
    meta: "九梅含韧久安康",
    stage: stagePlum,
    person: personPlum,
    personFocus: { x: 50, y: 30 }
  },
  {
    slug: "yizihua",
    title: "椅子花",
    meta: "椅织锦纹藏巧艺",
    stage: stageChair,
    person: personChair,
    personFocus: { x: 50, y: 34 }
  },
  {
    slug: "liyuyuelongmen",
    title: "鲤鱼跃龙门",
    meta: "鲤跃锦图盼前程",
    stage: stageCarp,
    person: personCarp,
    personFocus: { x: 50, y: 35 }
  },
  {
    slug: "yangqueniao",
    title: "阳雀花",
    meta: "阳雀成双载希望",
    stage: stageMagpie,
    person: personMagpie,
    personFocus: { x: 50, y: 28 }
  },
  // 下面三个用 tujia/ 里那批高清原图（1824–1920 宽）。山兴花与粑粑架这两个
  // 文件名最初起反了，已按《衣载千年》长图的图文对应改正。四十八勾没有长图可以
  // 对照，命名仍待确认；meta 也只是画面描述，不是考据出来的寓意。
  {
    slug: "sishibagou",
    title: "四十八勾",
    meta: "四十八勾巧相扣",
    stage: stageHook,
    person: personHook,
    personFocus: { x: 40, y: 22 }
  },
  {
    slug: "shanxinghua",
    title: "猫脚迹花",
    meta: "山形兴旺万物生",
    stage: stageCatfoot,
    person: personCatfoot,
    personFocus: { x: 50, y: 35 }
  },
  {
    slug: "babajia",
    title: "龙凤呈祥",
    meta: "五谷丰登仓廪盈",
    stage: stageDragon,
    person: personDragon,
    personFocus: { x: 50, y: 35 }
  },
  {
    slug: "wanzigechuanghua",
    title: "梭罗树",
    meta: "万字窗格福常驻",
    stage: stageSuoluo,
    person: personSuoluo,
    personFocus: { x: 50, y: 30 }
  },
  {
    slug: "laoshujianv",
    title: "老鼠嫁女",
    meta: "鼠嫁喜临婚姻美",
    stage: stageMouse,
    person: personMouse,
    personFocus: { x: 45, y: 28 }
  }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.slug);
}
