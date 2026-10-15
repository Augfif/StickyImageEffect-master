

## 本地运行

```bash
npm install
npm run dev        # http://localhost:5173/ 是开场页，/main.html 是照片主界面，/ai.html 是 AI 活动页（占位）
```

三个入口在同一个 dev server 上（见 `vite.config.js`）。开场页末尾并排两个按钮，分别进主界面和 AI 页；
右上角「跳过」平滑滚到这一屏，AI 页的「返回」用 `index.html?at=end` 回到同一屏。
开场页的内容全在 `js/intro/beats.js`：
十条目 `{ image, title, meta }`，`image: null` 的那几条就是还没补图的深色空框。只想调主界面的话
直接开 `/main.html`。

> 系统或浏览器开了「减少动态效果」（`prefers-reduced-motion: reduce`）时，开场与转场会自动走压缩过的
> 短版本。开着这个设置也想预览完整版，加个查询参数：`/?motion=full`、`/main.html?motion=full`。

素材准备（同步新原图 → 缩放到显示尺寸 → 生成深度图，首次会下载约 27MB 模型）：

```bash
npm run depth:setup
npm run depth      # 只处理新增或改动过的照片，--force 可全量重算深度图
```

这一步做三件事：

1. 把 `tujia/`（放原图的文件夹）里比 `images/` 更新的照片同步过来；
2. 把超过 2048px 长边的照片缩到 2048（手机 GPU 扛不住五张 1200 万像素贴图），
   同时把体积压到几百 KB；
3. 为每张照片生成同名 `*-depth.png` 深度图（亮 = 近）。

> 贴图清晰度还有一个坑：three.js 默认开 mipmap，会把非 2 的幂的照片压到 1024 并拉成正方形。
> 本项目对照片关掉了 mipmap、改用 `LinearFilter`，所以 2048 的原图是**按原分辨率**上传的。

> 说明：原始模板用 Parcel 1，它在 Node 18+ 上装不上（`deasync` 原生编译失败），所以这里改用 Vite，
> 入口是 `index.html`；`base.html` 保留为原始模板页面。

## 换自己的照片

1. 把照片放进 `tujia/`（或直接覆盖 `images/` 里的同名文件），跑一次 `npm run depth`；
2. 在 `js/index.js` 的 `slidesData` 里加一条 `{ image, depth, title, meta, focus? }`。
   `focus` 是桌面构图（`{ x, y, zoom }`，x/y 為要放到画面中心的图片坐标、y 自下往上），
   竖屏手机想要不同构图再加一条 `focusMobile`。

## 原始模板说明（Codrops）

# How to Create a Sticky Image Effect with Three.js

A sticky image effect for a slideshow inspired by [ultanoir's project showcase slideshow](https://ultranoir.com/en/).

![Sticky Image Effect](https://tympanus.net/codrops/wp-content/uploads/2019/04/Sticky_featured.jpg)

[Article on Codrops](https://tympanus.net/codrops/2019/04/10/how-to-create-a-sticky-image-effect-with-three-js/)

[Demo](https://tympanus.net/Tutorials/StickyImageEffect/)

## Development and Building

If you want to build the project or develop on top of it. You have to install the packages first:

```
npm install
```

Starting a local development server:

```
npm start
```

Build and bundle all the assets into /dist:

```
npm run build
```

## Credits

_third party resources_

- [Popmotion](https://twitter.com/popmotionjs) by Matt Perry
- [three.js](https://threejs.org/) by Ricardo Cabello
- Images from [Unsplash.com](https://unsplash.com/)

## License

This resource can be used freely if integrated or build upon in personal or commercial projects such as websites, web apps and web templates intended for sale. It is not allowed to take the resource "as-is" and sell it, redistribute, re-publish it, or sell "pluginized" versions of it. Free plugins built using this resource should have a visible mention and link to the original work. Always consider the licenses of all included libraries, scripts and images used.

## Misc

Follow Daniel: [Twitter](https://twitter.com/Anemolito), [Codepen](https://codepen.io/Anemolo/), [CodeSandbox](https://codesandbox.io/u/Anemolo), [GitHub](https://github.com/Anemolo)

Follow Codrops: [Twitter](http://www.twitter.com/codrops), [Facebook](http://www.facebook.com/codrops), [Google+](https://plus.google.com/101095823814290637419), [GitHub](https://github.com/codrops), [Pinterest](http://www.pinterest.com/codrops/), [Instagram](https://www.instagram.com/codropsss/)

[© Codrops 2019](http://www.codrops.com)
