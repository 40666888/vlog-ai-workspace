const baseSystemPrompt =
  "你是一个服务于 vlog 创作者的内容策划与拍摄导演。你必须根据结构化输入输出稳定 JSON，不能空泛，不能随机发挥。";

function listItems(items, formatter) {
  if (!items?.length) {
    return "无";
  }

  return items.map(formatter).join("\n");
}

function buildContextBlock(payload) {
  return [
    "【账号画像】",
    `账号定位：${payload.profile?.accountTypeLabel || payload.profile?.accountType || "-"}`,
    `主要平台：${payload.profile?.mainPlatformLabel || payload.profile?.mainPlatform || "-"}`,
    `内容风格：${payload.profile?.accountVibeLabel || payload.profile?.accountVibe || "-"}`,
    `目标受众：${payload.profile?.audienceLabel || payload.profile?.audience || "-"}`,
    `常拍场景：${payload.profile?.commonSceneLabel || payload.profile?.commonScene || "-"}`,
    `更新频率：${payload.profile?.frequencyLabel || payload.profile?.frequency || "-"}`,
    `账号一句话描述：${payload.profile?.accountBrief || "无"}`,
    `今日拍摄状态：${payload.profile?.creatorStateLabel || payload.profile?.creatorState || "-"}`,
    `补充要求：${payload.profile?.extraRequirements || "无"}`,
    "",
    "【次要设置】",
    `内容目的：${payload.filters?.objectiveLabel || payload.filters?.objective || "-"}`,
    `出镜强度：${payload.filters?.presenceLabel || payload.filters?.presence || "-"}`,
    `拍摄难度：${payload.filters?.difficultyLabel || payload.filters?.difficulty || "-"}`,
    `视频长度：${payload.filters?.durationLabel || payload.filters?.duration || "-"}`,
    "",
    "【对标爆款参考】",
    listItems(
      payload.references?.samples || [],
      (sample, index) => `${index + 1}. ${sample.platform || "外部参考"} / ${sample.creator || "参考条目"} / ${sample.title || sample.raw}`
    ),
    payload.references?.benchmarkRawText ? `原始输入：${payload.references.benchmarkRawText}` : "原始输入：无",
    "",
    "【我的创意草稿】",
    payload.references?.creativeDraftText || "无",
    "",
    "【已生成的参考选题】",
    listItems(payload.referenceIdeas || [], (idea, index) => `${index + 1}. ${idea.title} / ${idea.referenceBasis || idea.recommendationReason}`),
    "",
    "【已生成的创意选题】",
    listItems(payload.creativeIdeas || [], (idea, index) => `${index + 1}. ${idea.title} / ${idea.highlight || idea.recommendationReason}`),
    "",
    "【当前选中的选题】",
    payload.activeIdea
      ? `${payload.activeIdea.title}\n推荐理由：${payload.activeIdea.recommendationReason || payload.activeIdea.highlight || "-"}`
      : "无",
    "",
    "【日历设置】",
    `开始日期：${payload.calendarSettings?.startDate || "-"}`,
    `排期周期：${payload.calendarSettings?.windowDays || "-"} 天`
  ].join("\n");
}

function buildPromptEnvelope(payload, taskInstruction, outputSchema, temperature = 0.7) {
  return {
    systemPrompt: `${payload.promptOverride || baseSystemPrompt}\n\n${baseSystemPrompt}`,
    userPrompt: `${buildContextBlock(payload)}\n\n【任务要求】\n${taskInstruction}`,
    outputSchema,
    temperature
  };
}

function buildReferenceIdeasPrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请基于账号画像和对标爆款参考，生成 4 条参考选题。它们应当明显与输入样本有关联，但已经转成更适合当前账号定位的版本。每条必须写清标题、参考依据、适合场景、适合平台和推荐理由。",
    `{
  "items": [
    {
      "id": "reference-idea-id",
      "title": "string",
      "referenceBasis": "string",
      "scene": "string",
      "platform": "string",
      "recommendationReason": "string"
    }
  ]
}`,
    0.55
  );
}

function buildCreativeIdeasPrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请在对标参考和用户自己的创意草稿基础上再往前走一步，生成 4 条更有创造性的选题。优先吸收用户草稿里已经出现的方向，再把它升级成更适合账号定位的版本。每条必须说明亮点、适合场景、预期效果、拍摄难度和推荐理由。不要只是换个说法重复参考选题。",
    `{
  "items": [
    {
      "id": "creative-idea-id",
      "title": "string",
      "highlight": "string",
      "scene": "string",
      "outcome": "string",
      "difficulty": "string",
      "platform": "string",
      "recommendationReason": "string"
    }
  ],
  "recommendedId": "string"
}`,
    0.8
  );
}

function buildScriptPrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请为当前选题生成一版脚本结果，只输出标题建议、开头 hook、视频结构、分段脚本和字幕关键词。内容要更像真实 vlog，而不是广告文案。",
    `{
  "titleSuggestions": ["string"],
  "hook": "string",
  "structure": ["string"],
  "scriptSections": [
    {
      "label": "string",
      "content": "string"
    }
  ],
  "subtitleKeywords": ["string"]
}`,
    0.75
  );
}

function buildShootingAdvicePrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请只输出当前选题的拍摄建议，包括拍摄角度、镜头建议、拍摄注意事项和 B-roll 建议。拍摄角度要具体到低机位、俯拍、侧逆光、手持跟拍、固定机位等。",
    `{
  "angles": ["string"],
  "shotSuggestions": ["string"],
  "notes": ["string"],
  "broll": ["string"]
}`,
    0.7
  );
}

function buildFullPlanPrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请输出一整套完整拍摄方案，合并脚本与拍摄建议。结果必须同时包含标题建议、开头 hook、视频结构、分段脚本、拍摄角度、镜头建议、拍摄注意事项、B-roll 建议、字幕关键词。",
    `{
  "titleSuggestions": ["string"],
  "hook": "string",
  "structure": ["string"],
  "scriptSections": [
    {
      "label": "string",
      "content": "string"
    }
  ],
  "angles": ["string"],
  "shotSuggestions": ["string"],
  "notes": ["string"],
  "broll": ["string"],
  "subtitleKeywords": ["string"]
}`,
    0.75
  );
}

function buildCalendarSummaryPrompt(payload) {
  return buildPromptEnvelope(
    payload,
    "请基于已经生成的选题结果和更新频率，输出未来 7 天或 14 天的简洁工作日历。每条只需要日期、内容标题、内容类型、目标平台、发布目的和一句提醒。snapshot 必须同时给出本周期重点、建议更新频率、内容分布建议和一句总摘要。",
    `{
  "entries": [
    {
      "id": "calendar-id",
      "dateLabel": "string",
      "title": "string",
      "type": "string",
      "platform": "string",
      "goal": "string",
      "reminder": "string"
    }
  ],
  "snapshot": {
    "focus": "string",
    "cadence": "string",
    "distribution": "string",
    "summary": "string"
  }
}`,
    0.55
  );
}

export function buildTaskPrompt(taskType, payload) {
  const builders = {
    "reference-ideas": buildReferenceIdeasPrompt,
    "creative-ideas": buildCreativeIdeasPrompt,
    script: buildScriptPrompt,
    "shooting-advice": buildShootingAdvicePrompt,
    "full-plan": buildFullPlanPrompt,
    "calendar-summary": buildCalendarSummaryPrompt
  };

  const builder = builders[taskType];

  if (!builder) {
    throw new Error(`未识别的任务类型：${taskType}`);
  }

  return builder(payload);
}
