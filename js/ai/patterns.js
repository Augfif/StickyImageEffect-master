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
  // 下面三个用 tujia/ 里那批高清原图（1824–1920 宽）。山兴花与粑粑架这两个
  // 文件名最初起反了，已按《衣载千年》长图的图文对应改正。四十八勾没有长图可以
  // 对照，命名仍待确认；meta 也只是画面描述，不是考据出来的寓意。
  { slug: "sishibagou", title: "四十八勾", meta: "勾纹相扣绵延不断" },
  { slug: "shanxinghua", title: "山兴花", meta: "山形兴旺万物生" },
  { slug: "babajia", title: "粑粑架", meta: "五谷丰登仓廪充盈" }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.title);
}
