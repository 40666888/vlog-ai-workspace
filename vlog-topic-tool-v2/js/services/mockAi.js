import {
  benchmarkSeedLibrary,
  platformHints,
  themeCatalog,
  resolveThemeKeyFromProfile
} from "../data/catalog.js";

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function pick(items, index) {
  if (!items?.length) {
    return "";
  }

  return items[index % items.length];
}

function pickMany(items, count, offset = 0) {
  if (!items?.length) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => items[(offset + index) % items.length]);
}

function resolveTheme(payload) {
  const themeKey = resolveThemeKeyFromProfile(payload.profile, payload.filters);
  return {
    themeKey,
    theme: themeCatalog[themeKey]
  };
}

function resolvePlatform(payload) {
  return platformHints[payload.profile.mainPlatform] || platformHints.xiaohongshu;
}

function createMeta(task, payload, request) {
  return {
    task,
    generatedAt: new Date().toISOString(),
    provider: request.provider || "mock",
    model: request.model || "browser-mock",
    activeIdeaTitle: payload.activeIdea?.title || null,
    selectedReferenceCount: payload.references?.samples?.length || 0,
    usesReferenceData: Boolean(payload.references?.samples?.length)
  };
}

function buildReferenceIdeas(payload) {
  const { themeKey } = resolveTheme(payload);
  const platform = resolvePlatform(payload);
  const seeds = payload.references?.samples?.length
    ? payload.references.samples.map((sample, index) => ({
        id: sample.id || `reference-${index + 1}`,
        title: `${sample.title} 的账号定制版`,
        referenceBasis: `${sample.platform || "外部参考"} ${sample.creator || ""}`.trim(),
        scene: payload.profile.commonSceneLabel || payload.profile.commonScene,
        platform: platform.label,
        recommendationReason: `保留了样本“${sample.title}”的结构，但更贴合 ${payload.profile.accountTypeLabel || payload.profile.accountType} 的账号定位。`
      }))
    : (benchmarkSeedLibrary[themeKey] || []).map((item, index) => ({
        id: `reference-seed-${index + 1}`,
        title: item.hotTitles[0],
        referenceBasis: `${item.platform} ${item.creator}`,
        scene: payload.profile.commonSceneLabel || payload.profile.commonScene,
        platform: platform.label,
        recommendationReason: item.borrowAngle
      }));

  return {
    items: seeds.slice(0, 4)
  };
}

function buildCreativeIdeas(payload) {
  const { themeKey, theme } = resolveTheme(payload);
  const platform = resolvePlatform(payload);
  const creativeSeed = payload.references?.creativeDraftText?.trim();

  const items = Array.from({ length: 4 }, (_, index) => ({
    id: `creative-${themeKey}-${index + 1}`,
    title: creativeSeed && index === 0 ? `${creativeSeed} 的升级版` : `${pick(theme.titlePrefixes, index)}，但更像我的账号版本`,
    highlight: `${pick(theme.actions, index)} + ${pick(theme.visuals, index)}，让普通日常也有明确记忆点。`,
    scene: pick(theme.scenes, index),
    outcome: `${payload.filters.objectiveLabel || payload.filters.objective} / ${platform.bias}`,
    difficulty: payload.filters.difficultyLabel || payload.filters.difficulty,
    platform: platform.label,
    recommendationReason: `${pick(theme.reasons, index)} 这条更适合 ${payload.profile.accountVibeLabel || payload.profile.accountVibe} 的人设持续做。`
  }));

  return {
    items,
    recommendedId: items[0]?.id || null
  };
}

