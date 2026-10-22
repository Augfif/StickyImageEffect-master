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
| `vite` | ^5.4.21 | 开发服务器与打包，三个入口 |
| `three` | ^0.101.1 | 两页的 WebGL 渲染（**r101，老版本，见下文坑位**） |
| `gsap` | ^3.15.0 | 开场页：`ScrollTrigger` / `ScrollSmoother` / `SplitText` |
| `popmotion` | ^8.6.4 | 幻灯片：`spring` / `parallel` 做手势回弹 |
| `stats.js` | ^0.17.0 | 已在 `package.json` 里，但**代码中没有使用** |

## 常用命令

```bash
npm install          # 首次
npm run dev          # / 开场页、/main.html 主界面、/ai.html AI 布样册、/ai-style.html 造型生成
npm run build        # 产物在 dist/
npm run preview      # 预览 dist/
npm run depth:setup  # 装 tools/depth 自己的依赖（sharp + transformers）
npm run depth        # 同步 tujia/ → 缩放 → 生成深度图；--force 全量重算
```

四个入口共用同一个 dev server，配置在 [vite.config.js](vite.config.js)。

## 架构：四个页面

| 入口 | HTML | JS 入口 | 说明 |
| --- | --- | --- | --- |
| 开场页 | [index.html](index.html) | `js/intro/index.js` | 电影感「走廊」自动播放 + 滚动推进十条内容 |
| 主界面 | [main.html](main.html) | `js/index.js` | 可拖动切换的 sticky 视差幻灯片（五张照片） |
| AI 纹样目录 | [ai.html](ai.html) | `js/ai/index.js` | 布样册：一级布面默认带人物上身卡，点卡展开二级上身；手机上全屏、桌面上左目录右布样 |
| 造型生成 | [ai-style.html](ai-style.html) | `js/ai/style.js` | 上传配饰照片与自拍 → 调 ai-drawing 生成 → 展示与下载结果 |
| — | [base.html](base.html) | — | 原始 Codrops 模板页，**不在 build 入口里，当前不可运行**，仅作历史参考 |

导航只从开场页末尾发出去：那里并排两个按钮（「赏织锦」→ `main.html`，「AI 互动」→ `ai.html`），
右上角「跳过」平滑滚到这一屏而不是跳页面。AI 页的「返回」用 `index.html?at=end` 回到同一屏，
该参数会跳过开场推镜直接落位。改这两个去向看 `js/intro/index.js` 的 `ROUTES`。

AI 目录的左侧索引和手机缩略条只负责切换布样；真正进入生成页的是布样下方的
`<a href="ai-style.html?pattern=<slug>">`。

`base.html` 用普通 `<script src="js/index.js">` 引入，而现代码是 ES module，
所以它跑不起来；保留它只是为了对照上游模板。

## AI 互动与造型生成

**内容只改 `js/ai/patterns.js`**：十个纹样按 `slug / title / meta / stage / person` 排好，缩略图按文件名自动发现。
AI 目录的布面优先用 `images/opening/` 里的高清裁切图；缩略条和生成页的 `fabric` 用
`images/ai/shots/`。二级上身用 `images/` 下对应的秀场照，不能直接替换主界面的
three.js 贴图。没有图的纹样标 `pending: true`，渲染成不可交互的占位行。
`js/ai/copy.js` 收着两个 AI 页面的全部文案。

**后端契约**（`ai-drawing/`，独立工程）：`POST /api/v1/styled-look`，`multipart/form-data`，
四个必填字段 `person`（人物）、`fabric`（布匹，唯一换料原料）、`accessory`、`chair`，
成功直接返回图片二进制，失败返回 `{ error: { code, message } }`（400/413/415/422/500/502）。
接口不收提示词，也不收「纹样 id」——选中的织锦是以 `fabric` 这个文件身份参与生成的。
前端把用户上传的自拍作为 `person`、配饰照片作为 `accessory`，把所选纹样的主图作为
`fabric`；椅子仍用 `images/ai/chair.png` 作为不露出的兜底素材，保证旧后端契约可用。
字段顺序必须与提示词里的「参考图1/2/3/4」一一对应，传反了语义就反了。

