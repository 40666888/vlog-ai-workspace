const { buildPromptPackage } = require("./shared");

function buildScriptPrompt(task, payload) {
  const activeIdeaTitle = payload?.activeIdea?.title || "当前选题";
  const baseRules = [
    "所有内容都必须围绕当前选题展开，不要重新发明题目。",
    "输出要贴近真实 vlog 拍摄，而不是空泛文案。",
    "整体气质要符合男大学生日常账号：自然、清爽、有少年感、有状态，但不要油腻或刻意装帅。",
    "脚本语言要像真实创作者会说的话，允许简洁、口语化、生活流，不要写成品牌广告或鸡汤独白。",
    "少写解释自己为什么要拍，优先直接给动作、状态、画面和一句有代入感的话。",
    "拍摄角度必须是明确镜位或运镜，例如低机位、俯拍、手持跟拍、固定机位、侧逆光特写。",
    "拍摄注意事项必须具体到噪音、光线、前三秒信息密度、出镜状态、转场节奏等。",
    "优先使用校园、宿舍、操场、健身房、城市步行、短途出行等真实可拍场景，不要给出难以落地的大片式方案。"
  ];

  if (task === "shooting_script") {
    return buildPromptPackage({
      task,
      goal: `围绕“${activeIdeaTitle}”输出结构化脚本内容，包括标题建议、开头 Hook、脚本大纲、分段脚本和字幕关键词。`,
      payload,
      rules: [
        ...baseRules,
        "titleSuggestions 返回 3 条以内。",
        "scriptSections 至少返回 3 段。",
        "subtitleKeywords 返回适合上屏的关键词。",
        "hook 要在前 3 秒说清楚看点，可以是状态变化、时间限制、真实反差或当天目标。",
        "分段脚本要体现真实生活动线，不要只有情绪，没有行为。",
        "titleSuggestions 优先短一点，像真实短视频标题，不要太书面。",
        "每段 scriptSections 最多 1 到 2 句，避免长段抒情和过度旁白。"
      ],
      outputExample: {
        titleSuggestions: ["今天把普通校园日常拍得更有状态感"],
        hook: "开头先上最有状态的一幕，再用一句话说清为什么值得看。",
        structure: ["第 1 段：结果先给出来。", "第 2 段：补充当天状态。", "第 3 段：结尾回到人物状态。"],
        scriptSections: [
          {
            label: "开场",
            content: "今天想拍的不是一件大事，而是一个状态慢慢回来的过程。"
          }
        ],
        subtitleKeywords: ["男大学生日常", "状态感", "校园 vlog"]
      }
    });
  }

  if (task === "shooting_advice") {
    return buildPromptPackage({
      task,
      goal: `围绕“${activeIdeaTitle}”输出拍摄建议，包括拍摄角度、镜头设计、注意事项和 B-roll 建议。`,
      payload,
      rules: [
        ...baseRules,
        "angles 至少返回 4 条明确机位或运镜建议。",
        "shotSuggestions 侧重镜头顺序、镜头类型和节奏。",
        "notes 必须是可执行提醒，不要写成空洞原则。",
        "broll 返回适合顺手补拍的素材。",
        "镜头建议优先给出校园 vlog 常见的实用拍法，例如低机位走路、宿舍桌面俯拍、操场侧逆光、手持跟拍、固定机位整理动作。",
        "注意事项要优先提醒普通创作者最容易踩坑的地方。",
        "shotSuggestions 和 notes 都尽量写得短而准，不要展开成长段说明。"
      ],
      outputExample: {
        angles: ["低机位走路开场", "窗边侧逆光特写", "手持跟拍出门", "俯拍桌面整理"],
        shotSuggestions: ["开头第一镜优先给人物状态或结果镜头，不要先拍空环境。"],
        notes: ["注意环境噪音，室内口播尽量远离风扇和走廊回声。"],
        broll: ["书包甩肩动作", "鞋子落地声", "窗边光线变化"]
      }
    });
  }

  return buildPromptPackage({
    task,
    goal: `围绕“${activeIdeaTitle}”输出完整拍摄方案，同时给出脚本内容和拍摄执行建议。`,
    payload,
    rules: [
      ...baseRules,
      "完整拍摄方案必须同时包含脚本字段和拍摄建议字段。",
      "scriptSections 至少返回 3 段，angles 至少返回 4 条。",
      "输出必须适合普通创作者直接拿来拍。",
      "完整方案要兼顾内容吸引力和执行难度，优先让今天就能拍、今天就能发。",
      "如果当前选题更偏运动、旅行或颜值氛围，也要保持男大学生日常主线，不要偏成纯穿搭号或纯旅游攻略。",
      "structure 每条尽量控制在一句话内，scriptSections 每段最多 1 到 2 句，优先短、准、能直接拍。",
      "hook 要更像成片开头会出现的话，不要写成创作者对着镜头解释拍摄动机。"
    ],
    outputExample: {
      titleSuggestions: ["今天把普通校园日常拍得更有状态感"],
      hook: "开头先上最有状态的一幕，再用一句话说清为什么值得看。",
      structure: ["第 1 段：结果先给出来。", "第 2 段：补充当天状态。", "第 3 段：结尾回到人物状态。"],
      scriptSections: [
        {
          label: "开场",
          content: "今天想拍的不是一件大事，而是一个状态慢慢回来的过程。"
        }
      ],
      angles: ["低机位走路开场", "窗边侧逆光特写", "手持跟拍出门", "俯拍桌面整理"],
      shotSuggestions: ["开头第一镜优先给人物状态或结果镜头，不要先拍空环境。"],
      notes: ["注意环境噪音，室内口播尽量远离风扇和走廊回声。"],
      broll: ["书包甩肩动作", "鞋子落地声", "窗边光线变化"],
      subtitleKeywords: ["男大学生日常", "状态感", "校园 vlog"]
    }
  });
}

module.exports = {
  buildScriptPrompt
};
