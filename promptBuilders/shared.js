function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

function joinLines(items) {
  return items.filter(Boolean).join("\n");
}

function renderProfile(payload = {}) {
  const profile = payload.profile || {};
  const filters = payload.filters || {};

  return joinLines([
    `账号定位：${profile.accountTypeLabel || profile.accountType || "未提供"}`,
    `主要平台：${profile.mainPlatformLabel || profile.mainPlatform || "未提供"}`,
    `内容风格：${profile.accountVibeLabel || profile.accountVibe || "未提供"}`,
    `目标受众：${profile.audienceLabel || profile.audience || "未提供"}`,
    `常拍场景：${profile.commonSceneLabel || profile.commonScene || "未提供"}`,
    `更新频率：${profile.frequencyLabel || profile.frequency || "未提供"}`,
    `账号一句话描述：${profile.accountBrief || "未提供"}`,
    `今日拍摄状态：${profile.creatorStateLabel || profile.creatorState || "未提供"}`,
    `补充要求：${profile.extraRequirements || "未提供"}`,
    `内容目的：${filters.objectiveLabel || filters.objective || "未提供"}`,
    `出镜强度：${filters.presenceLabel || filters.presence || "未提供"}`,
    `拍摄难度：${filters.difficultyLabel || filters.difficulty || "未提供"}`,
    `视频长度：${filters.durationLabel || filters.duration || "未提供"}`
  ]);
}

function renderReferences(payload = {}) {
  const references = payload.references || {};
  const sampleLines = (references.samples || [])
    .slice(0, 8)
    .map((sample, index) => `${index + 1}. 平台：${sample.platform || "未知"}｜创作者：${sample.creator || "未知"}｜标题：${sample.title || sample.raw || "未识别"}`);

  return joinLines([
    `对标参考原文：${references.benchmarkRawText || "未提供"}`,
    `创意草稿：${references.creativeDraftText || "未提供"}`,
    `重点参考样本 ID：${references.preferredId || "未指定"}`,
    `已识别参考样本：`,
    sampleLines.length ? sampleLines.join("\n") : "暂无"
  ]);
}

function renderIdeasSection(title, ideas = []) {
  if (!ideas.length) {
    return `${title}：暂无`;
  }

  return joinLines([
    `${title}：`,
    ideas
      .slice(0, 6)
      .map((idea, index) => `${index + 1}. ${idea.title || "未命名"}｜平台：${idea.platform || "未提供"}｜场景：${idea.scene || "未提供"}`)
      .join("\n")
  ]);
}

function renderCurrentFocus(payload = {}) {
  const activeIdea = payload.activeIdea || null;

  if (!activeIdea) {
    return "当前选题：暂无";
  }

  return joinLines([
    `当前选题标题：${activeIdea.title || "未命名"}`,
    `当前选题平台：${activeIdea.platform || "未提供"}`,
    `当前选题场景：${activeIdea.scene || "未提供"}`,
    `当前选题理由：${activeIdea.recommendationReason || activeIdea.highlight || "未提供"}`
  ]);
}

function renderCalendarSettings(payload = {}) {
  const calendarSettings = payload.calendarSettings || {};
  return joinLines([
    `排期开始日期：${calendarSettings.startDate || "未提供"}`,
    `排期窗口天数：${calendarSettings.windowDays || "7"}`
  ]);
}

function buildPromptPackage({ task, goal, rules = [], outputExample, payload, extraContext = "" }) {
  const systemPrompt = joinLines([
    "你是一名资深的 Vlog 内容策略师、短视频导演和拍摄顾问，尤其擅长男大学生日常账号。",
    "你服务的账号核心气质是：少年感、清爽、自然、不油腻、有活力，兼顾运动感、旅行探索感和轻微颜值氛围感。",
    "你的任务是根据结构化输入，输出真正可执行、适合男大学生日常账号的结果。",
    "所有建议都要优先考虑真实校园生活、普通创作者可执行、拿起手机就能拍，不要写成脱离生活的广告文案。",
    "如果参考样本是爆款标题，你要先抓住它为什么能火，再把它改造成更适合当前账号定位的人设版本。",
    "标题、脚本和镜头建议都要尽量自然、口语化、像真实创作者会发的内容，不要油腻、悬浮、鸡汤化。",
    "避免过度解释创作意图，少写“我想拍点不一样”“今天想记录一下”这类空话，优先直接进入画面、状态和动作。",
    "优先输出更短、更顺口、更像小红书和短视频平台真实标题的表达，不要为了显得高级而拖长句子。",
    "你必须严格输出 JSON，不要输出 Markdown，不要解释，不要添加代码块。",
    "字段名、层级和数组结构必须与示例保持一致，缺少字段也要补齐为有效内容。"
  ]);

  const userPrompt = joinLines([
    `任务：${task}`,
    `目标：${goal}`,
    "",
    "账号与创作信息：",
    renderProfile(payload),
    "",
    "参考素材：",
    renderReferences(payload),
    "",
    renderIdeasSection("已有参考选题", payload.referenceIdeas || []),
    "",
    renderIdeasSection("已有创意选题", payload.creativeIdeas || []),
    "",
    renderCurrentFocus(payload),
    "",
    "日历设置：",
    renderCalendarSettings(payload),
    extraContext ? `\n${extraContext}\n` : "",
    "输出要求：",
    rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n"),
    "",
    "返回 JSON 结构示例：",
    safeJson(outputExample)
  ]);

  return {
    task,
    goal,
    systemPrompt,
    userPrompt
  };
}

module.exports = {
  buildPromptPackage
};
