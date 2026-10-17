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
  // 下面三个用 tujia/ 里那批高清原图（1824–1920 宽），比从长图裁切的 778 宽
  // 清楚得多。meta 先写画面描述；除了梭罗树纹可参照《衣载千年》的说法，另外两个
  // 的寓意没有权威出处，别照猜，等拿到释文再换。
  { slug: "sishibagou", title: "四十八勾", meta: "勾纹相扣绵延不断" },
  { slug: "suoluoshuwen", title: "梭罗树纹", meta: "枝叶舒展步步高升" },
  { slug: "chakouwen", title: "碴口纹", meta: "几何碴口规整有序" }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.title);
}
