/**
 * The eight patterns on the AI grid, in reading order.
 *
 * Shots are discovered from the file names instead of being imported one by one:
 *
 *   images/岩墙花.jpg      the tile picture, and the first frame in the pane
 *   images/岩墙花-2.jpg    a second angle, cross faded into the pane
 *   images/岩墙花-3.jpg    a third
 *
 * Dropping the file in is enough -- nothing here has to change, a pattern with
 * one shot simply does not cycle, and a pattern with none does not break the
 * build.
 */
const shotUrls = import.meta.glob("../../images/*.jpg", {
  eager: true,
  query: "?url",
  import: "default"
});

const shotsByName = new Map();
for (const [path, url] of Object.entries(shotUrls)) {
  const name = path.split("/").pop().replace(/\.[^.]+$/, "");
  const match = name.match(/^(.+?)(?:-(\d+))?$/);
  if (!match) continue;
  const [, base, order] = match;
  if (!shotsByName.has(base)) shotsByName.set(base, []);
  shotsByName.get(base).push({ order: order ? Number(order) : 1, url });
}

function shotsFor(name) {
  const shots = shotsByName.get(name) || [];
  return shots.sort((a, b) => a.order - b.order).map(shot => shot.url);
}

export const patterns = [
  { slug: "yanqianghua", title: "岩墙花", meta: "最难岩墙椅子花" },
  { slug: "jiuduomei", title: "九朵梅", meta: "九梅含韧久安康" },
  { slug: "yizihua", title: "椅子花", meta: "椅织锦纹藏巧艺" },
  { slug: "liyuyuelongmen", title: "鲤鱼跃龙门", meta: "鲤跃锦图盼前程" },
  { slug: "yangqueniao", title: "阳雀鸟", meta: "阳雀成双载希望" },
  // 下面三个取自《衣载千年》长图（文旅来凤，2026-10-06）。同一篇里还导出了
  // 十二勾花、梭罗树、老鼠嫁女、粑粑架 四张，已在 images/ 里备用——换上来只要
  // 把这里的 title 改成对应文件名即可。
  { slug: "hudieximudan", title: "蝴蝶戏牡丹", meta: "蝶戏牡丹阖家欢" },
  { slug: "shanxinghua", title: "山兴花", meta: "山形兴旺万物生" },
  { slug: "wanzigechuanghua", title: "万字格窗花", meta: "万字窗格福常驻" }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.title);
}
