/**
 * The ten patterns on the AI picker, in reading order.
 *
 * The AI pages use their own shots: `images/ai/shots/<slug>.jpg`, i.e. the
 * cloth itself rather than the modelled photographs the opener and the
 * slideshow are built around. Keeping them apart matters -- images/岩墙花.jpg
 * and its depth map are what the three.js pages load, and swapping that file
 * for a flat textile would break their parallax.
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
  { slug: "yanqianghua", title: "岩墙花", meta: "最难岩墙椅子花" },
  { slug: "jiuduomei", title: "九朵梅", meta: "九梅含韧久安康" },
  { slug: "yizihua", title: "椅子花", meta: "椅织锦纹藏巧艺" },
  { slug: "liyuyuelongmen", title: "鲤鱼跃龙门", meta: "鲤跃锦图盼前程" },
  { slug: "yangqueniao", title: "阳雀鸟", meta: "阳雀成双载希望" },
  // 下面三个用 tujia/ 里那批高清原图（1824–1920 宽）。山兴花与粑粑架这两个
  // 文件名最初起反了，已按《衣载千年》长图的图文对应改正。四十八勾没有长图可以
  // 对照，命名仍待确认；meta 也只是画面描述，不是考据出来的寓意。
  { slug: "sishibagou", title: "四十八勾", meta: "勾纹相扣绵延不断" },
  { slug: "shanxinghua", title: "山兴花", meta: "山形兴旺万物生" },
  { slug: "babajia", title: "粑粑架", meta: "五谷丰登仓廪充盈" },
  { slug: "wanzigechuanghua", title: "万字格窗花", meta: "万字窗格福常驻" },
  { slug: "laoshujianv", title: "老鼠嫁女", meta: "鼠嫁喜临婚姻美" }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.slug);
}
