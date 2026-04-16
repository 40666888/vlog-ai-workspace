function joinLines(items) {
  return items.filter(Boolean).join("\n");
}

function summarizeProfile(payload = {}) {
  const profile = payload.profile || {};
  const filters = payload.filters || {};

  return joinLines([
    `账号定位：${profile.accountTypeLabel || profile.accountType || "未提供"}`,
    `主要平台：${profile.mainPlatformLabel || profile.mainPlatform || "未提供"}`,
    `内容风格：${profile.accountVibeLabel || profile.accountVibe || "未提供"}`,
    `常拍场景：${profile.commonSceneLabel || profile.commonScene || "未提供"}`,
    `今日拍摄状态：${profile.creatorStateLabel || profile.creatorState || "未提供"}`,
    `一句话描述：${profile.accountBrief || "未提供"}`,
    `内容目的：${filters.objectiveLabel || filters.objective || "未提供"}`,
    `出镜强度：${filters.presenceLabel || filters.presence || "未提供"}`,
    `拍摄难度：${filters.difficultyLabel || filters.difficulty || "未提供"}`
  ]);
}

function summarizeReferences(payload = {}) {
  const references = payload.references || {};
  const preferredId = references.preferredId || "";
  const preferredSample = (references.samples || []).find((sample) => sample.id === preferredId) || null;
  const sampleLines = (references.samples || [])
    .slice(0, 4)
    .map((sample, index) =>
      `${index + 1}. ${sample.title || sample.raw || "未识别标题"}｜${sample.creator || "未知创作者"}｜${sample.platform || "未知平台"}`
    );

  return joinLines([
    preferredSample
      ? `重点参考：${preferredSample.title || preferredSample.raw || "未识别"}｜${preferredSample.creator || "未知创作者"}`
      : "",
    references.creativeDraftText ? `已有创意草稿：${references.creativeDraftText}` : "",
    sampleLines.length ? `参考样本：\n${sampleLines.join("\n")}` : "",
    !sampleLines.length && references.benchmarkRawText ? `参考原文：${references.benchmarkRawText}` : "",
    !sampleLines.length && !references.benchmarkRawText ? "参考原文：未提供" : ""
  ]);
}

function buildReferenceIdeasPrompt(payload = {}) {
  const systemPrompt = joinLines([
    "你是一名短视频选题策划。",
    "你擅长把同类创作者的热门内容，转译成更适合男大学生日常账号的参考选题。",
    "请基于账号画像和参考样本，生成更贴近参考方向、但已经账号定制化的参考选题。",
    "优先保留爆款内容里真实、易共鸣、容易被点开的核心钩子，再改造成更适合当前账号人设和拍摄状态的版本。",
    "必须只输出 JSON。",
    "不要输出 Markdown，不要解释，不要代码块。"
  ]);

  const userPrompt = joinLines([
    "任务：reference_ideas",
    "目标：生成 3 到 5 条参考选题，保留对标爆款的有效角度，但转换成适合当前账号的人设版本。",
    "",
    "账号画像：",
    summarizeProfile(payload),
    "",
    "参考素材：",
    summarizeReferences(payload),
    "",
    "输出要求：",
    "1. 每条都要说明参考依据，不能写成随机脑暴。",
    "2. 标题要适合男大学生日常、运动、旅行、颜值相关内容，但主线仍以真实校园生活为核心。",
    "3. 优先给出今天就能拍、普通手机也能完成、场景动线自然的选题。",
    "4. platform 优先填用户主平台，scene 优先结合用户常拍场景，例如校园、宿舍、操场、健身房、城市散步、短途出行。",
    "5. recommendationReason 要说明为什么适合当前账号、当前人设和今天的拍摄状态。",
    "6. 标题不要油腻，不要为了颜值强行悬浮，更像真实有状态的男大学生日常。",
    "7. 标题尽量简洁顺口，优先 10-20 个字左右，减少重复出现“普通男大学生”“今天想拍”等空泛前缀。",
    "8. 标题优先用时间、场景、状态变化、真实细节做钩子，而不是抽象概念。",
    "9. id 使用 reference-idea-1 这种稳定格式。",
    "",
    "返回 JSON 示例：",
    JSON.stringify(
      {
        items: [
          {
            id: "reference-idea-1",
            title: "男大学生出门前 15 分钟状态切换",
            referenceBasis: "参考对标账号的早八整理类爆款标题，并转成更适合你的账号气质版本。",
            scene: "校园 / 宿舍 / 教学楼",
            platform: "小红书",
            recommendationReason: "保留对标内容里“短时间状态变化”的吸引力，同时更适合你当前的校园日常定位。"
          }
        ]
      },
      null,
      2
    )
  ]);

  return {
    task: "reference_ideas",
    goal: "生成 3 到 5 条更贴近参考方向的定制化参考选题。",
    systemPrompt,
    userPrompt
  };
}

module.exports = {
  buildReferenceIdeasPrompt
};