开发与 `npm run preview` 都靠 `vite.config.js` 里的 `/api` → `127.0.0.1:8000` 代理，
所以本地不需要后端开 CORS。**静态部署后没有代理**：要么把前后端放在同一来源，
要么给后端加 `Access-Control-Allow-Origin`，并把 `VITE_AI_API_BASE` 指到后端地址。

### 目录地图

```
index.html main.html        # 幻灯片与开场页
ai.html ai-style.html       # AI 纹样目录与造型生成
base.html                   # 遗留模板页，不构建
css/
  base.css                  # reset + 配色变量 + 原生指针 + 加载动画
  intro.css                 # 只属于开场页
  styles.css                # 只属于主界面（含 @font-face 与响应式断点）
fonts/                      # MaShanZheng 毛笔字体（自托管）
images/                     # 页面真正引用的素材：原图 + 同名 -depth.png
images/opening/             # 开场布匹用的织物扫描图（已裁边、压缩）
images/ai/                  # 提花底纹与生成请求用的椅子兜底素材
images/ai/source/           # 织物扫描原图，只用于重新生成 shots，不被页面加载
images/ai/shots/            # AI 目录与生成页实际加载的压缩图（<slug>.jpg）
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
  reach.js                  # 极简缓动，主界面内部用，非 popmotion
  intro/
    index.js                # 开场页组装入口
    cloth.js                # 连续布匹：每段一个 100svh 织物面板
    scene.js                # 旧走廊方案，已不引用，仅作历史参考
    text.js                 # 文案层：SplitText + ScrollTrigger 时间线
    beats.js                # ★ 开场页唯一需要改内容的文件
    progress.js             # 底部进度条
  ai/
    index.js                # 布样册组装：目录、布面/上身切换、缩略条
    patterns.js             # ★ 十个纹样、布面、人物与 shots，改内容改这里
    style.js                # 生成页：上传、提交、等待、结果三态
    copy.js                 # 两个 AI 页面的全部文案
tools/depth/
  make-depth.mjs            # 素材管线：同步 / 缩放 / 生成深度图
.codex/skills/
  grid-to-preview-hover/    # 项目内技能：网格悬停放大预览，附可套用的 starter
codrops-grid-to-preview/    # AI 互动页的参考工程（.gitignore，不入库）
```

## 项目内技能

`.codex/skills/grid-to-preview-hover/` 是「悬停网格中的一件时，对面半屏让位、该图放大填满」这套效果的
可复用技能：`SKILL.md` 列必须保住的不变量，`references/mechanics.md` 讲机制、几何算法与十字 clip-path
的原文值，`assets/grid-preview-starter/` 是纯 CSS + ESM、可直接拷进页面的三件套。

它对应的参考工程是 `codrops-grid-to-preview/`（Codrops《Grid to Full Preview》，MIT），因为带 DALL·E
生成的商品图，按仓库惯例只作本地参考、不随仓库分发。AI 互动页后来改成了布样册（布面 / 上身），
这套技能留作旧网格方案的历史参考。

## 数据流

### 主界面（main.html）

一条链，按顺序读就能理解：

1. `js/index.js` 里 `slidesData` 是唯一的数据源，每条 `{ image, depth?, focus, focusMobile, title, meta, kicker?, waveIntensity? }`。
2. `Grab.js` 监听 `mousedown/mousemove/mouseup`（以及对应 touch）——**翻页靠拖拽，不是滚轮，也不是原生滚动**。
3. `Showcase.js` 把拖动位移换算成 `index.target`，并用 popmotion 弹簧驱动：
   - `u_progress / u_direction / u_waveIntensity`：拖拽时照片「棒状凸起 + 波动」的顶点动画；
   - `u_textureProgress`：换图时的交叉淡入。
4. `GLManager.js` 持有 renderer / camera / 唯一一块 Plane；平铺 `u_mouse` 做视差并给整块平面加轻微 tilt。
5. `shaders.js` 里片元着色器按深度图逐像素偏移采样（**亮 = 近**），顶点着色器负责凸起与波动。
6. 渲染是**按需触发**的：`render()` 在材质变化时手动调用；只有拖拽期间 `scheduleLoop()` 才开 rAF 循环。
7. DOM 层互不耦合：`Slides` 管文案与 class 状态，`Progress` 管右侧进度条，`Sheet` 管白色内容面板。
   `Sheet` 打开时 `Showcase.setLocked(true)` 锁住手势，`Slides.setReading()` 用指数跟随把文案送到画面中心。

