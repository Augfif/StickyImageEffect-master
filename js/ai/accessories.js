import defaultAccessoryUrl from "../../images/ai/accessory.png";

/**
 * The picker's six styling objects are discovered from the folder, so adding
 * or removing a picture does not require touching the page logic.
 *
 * Name files `01-包.png`, `02-发箍.png`, ... to control the order and label.
 * A file without a numeric prefix still works; it simply sorts after the
 * numbered ones. The chair is kept in its own group because it is a scene
 * object rather than a wearable accessory.
 */
const accessoryUrls = import.meta.glob(
  "../../images/ai/accessories/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    query: "?url",
    import: "default"
  }
);

const SCENE_TITLES = new Set(["椅子"]);
const entries = Object.entries(accessoryUrls)
  .map(([path, image]) => {
    const filename = path.split("/").pop();
    const name = filename.replace(/\.[^.]+$/, "");
    const match = name.match(/^(\d+)[-_](.+)$/);
    const title = match ? match[2] : name;
    return {
      id: name,
      title,
      image,
      group: SCENE_TITLES.has(title) ? "scene" : "wearable",
      order: match ? Number(match[1]) : Number.POSITIVE_INFINITY
    };
  })
  .sort(
    (a, b) =>
      a.order - b.order || a.title.localeCompare(b.title, "zh-CN")
  );

export const accessories = entries.length
  ? entries
  : [
      {
        id: "default",
        title: "默认配饰",
        image: defaultAccessoryUrl,
        group: "wearable",
        order: 0
      }
    ];

export { defaultAccessoryUrl };
