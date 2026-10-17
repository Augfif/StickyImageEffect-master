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
  // 三个待补纹样：名字定下来后改掉 title/meta 与 slug，再把对应图片放进 images/。
  { slug: "pattern-6", title: "纹样六", meta: "待补", pending: true },
  { slug: "pattern-7", title: "纹样七", meta: "待补", pending: true },
  { slug: "pattern-8", title: "纹样八", meta: "待补", pending: true }
];

export function patternBySlug(slug) {
  return patterns.find(pattern => pattern.slug === slug) || null;
}

export function shotsForPattern(pattern) {
  if (!pattern || pattern.pending) return [];
  return shotsFor(pattern.title);
}