function buildScript(payload) {
  const { theme } = resolveTheme(payload);
  const activeIdea = payload.activeIdea;

  return {
    titleSuggestions: [
      activeIdea.title,
      `${activeIdea.title} | ${payload.profile.mainPlatformLabel || payload.profile.mainPlatform} 版本`,
      `今天把这条内容拍成更适合我的账号气质`
    ],
    hook: `开头先给“${activeIdea.title}”里最有状态的一幕，再用一句话点出这条内容的情绪价值。`,
    structure: [
      "第 1 段：结果镜头先出现，告诉观众这条内容值不值得看。",
      "第 2 段：补充当天状态和场景，让内容更像真实 vlog。",
      "第 3 段：收尾回到人物状态，留一句适合评论区互动的话。"
    ],
    scriptSections: [
      {
        label: "开场",
        content: `今天想拍的不是一件大事，而是 ${payload.profile.accountVibeLabel || payload.profile.accountVibe} 的状态。`
      },
      {
        label: "中段",
        content: `重点拍 ${pick(theme.actions, 0)} 和 ${pick(theme.visuals, 0)}，让画面先成立，再补轻量旁白。`
      },
      {
        label: "结尾",
        content: "结尾回到人物状态，留 1 句可承接下一条内容的收尾。"
      }
    ],
    subtitleKeywords: [
      payload.profile.accountVibeLabel || payload.profile.accountVibe,
      payload.profile.accountTypeLabel || payload.profile.accountType,
      payload.profile.mainPlatformLabel || payload.profile.mainPlatform
    ]
  };
}

function buildShootingAdvice(payload) {
  const { theme } = resolveTheme(payload);

  return {
    angles: pickMany(theme.angles, 5),
    shotSuggestions: [
      "开头优先用低机位或手持跟拍，让第一秒就有进入感。",
      "中段切入一两个固定机位，给观众一点观看稳定感。",
      "情绪镜头尽量贴近人物状态，不要全程只拍环境。"
    ],
    notes: [
      "注意环境噪音，室内口播尽量避开风扇、空调和走廊回声。",
      "开头 3 秒信息要集中，最好第一镜就出现人物状态或结果画面。",
      "如果是室内场景，优先靠近窗边，避免顶灯把脸拍平。"
    ],
    broll: pickMany(theme.broll, 4)
  };
}

function buildFullPlan(payload) {
  return {
    ...buildScript(payload),
    ...buildShootingAdvice(payload)
  };
}

function buildCalendarSummary(payload) {
  const ideas = [...(payload.creativeIdeas || []), ...(payload.referenceIdeas || [])];
  const totalDays = Number(payload.calendarSettings?.windowDays || 7);
  const startDate = new Date(payload.calendarSettings?.startDate || new Date().toISOString().slice(0, 10));
  const platform = resolvePlatform(payload);

  const entries = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    const activeIdea = ideas[index % Math.max(ideas.length, 1)];

    return {
      id: `calendar-${index + 1}`,
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      title: activeIdea?.title || "补拍素材 / 复盘标题",
      type: activeIdea ? (index % 2 === 0 ? "创意内容" : "参考内容") : "准备日",
      platform: platform.label,
      goal: activeIdea ? (activeIdea.outcome || activeIdea.recommendationReason) : "补充素材，准备下一条",
      reminder: activeIdea
        ? "发布前再检查封面和开头 3 秒是否够清楚。"
        : "今天适合补拍空镜、桌面、走路、出门等通用素材。"
    };
  });

  return {
    entries,
    snapshot: {
      focus: payload.filters.objectiveLabel || payload.filters.objective || "围绕主线内容持续更新",
      cadence:
        payload.profile.frequencyLabel ||
        (totalDays >= 14 ? "隔天更新更稳" : "本周建议保持 3-5 次更新"),
      distribution: `校园 / 运动 / 氛围内容交替出现，避免连续两条都只拍同一场景。`,
      summary: `未来 ${totalDays} 天已按你的更新频率生成简洁排期，建议优先发布已经选中的主线内容，再穿插轻量更新。`
    }
  };
}

export async function buildMockTaskResult(request) {
  await sleep(360);

  const payload = request.payload;
  const task = request.task || request.taskType;
  const meta = createMeta(task, payload, request);

  switch (task) {
    case "reference_ideas":
    case "reference-ideas":
      return {
        data: buildReferenceIdeas(payload),
        meta
      };
    case "creative_ideas":
    case "creative-ideas":
      return {
        data: buildCreativeIdeas(payload),
        meta
      };
    case "shooting_script":
    case "script":
      return {
        data: buildScript(payload),
        meta
      };
    case "shooting_advice":
    case "shooting-advice":
      return {
        data: buildShootingAdvice(payload),
        meta
      };
    case "full_plan":
    case "full-plan":
      return {
        data: buildFullPlan(payload),
        meta
      };
    case "calendar_summary":
    case "calendar-summary":
      return {
        data: buildCalendarSummary(payload),
        meta
      };
    default:
      throw new Error(`Unknown mock task type: ${task}`);
  }
}
