/** Every string the AI pages show, so wording changes never touch logic. */
export const aiCopy = {
  grid: {
    back: "返回",
    eyebrow: "织造万象 · 纹样目录",
    title: "选一块织锦"
  },
  studio: {
    back: "返回目录",
    eyebrow: "当前纹样",
    invalidTitle: "还没有选择纹样",
    invalidBody: "请先回到纹样目录，点开一块织锦，再回到这里生成造型。",
    invalidAction: "去看织锦",
    intro: [
      "这一页会把你选中的这块织锦，完整换到人物与配饰上——不是把图案叠上去，而是拆掉原来的面料重新包覆。",
      "这张就是本次的布料来源：AI 只从它取颜色、纹样、材质与光泽，并把它当作画面唯一的面料。",
      "先勾选想搭配的配饰与场景，再上传一张你的自拍。AI 会保留脸与身形，把服装和配饰统一换成这块布。生成通常要一到几分钟。"
    ],
    accessoryPickerTitle: "选择搭配",
    accessoryPickerHint: "配饰与场景可多选，也可以不选",
    accessoryWearableGroup: "随身配饰",
    accessorySceneGroup: "场景家具",
    accessoryCountPrefix: "已选",
    accessoryCountSuffix: "件",
    selfieUploadTitle: "你的自拍",
    selfieUploadHint: "拖入或点击选择一张正面或半身自拍，脸和身形要完整",
    submit: "生成造型",
    submitDisabled: "请先上传你的自拍",
    errorType: "只支持 JPG、PNG、WebP、BMP、GIF、TIFF、HEIC 这几种图片。",
    errorSize: "单张图片不能超过 30 MB。",
    waitingTitle: "正在生成",
    waitingStages: ["上传参考图…", "AI 正在换料…", "仍在生成，请稍候…"],
    waitingHint: "生成可能要一到几分钟，请保持这个页面打开。",
    cancel: "取消",
    resultTitle: "造型完成",
    resultHint: "可以直接下载，或长按图片保存。",
    download: "下载",
    retry: "再试一次",
    errors: {
      EMPTY_IMAGE: "图片是空的，请重新选择。",
      IMAGE_TOO_LARGE: "图片超过 30 MB，请换一张小一点的。",
      UNSUPPORTED_IMAGE: "图片格式不支持，请换成 JPG 或 PNG。",
      VALIDATION: "上传内容不完整，请重新选择照片后再试。",
      CONFIGURATION_ERROR: "生成服务没有配置好（缺少 API Key），请联系后端。",
      GENERATION_FAILED: "生成失败，可以稍后再试一次。",
      NETWORK: "连接不到生成服务，请确认 10.212.232.217:8000 可访问。",
      CANCELLED: "已取消本次生成。"
    }
  }
};