第 4–6 张是布面插段，复用 `images/opening/` 的裁切图；它们没有 depth map，渲染层会退化为中性平面深度。
布面在手机上保持原始比例并居中放大裁切，`waveIntensity` 降为 `0.32`，与人物页的全屏照片形成节奏差异。

### 开场页（index.html）

1. `js/intro/beats.js` 的 `introBeats` 是十段织物与文案，`fabric` 控制微距聚焦和缩放。
2. `js/intro/cloth.js` 把每段做成 100svh 布匹面板，整条布匹随滚动 `translateY`，标题在左、释义在右。
3. `text.js` 用 `SplitText` 按字拆分；ScrollTrigger 的时间点按 `maxScroll` 计算，保证文字窗口和布匹段落对齐。
4. `js/intro/index.js` 负责预加载、ScrollSmoother、进度条和结尾选择页；`ScrollSmoother` 只在非 reduced-motion 下创建。
5. 滚到约 97% 时，最后一段织物压暗，选择页从布匹宽度向两侧展开成「赏织锦 / AI 互动」两张布样卡。
6. `enterSite()` 用幕布遮罩后跳转对应页面；`scene.js` 是旧走廊方案，已不再引用。

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

AI 目录的素材不走 `depth` 流程：原扫描图放 `images/ai/source/`，再把页面实际加载的压缩版本
按 `<slug>.jpg` 放进 `images/ai/shots/`，`js/ai/patterns.js` 会自动认到。一级布面的大图
放在 `images/opening/`，二级上身图在 `patterns.js` 的 `person` 字段里显式对应；竖长条扫描图
在舞台上按原比例悬垂，避免拉满屏后发虚。

> `images/1.jpg` ~ `5.jpg` 及配套深度图是上游模板留下的素材，当前代码没有引用。

## 代码风格

- **注释写英文，面向用户的文案写中文**（`beats.js` 的标题、`Sheet` 的「介绍」等）。
  注释重点解释「为什么这么做」，现状已经有很多这样的说明，改动时请保持这个习惯。
- 模块一律 ESM。文件内部风格保持原样：`GLManager` / `Showcase` 用原型方法，
  `Slides` / `Sheet` / `Progress` 用 class，不要为了统一而重写。
- CSS 是手写的，没有预处理器；主题值走 CSS 自定义属性（`--color-*`、`--progress`）。
- 引入新依赖前先确认必要性。`three` 是 **r101**，网上大部分新 API（`ColorManagement`、
  `PlaneGeometry` 的新签名、`WebGLRenderer.outputEncoding` 等）在这里都不存在。

## 已知坑位

- **贴图不要开 mipmap。** 照片不是 2 的幂，three r101 会为了 mipmap 把它压到 1024
  并拉成正方形。现在关掉 mipmap + `LinearFilter`，2048 的原图按原分辨率上传，改回去图会糊。
- **主界面不响应滚轮。** 翻页是按住拖拽（`Grab.js`），别指望加 `wheel` 监听能接上；
  同理 `#app` 上有个 `scroll` 监听把 `scrollTop` 钉回 0，是防止聚焦元素把构图顶偏的。
- **页面使用原生鼠标指针**。不要重新加全局 `cursor: none`；按钮、链接和可拖拽区域各自的
  `cursor: pointer` / `grab` / `grabbing` 会正常显示。
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
- 远端只有一个 **`origin`**：`https://github.com/Augfif/StickyImageEffect-master.git`。
  它一度被临时改名为 `upstream` 当作只读模板，后来确认就是发布目标，推送走 `git push origin main`。
- 提交前确认没有把临时文件、`node_modules`、以及上面提到的版权资料带进去。
- 图像、字体、`.woff2` 等二进制素材已由 `.gitattributes` 标记为 binary，行尾不会被转换。
