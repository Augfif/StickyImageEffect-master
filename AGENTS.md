# AGENTS.md

本文件面向在本仓库里工作的 AI 编码助手，记录项目结构、约定和容易踩的坑。
人类协作者看 [README.md](README.md) 也能拿到大部分信息。

## 项目是什么

参加**数值媒体大赛**的作品，主题是湘西土家织锦（十幅纹样，十种祝愿）。
当前仓库只负责**前端**部分：一个纯静态的 Vite 站点，没有后端、没有数据接口，
所有内容都写死在 JS 里。

技术栈：

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| `vite` | ^5.4.21 | 开发服务器与打包，双入口 |
| `three` | ^0.101.1 | 两页的 WebGL 渲染（**r101，老版本，见下文坑位**） |
| `gsap` | ^3.15.0 | 开场页：`ScrollTrigger` / `ScrollSmoother` / `SplitText` |
| `popmotion` | ^8.6.4 | 幻灯片：`spring` / `parallel` 做手势回弹 |
| `stats.js` | ^0.17.0 | 已在 `package.json` 里，但**代码中没有使用** |

## 常用命令

```bash
npm install          # 首次
npm run dev          # http://localhost:5173/ 是开场页，/main.html 是照片主界面
npm run build        # 产物在 dist/
npm run preview      # 预览 dist/
npm run depth:setup  # 装 tools/depth 自己的依赖（sharp + transformers）
npm run depth        # 同步 tujia/ → 缩放 → 生成深度图；--force 全量重算
```

两个入口共用同一个 dev server，配置在 [vite.config.js](vite.config.js)。

## 架构：两个页面，两条渲染管线

| 入口 | HTML | JS 入口 | 说明 |
| --- | --- | --- | --- |
| 开场页 | [index.html](index.html) | `js/intro/index.js` | 电影感「走廊」自动播放 + 滚动推进十条内容 |
| 主界面 | [main.html](main.html) | `js/index.js` | 可拖动切换的 sticky 视差幻灯片（五张照片） |
| — | [base.html](base.html) | — | 原始 Codrops 模板页，**不在 build 入口里，当前不可运行**，仅作历史参考 |

`base.html` 用普通 `<script src="js/index.js">` 引入，而现代码是 ES module，
所以它跑不起来；保留它只是为了对照上游模板。

### 目录地图

```
index.html main.html        # 两个入口
base.html                   # 遗留模板页，不构建
css/
  base.css                  # reset + 配色变量 + 自定义光标 + 加载动画
  intro.css                 # 只属于开场页
  styles.css                # 只属于主界面（含 @font-face 与响应式断点）
fonts/                      # MaShanZheng 毛笔字体（自托管）
images/                     # 页面真正引用的素材：原图 + 同名 -depth.png
tujia/                      # 原图投放目录，depth 工具从这里同步到 images/
js/
  index.js                  # 主界面组装入口
  Showcase.js               # 主界面状态机：手势 → 进度/方向/波动 → GL
  Grab.js                   # 主界面手势识别（mouse + touch）
  GLManager.js              # three.js 场景/材质/uniforms/尺寸
  shaders.js                # 顶点 + 片元着色器（假 3D 的核心）
  Slides.js                 # 幻灯片的 DOM 文案层 + 「阅读」状态
  Sheet.js                  # 毛玻璃白色内容面板（拖拽 + 弹簧）
  Progress.js               # 右侧竖向进度条
  Cursor.js                 # 自绘光标圆环（两页共用）
  reach.js                  # 极简缓动，主界面内部用，非 popmotion
  intro/
    index.js                # 开场页组装入口
    scene.js                # 走廊场景：10 个版面 + 相机曲线
    text.js                 # 文案层：SplitText + ScrollTrigger 时间线
    beats.js                # ★ 开场页唯一需要改内容的文件
    progress.js             # 底部进度条
tools/depth/
  make-depth.mjs            # 素材管线：同步 / 缩放 / 生成深度图
```

## 数据流

### 主界面（main.html）

一条链，按顺序读就能理解：

1. `js/index.js` 里 `slidesData` 是唯一的数据源，每条 `{ image, depth, focus, focusMobile, title, meta }`。
2. `Grab.js` 监听 `mousedown/mousemove/mouseup`（以及对应 touch）——**翻页靠拖拽，不是滚轮，也不是原生滚动**。
3. `Showcase.js` 把拖动位移换算成 `index.target`，并用 popmotion 弹簧驱动：
   - `u_progress / u_direction / u_waveIntensity`：拖拽时照片「棒状凸起 + 波动」的顶点动画；
   - `u_textureProgress`：换图时的交叉淡入。
4. `GLManager.js` 持有 renderer / camera / 唯一一块 Plane；平铺 `u_mouse` 做视差并给整块平面加轻微 tilt。
5. `shaders.js` 里片元着色器按深度图逐像素偏移采样（**亮 = 近**），顶点着色器负责凸起与波动。
6. 渲染是**按需触发**的：`render()` 在材质变化时手动调用；只有拖拽期间 `scheduleLoop()` 才开 rAF 循环。
7. DOM 层互不耦合：`Slides` 管文案与 class 状态，`Progress` 管右侧进度条，`Sheet` 管白色内容面板，`Cursor` 管圆环。
   `Sheet` 打开时 `Showcase.setLocked(true)` 锁住手势，`Slides.setReading()` 用指数跟随把文案送到画面中心。

### 开场页（index.html）

1. `js/intro/beats.js` 的 `introBeats` 是十条内容，`image: null` 是没补图的占位（目前 5 张真图 + 5 个空位）。
2. `js/intro/scene.js` 由数组**推导**出走廊：左右交替、逐 beat 后退的版面位置，加一条 `CatmullRomCurve3` 相机曲线 —— 不需要手工摆放十个机位。
3. `text.js` 用 `SplitText` 按字拆分，`beatTimeline()` 给每个 beat 生成 scrub 时间线。
4. `js/intro/index.js` 负责启动流程：锁滚动 → 加载贴图 → 开场推镜 `runOpening()` → 解锁滚动；`ScrollSmoother` 只在非 reduced-motion 下创建。
5. 滚到最后出现「开始」按钮，`enterSite()` 用幕布遮罩后跳转 `main.html`。

## 必须保持同步的常量

这些值在多个文件里各写了一份，改动时**必须一起改**，否则会出现错位或闪烁：

| 常量 | 出现位置 |
| --- | --- |
| 背景色 `#131319` | `css/styles.css` 的 `#app`、`GLManager.js` 的 `BACKGROUND_COLOR`、`intro/scene.js` 的 `BACKGROUND` |
| 断点 `(min-width: 53em)` | `GLManager.js` 的 `DESKTOP_QUERY` 与 `css/styles.css` 的媒体查询（决定用 `focus` 还是 `focusMobile`） |
| `PEEK_RATIO = 0.175` | `js/Sheet.js` 与 `js/Slides.js`（面板露出高度，两边算法需一致） |
| 长边 2048 | `tools/depth/make-depth.mjs` 的 `PHOTO_MAX_EDGE`（与 README 里的说明对应） |

## 素材流程

页面读 `images/`，但**原图请放 `tujia/`**，然后跑 `npm run depth`。这一步做三件事：

1. 把 `tujia/` 里比 `images/` 新的照片同步过去；
2. 把长边超过 2048px 的照片缩到 2048（手机 GPU 撑不住五张 1200 万像素贴图）；
3. 为每张图生成同名 `*-depth.png`：8bit 灰度、亮 = 近、长边 1600，模型是 `onnx-community/depth-anything-v2-small`（q8）。

新增一张幻灯片要改三处：

1. 图片放进 `tujia/`，跑 `npm run depth` —— **文件名里的中文要完全一致**；
2. 在 `js/index.js` 顶部 `import` 图片与深度图（走 Vite 的静态资源处理）；
3. 往 `slidesData` 加一条，并按需给 `focus` / `focusMobile`。

开场页同理，改 `js/intro/beats.js`。

> `images/1.jpg` ~ `5.jpg` 及配套深度图是上游模板留下的素材，当前代码没有引用。

## 代码风格

- **注释写英文，面向用户的文案写中文**（`beats.js` 的标题、`Sheet` 的「介绍」等）。
  注释重点解释「为什么这么做」，现状已经有很多这样的说明，改动时请保持这个习惯。
- 模块一律 ESM。文件内部风格保持原样：`GLManager` / `Showcase` 用原型方法，
  `Slides` / `Sheet` / `Cursor` / `Progress` 用 class，不要为了统一而重写。
- CSS 是手写的，没有预处理器；主题值走 CSS 自定义属性（`--color-*`、`--progress`）。
- 引入新依赖前先确认必要性。`three` 是 **r101**，网上大部分新 API（`ColorManagement`、
  `PlaneGeometry` 的新签名、`WebGLRenderer.outputEncoding` 等）在这里都不存在。

## 已知坑位

- **贴图不要开 mipmap。** 照片不是 2 的幂，three r101 会为了 mipmap 把它压到 1024
  并拉成正方形。现在关掉 mipmap + `LinearFilter`，2048 的原图按原分辨率上传，改回去图会糊。
- **主界面不响应滚轮。** 翻页是按住拖拽（`Grab.js`），别指望加 `wheel` 监听能接上；
  同理 `#app` 上有个 `scroll` 监听把 `scrollTop` 钉回 0，是防止聚焦元素把构图顶偏的。
- **原生光标被全局关掉了**（`css/base.css` 里 `cursor: none !important`），页面上的指针一律是
  `Cursor.js` 画的圆环。新增可点元素不需要自己写 `cursor: pointer`。
- `prefers-reduced-motion: reduce` 会走压缩过的短动画。想在开了这个设置的环境下预览完整版，
  加查询参数：`/?motion=full`、`/main.html?motion=full`。
- `.gitignore` 里点名忽略的几个目录（`fake3d-master/`、`ultranoir-dump/`、
  `codrops-cinematic-scroll-animations-main/` 等）是**版权原因**不入库的参考资料，不要提交。
- `_*` 开头的文件被忽略，用于本地临时文件。

## Git 约定

- **每改完一个可描述的改动就提交一次**，不要攒成一个大提交；也不要留下未提交的工作区离开。
  （用户明确要求：每次改完代码都保存一下。）
- 提交信息格式：`类型: 中文说明`，类型用 `feat` / `fix` / `style` / `refactor` / `chore` / `docs` / `perf`。
  一次提交只做一件事，说明写「改了什么、为什么」。
- `origin` 曾经指向模板作者的上游仓库，已改名为 **`upstream`**（只读参考，不要 push 上去）。
  自己的远程仓库确定后，再把新地址加为 `origin`。
- 提交前确认没有把临时文件、`node_modules`、以及上面提到的版权资料带进去。
- 图像、字体、`.woff2` 等二进制素材已由 `.gitattributes` 标记为 binary，行尾不会被转换。
