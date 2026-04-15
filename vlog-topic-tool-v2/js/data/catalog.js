export const providerOptions = [
  { value: "openai", label: "OpenAI 官方" },
  { value: "openai_compatible", label: "OpenAI Compatible" },
  { value: "minimax_native", label: "MiniMax Native" }
];

export const providerPresetOptions = [
  { value: "openai", label: "OpenAI" },
  { value: "openai_compatible", label: "OpenAI Compatible" },
  { value: "deepseek-compatible", label: "DeepSeek Compatible" },
  { value: "qwen-compatible", label: "Qwen Compatible" },
  { value: "glm-compatible", label: "GLM Compatible" },
  { value: "minimax-compatible", label: "MiniMax Compatible" },
  { value: "minimax-native", label: "MiniMax Native" },
  { value: "custom", label: "Custom" }
];

export const providerPresetMap = {
  openai: {
    preset: "openai",
    provider: "openai",
    label: "OpenAI",
    model: "gpt-4.1-mini",
    modelPlaceholder: "例如：gpt-4.1-mini / gpt-4.1",
    baseURL: "",
    baseURLPlaceholder: "留空则默认使用 https://api.openai.com/v1"
  },
  openai_compatible: {
    preset: "openai_compatible",
    provider: "openai_compatible",
    label: "OpenAI Compatible",
    model: "",
    modelPlaceholder: "例如：deepseek-chat / qwen-plus / glm-4-plus / MiniMax-M2.5",
    baseURL: "",
    baseURLPlaceholder: "例如：https://api.deepseek.com/v1 / https://api.minimaxi.com/v1"
  },
  "deepseek-compatible": {
    preset: "deepseek-compatible",
    provider: "openai_compatible",
    label: "DeepSeek Compatible",
    model: "deepseek-chat",
    modelPlaceholder: "例如：deepseek-chat / deepseek-reasoner",
    baseURL: "https://api.deepseek.com/v1",
    baseURLPlaceholder: "https://api.deepseek.com/v1"
  },
  "qwen-compatible": {
    preset: "qwen-compatible",
    provider: "openai_compatible",
    label: "Qwen Compatible",
    model: "qwen-plus",
    modelPlaceholder: "例如：qwen-plus / qwen-max",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    baseURLPlaceholder: "https://dashscope.aliyuncs.com/compatible-mode/v1"
  },
  "glm-compatible": {
    preset: "glm-compatible",
    provider: "openai_compatible",
    label: "GLM Compatible",
    model: "glm-4-plus",
    modelPlaceholder: "例如：glm-4-plus / glm-4-air",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    baseURLPlaceholder: "https://open.bigmodel.cn/api/paas/v4"
  },
  "minimax-compatible": {
    preset: "minimax-compatible",
    provider: "openai_compatible",
    label: "MiniMax Compatible",
    model: "MiniMax-M2.5",
    modelPlaceholder: "例如：MiniMax-M2.5 / MiniMax-M2.5-highspeed",
    baseURL: "https://api.minimaxi.com/v1",
    baseURLPlaceholder: "https://api.minimaxi.com/v1"
  },
  "minimax-native": {
    preset: "minimax-native",
    provider: "minimax_native",
    label: "MiniMax Native",
    model: "MiniMax-M2.7",
    modelPlaceholder: "例如：MiniMax-M2.7 / MiniMax-M2.7-highspeed",
    baseURL: "https://api.minimaxi.com/v1",
    baseURLPlaceholder: "https://api.minimaxi.com/v1"
  },
  custom: {
    preset: "custom",
    provider: "openai_compatible",
    label: "Custom",
    model: "",
    modelPlaceholder: "填写你的自定义模型名",
    baseURL: "",
    baseURLPlaceholder: "填写兼容 OpenAI 的 Base URL"
  }
};

export const connectionDefaults = {
  preset: "openai",
  provider: "openai",
  model: "gpt-4.1-mini",
  baseURL: "",
  backendEndpoint: "/api/generate",
  rememberApiKeyInSession: false
};

export const optionSets = {
  accountType: [
    { value: "campus_life", label: "男大学生日常成长型" },
    { value: "sports_boy", label: "运动状态型男生" },
    { value: "travel_student", label: "周末旅行记录型" },
    { value: "glow_up", label: "状态感 / 颜值氛围型" }
  ],
  commonScene: [
    { value: "campus", label: "校园 / 宿舍 / 教学楼" },
    { value: "gym", label: "健身房 / 球场" },
    { value: "city", label: "城市街区 / 商场 / 咖啡店" },
    { value: "mixed", label: "校园 + 城市混合" }
  ],
  audience: [
    { value: "peers", label: "同龄大学生" },
    { value: "female_viewers", label: "喜欢少年感内容的女生" },
    { value: "lifestyle", label: "泛生活方式观众" },
    { value: "fitness", label: "喜欢运动感男生内容的人群" }
  ],
  mainPlatform: [
    { value: "xiaohongshu", label: "小红书" },
    { value: "douyin", label: "抖音" },
    { value: "bilibili", label: "B 站" }
  ],
  accountVibe: [
    { value: "boyish", label: "少年感" },
    { value: "energetic", label: "热血有活力" },
    { value: "cinematic", label: "电影感 / 质感" },
    { value: "relaxed", label: "松弛生活流" }
  ],
  frequency: [
    { value: "3", label: "每周 3 条" },
    { value: "5", label: "每周 5 条" },
    { value: "daily", label: "基本日更" }
  ],
  theme: [
    { value: "campus", label: "校园日常" },
    { value: "sports", label: "运动活力" },
    { value: "travel", label: "旅行探索" },
    { value: "glow", label: "颜值氛围" }
  ],
  creatorState: [
    { value: "quick", label: "今天想快速拍，别太复杂" },
    { value: "on", label: "今天状态在线，愿意出镜" },
    { value: "low_energy", label: "今天精力一般，想轻量更新" },
    { value: "go_big", label: "今天想认真拍一条代表作" }
  ],
  mood: [
    { value: "energetic", label: "更燃一点" },
    { value: "breezy", label: "更生活流" },
    { value: "atmospheric", label: "更有氛围感" },
    { value: "documentary", label: "更像纪录片" },
    { value: "funny", label: "更搞笑一点" }
  ],
  scene: [
    { value: "campus", label: "校园" },
    { value: "gym", label: "健身房 / 球场" },
    { value: "city", label: "城市街区" },
    { value: "outdoor", label: "户外旅行" },
    { value: "indoor", label: "宿舍 / 室内" },
    { value: "night", label: "夜晚状态" }
  ],
  objective: [
    { value: "growth", label: "涨粉 / 破圈" },
    { value: "interaction", label: "提高互动" },
    { value: "branding", label: "强化人设标签" },
    { value: "series", label: "做成系列栏目" },
    { value: "commercial", label: "兼容未来商单" }
  ],
  platformPreference: [
    { value: "xiaohongshu", label: "更像小红书爆款" },
    { value: "douyin", label: "更像抖音强节奏" },
    { value: "bilibili", label: "更像 B 站陪伴式" }
  ],
  presence: [
    { value: "high", label: "高出镜，正脸 / 口播都可以" },
    { value: "medium", label: "中等出镜，偶尔露脸" },
    { value: "low", label: "低出镜，以背影 / 手部 / POV 为主" }
  ],
  difficulty: [
    { value: "easy", label: "低难度，拿起手机就能拍" },
    { value: "mid", label: "中难度，需要一点设计感" },
    { value: "high", label: "高难度，适合认真拍一条" }
  ],
  timeSlot: [
    { value: "morning", label: "早上 / 上午" },
    { value: "afternoon", label: "下午" },
    { value: "evening", label: "傍晚 / 日落" },
    { value: "night", label: "晚上 / 夜景" }
  ],
  budget: [
    { value: "low", label: "低预算，最好不额外花钱" },
    { value: "normal", label: "正常预算" },
    { value: "flex", label: "可以为了画面多花一点" }
  ],
  spontaneous: [
    { value: "yes", label: "适合临时拍，马上可执行" },
    { value: "prepare", label: "需要提前准备一点" },
    { value: "plan", label: "更适合专门规划后拍" }
  ],
  collaboration: [
    { value: "solo", label: "最好一个人就能完成" },
    { value: "optional", label: "有朋友帮拍更好" },
    { value: "need", label: "需要朋友配合才更完整" }
  ],
  duration: [
    { value: "short", label: "30-45 秒" },
    { value: "medium", label: "45-75 秒" },
    { value: "long", label: "75-120 秒" }
  ]
};

export const styleModes = {
  none: { label: "默认工作流", tone: "标准输出" },
  energetic: { label: "更燃一点", tone: "热血强节奏" },
  atmospheric: { label: "更有氛围感", tone: "电影感 / 光影感" },
  documentary: { label: "更像纪录片", tone: "观察式 / 纪录感" },
  daily: { label: "更生活流", tone: "陪伴式 / 松弛感" },
  funny: { label: "更搞笑一点", tone: "反差感 / 轻幽默" },
  growth: { label: "更适合涨粉", tone: "更强标题和强钩子" },
  xhs: { label: "更像小红书爆款", tone: "封面感 / 收藏感" },
  douyin: { label: "更像抖音强节奏", tone: "悬念前置 / 快切" }
};

export const quickRewritePresets = [
  {
    value: "更具争议性",
    hint: "把切入点写得更有讨论度，但不要为了争议而脱离账号气质。"
  },
  {
    value: "转为室内",
    hint: "把场景改成宿舍、教室或窗边也能成立的版本。"
  },
  {
    value: "更像纪录片",
    hint: "减少表演感，强调观察式镜头和真实环境声。"
  },
  {
    value: "更适合涨粉",
    hint: "强化前 3 秒、结果镜头和平台停留逻辑。"
  }
];

export const defaultProfileValues = {
  accountType: "campus_life",
  commonScene: "mixed",
  audience: "female_viewers",
  mainPlatform: "xiaohongshu",
  accountVibe: "boyish",
  frequency: "5"
};

export const defaultFilterValues = {
  theme: "campus",
  creatorState: "quick",
  mood: "breezy",
  scene: "campus",
  objective: "growth",
  platformPreference: "xiaohongshu",
  presence: "medium",
  difficulty: "easy",
  timeSlot: "morning",
  budget: "low",
  spontaneous: "yes",
  collaboration: "solo",
  duration: "short",
  referenceData:
    "小红书 @阿昊的上学记录《男大学生早八前把自己收拾干净的一天》\n抖音 @校园男生镜头日记《上课前 15 分钟，状态要先回来》"
};

export const defaultCalendarSettings = {
  cadence: "5",
  windowDays: "7"
};

export const platformHints = {
  xiaohongshu: {
    label: "小红书",
    publishTime: "19:00-22:00",
    bias: "标题感、封面感、收藏感"
  },
  douyin: {
    label: "抖音",
    publishTime: "18:00-23:00",
    bias: "强钩子、强节奏、前 3 秒停留"
  },
  bilibili: {
    label: "B 站",
    publishTime: "20:00-23:30",
    bias: "陪伴感、故事线、真实观察"
  }
};

export const themeCatalog = {
  campus: {
    label: "校园日常",
    titlePrefixes: ["男大学生日常更新", "普通一天也能很上镜", "把校园拍出电影感", "今天的大学生活有点燃"],
    titleSuffixes: ["，真的很适合做成 vlog", "，普通日常也能有记忆点", "，这条会很像账号代表作"],
    scenes: ["宿舍 / 教学楼 / 食堂转角", "图书馆门口", "操场看台", "宿舍阳台"],
    actions: ["早八前把自己收拾利索", "课间冲去球场的十分钟", "图书馆出来后的慢走镜头", "宿舍出门前的穿搭整理"],
    visuals: ["逆光走廊", "脚步特写", "宿舍桌面整理", "书包甩肩动作"],
    formats: ["第一人称校园记录", "少年感状态流", "一天碎片式 vlog"],
    personas: ["少年感男大学生", "状态稳定更新型账号", "日常也很会记录的人设"],
    angles: ["低机位走路开场", "窗边侧逆光特写", "三脚架定机口播", "手持跟拍出门", "俯拍书桌整理"],
    broll: ["教室门口环境音", "脚步与书包细节", "宿舍窗帘和天光", "操场远景"],
    transitions: ["甩包动作转场", "门框遮挡切镜", "抬手挡镜转场"],
    coverLines: ["男大学生状态感", "普通上学日也能很出片", "校园少年感一条就够了"],
    strategyLabels: ["人设建设", "轻量更新", "爆款尝试"],
    reasons: ["校园场景天然代入感强，很适合做账号识别度。", "普通场景拍出状态感，最容易引发收藏。"]
  },
  sports: {
    label: "运动活力",
    titlePrefixes: ["运动完状态真的会变", "今天把荷尔蒙拍出来", "练完这一组直接通透", "一条很有汗感的 vlog"],
    titleSuffixes: ["，开头就能抓住人", "，很适合冲播放", "，看完会想立刻动起来"],
    scenes: ["健身房镜墙", "篮球场边线", "操场弯道", "夜跑路灯下"],
    actions: ["篮球场对抗连进几球", "健身房练背后的镜子回看", "跑步冲刺最后两百米", "夜跑结束后的大口呼吸"],
    visuals: ["汗珠近景", "鞋底启动声画", "肌肉发力特写", "呼吸声收音"],
    formats: ["热血训练 vlog", "前后状态反差视频", "运动状态纪录"],
    personas: ["运动感男生", "自律状态型账号", "荷尔蒙路线内容人设"],
    angles: ["广角冲刺跟拍", "镜子前中景定机", "低机位起步动作", "长焦侧拍投篮", "手持围绕转身镜头"],
    broll: ["鞋带拉紧", "护腕和水杯细节", "呼吸与汗珠", "球场灯光"],
    transitions: ["起跳硬切", "挥手擦汗匹配转场", "脚步踩点切换"],
    coverLines: ["练完真的会变帅", "男生运动感太适合拍了", "这条就是状态回来的证据"],
    strategyLabels: ["爆款尝试", "涨粉冲刺", "人设建设"],
    reasons: ["运动内容天然自带节奏和反差，很适合做高完播。", "同类热门内容普遍都把结果镜头放得很前。"]
  },
  travel: {
    label: "旅行探索",
    titlePrefixes: ["周末出走一趟", "大学生也能拍出旅行电影感", "这一站值回镜头", "短途旅行太适合做 vlog"],
    titleSuffixes: ["，会很适合做收藏款", "，这一条更偏记忆点", "，很适合小红书和 B 站双发"],
    scenes: ["高铁站检票口", "海边栈道", "山顶观景点", "城市街角"],
    actions: ["高铁出发到落地的快切", "海边风很大的回头镜头", "山路步行时的呼吸感记录", "陌生城市随手进店探路"],
    visuals: ["车窗反射", "地图导航特写", "城市掠影", "黄昏路牌"],
    formats: ["短途旅行 vlog", "周末出逃记录", "城市漫游叙事片"],
    personas: ["周末探索型男大", "会找地方拍的氛围账号", "松弛旅行感人设"],
    angles: ["列车窗边侧脸", "广角环境推进", "手持跟拍下车", "三脚架远景走入画面", "逆光回头特写"],
    broll: ["车票和检票口", "街边招牌", "民宿窗台", "落日环境音"],
    transitions: ["车窗擦镜转场", "抬头看路牌切景", "走进画面后切地点"],
    coverLines: ["这一站真的太值了", "周末出走一趟就会恢复状态", "大学生也能拍出旅行电影感"],
    strategyLabels: ["情绪表达", "人设建设", "节日节点"],
    reasons: ["旅行内容更容易形成收藏和转发。", "高互动旅行内容通常都有明确的出发、到达和收尾结构。"]
  },
  glow: {
    label: "颜值氛围",
    titlePrefixes: ["把状态感拍成内容", "今天专注出片和颜值", "镜头前状态在线的一天", "男生也能做高级感 vlog"],
    titleSuffixes: ["，封面会很好看", "，适合做状态感代表作", "，比较像小红书收藏款"],
    scenes: ["宿舍镜前", "电梯反光面", "咖啡店窗边", "街角玻璃幕墙"],
    actions: ["出门前做简洁护肤和整理发型", "挑一套更显精神的穿搭", "咖啡店窗边做轻微侧脸特写", "日落前走一段街拍感镜头"],
    visuals: ["五官近景", "穿搭层次", "头发纹理", "转身回头"],
    formats: ["状态感 vlog", "男生出片日常", "轻护肤穿搭记录"],
    personas: ["状态感男生", "颜值气质型账号", "精致但不油腻的人设"],
    angles: ["窗边侧逆光特写", "镜前半身定机", "低机位转身走近", "俯拍桌面收纳", "玻璃倒影侧拍"],
    broll: ["护肤品和穿搭细节", "手表项链近景", "头发纹理", "咖啡店杯子与书"],
    transitions: ["镜子遮挡切镜", "转身甩头发转场", "拿起外套衔接下一个场景"],
    coverLines: ["今天真的很出片", "普通但高级的男生状态感", "这条很适合做账号门面"],
    strategyLabels: ["人设建设", "轻量更新", "商单兼容"],
    reasons: ["状态感内容更利于做封面和建立审美认知。", "同类爆款的核心是把细节拍得有呼吸感。"]
  }
};

export const benchmarkSeedLibrary = {
  campus: [
    {
      platform: "小红书",
      creator: "@阿昊的上学记录",
      laneTags: ["男大学生", "校园状态", "少年感"],
      hotTitles: ["男大学生早八前把自己收拾干净的一天", "普通上学日怎么拍出状态感", "课间十分钟冲去球场也能拍成热血感"],
      commonPattern: "普通场景 + 强状态镜头 + 真实流程，前 3 秒先给最帅的一幕。",
      whyHot: "既像日常又像轻微人设建设，观众很容易代入。",
      borrowAngle: "把出门前整理、下楼走路和课间状态放在开头。",
      adaptHint: "如果你常拍宿舍和教学楼，这类内容最适合做基础更新栏目。"
    },
    {
      platform: "抖音",
      creator: "@校园男生镜头日记",
      laneTags: ["校园vlog", "强节奏", "状态感"],
      hotTitles: ["上课前 15 分钟，状态要先回来", "男大学生从宿舍走到教学楼的 12 秒", "一天里最有少年感的几个镜头"],
      commonPattern: "结果镜头极前置，节奏快，字幕少，用动作衔接镜头。",
      whyHot: "很适合刷短视频时被快速识别。",
      borrowAngle: "把你的一天压缩成 4-5 个最能体现状态的动作镜头，不讲全流程。",
      adaptHint: "如果今天只有碎片时间，就先做这种强节奏短版。"
    }
  ],
  sports: [
    {
      platform: "抖音",
      creator: "@训练完状态回来了",
      laneTags: ["健身vlog", "男生状态", "热血"],
      hotTitles: ["练完这一组，整个人都通透了", "篮球场上最有感觉的 8 秒", "今天把荷尔蒙拍出来"],
      commonPattern: "动作高潮放前面，再补训练过程和喘息声。",
      whyHot: "运动内容天然自带节奏和反差，很容易形成停留。",
      borrowAngle: "把最炸的动作镜头前置，再补训练前后的精神状态变化。",
      adaptHint: "不一定拍全流程，只要一个动作、一段呼吸和一个收尾就够成立。"
    },
    {
      platform: "小红书",
      creator: "@今晚去跑步了",
      laneTags: ["夜跑", "生活方式", "男生状态"],
      hotTitles: ["跑完步真的会变清爽", "男生夜跑后那种通透感很上头", "练完以后的状态最适合拍"],
      commonPattern: "结果感 + 松弛恢复镜头，运动之后的对镜整理很关键。",
      whyHot: "不是卷动作，而是在卷“练完之后人变得更好看”。",
      borrowAngle: "别只拍器械，训练后整理发型、喝水、喘气都可以成为记忆点。",
      adaptHint: "运动赛道里，恢复状态比纯动作更适合 vlog 账号。"
    }
  ],
  travel: [
    {
      platform: "小红书",
      creator: "@周末就出走",
      laneTags: ["城市漫游", "短途旅行", "氛围感"],
      hotTitles: ["大学生周末出逃一趟真的会回血", "这座城市太适合走走停停了", "短途旅行也能拍出电影感"],
      commonPattern: "出发、到达、停留、收尾四段很完整，画面偏收藏款。",
      whyHot: "旅行内容天然带地点价值，容易被收藏。",
      borrowAngle: "先给最出片的一幕，再倒回去讲怎么到这里的。",
      adaptHint: "预算一般时，把重点放在路线和状态，而不是硬凑景点。"
    },
    {
      platform: "B 站",
      creator: "@我的周末外出片",
      laneTags: ["旅行vlog", "学生时代", "陪伴感"],
      hotTitles: ["和自己出走一天是什么感觉", "这趟不远，但很值得拍下来", "学生时代的短途旅行都很好记"],
      commonPattern: "更像记录而不是攻略，旁白更真实，节奏更缓。",
      whyHot: "陪伴感强，容易做出长期系列感。",
      borrowAngle: "把路上的碎片、等待和风景一起留下来，让观众像跟你同行。",
      adaptHint: "如果更想做人设，B 站式旅行记录更适合沉淀。"
    }
  ],
  glow: [
    {
      platform: "小红书",
      creator: "@今天状态在线",
      laneTags: ["状态感", "男生出片", "氛围"],
      hotTitles: ["男生今天真的很出片", "把状态感拍成内容的一天", "普通但高级的男生 vlog"],
      commonPattern: "镜头少而稳，强调细节、光线和整个人的精神状态。",
      whyHot: "靠审美和状态认同驱动收藏与点赞。",
      borrowAngle: "护肤、穿搭、出门三段就够，不要堆太多动作。",
      adaptHint: "把最稳定出片的场景做成固定模板，账号会更统一。"
    },
    {
      platform: "抖音",
      creator: "@男生氛围镜头",
      laneTags: ["颜值向", "快切", "状态感"],
      hotTitles: ["今天只想把状态拍出来", "男生也能做高级感短 vlog", "这条适合放在主页门面"],
      commonPattern: "近景细节 + 强节奏切换，普通动作也靠镜头设计变得更有张力。",
      whyHot: "第一眼就知道这条内容是出片向。",
      borrowAngle: "如果想更抓人，把最好的近景脸部或穿搭细节前置。",
      adaptHint: "同样的状态内容，抖音版要更快，小红书版要更精致。"
    }
  ]
};

export const supportTasks = [
  {
    title: "素材补拍",
    strategy: "轻量更新",
    platform: "多平台通用",
    priority: "中",
    goal: "补充空镜和 B-roll",
    note: "今天先补环境声、细节镜头和转场素材。",
    extra: "优先补你最常拍场景的固定镜头，后续连载都会用到。"
  },
  {
    title: "评论区选题挖掘",
    strategy: "提高互动",
    platform: "小红书 / B 站",
    priority: "高",
    goal: "把评论变成下条内容",
    note: "从评论区整理 3 个常见问题，转成下一条开场问题。",
    extra: "适合安排在高互动内容后一天。"
  },
  {
    title: "封面模板复盘",
    strategy: "商单兼容",
    platform: "小红书",
    priority: "中",
    goal: "统一视觉识别",
    note: "挑最近 3 条内容复盘封面和标题风格。",
    extra: "建立固定模板后，后续合作内容也更好融入。"
  },
  {
    title: "栏目结构整理",
    strategy: "人设建设",
    platform: "B 站 / 小红书",
    priority: "中",
    goal: "让账号更像连续更新",
    note: "整理哪类内容该做成固定栏目，哪类只做偶发爆点。",
    extra: "适合在一周结束时做轻复盘。"
  }
];

export function resolveThemeKeyFromProfile(profile, filters) {
  if (filters.theme && filters.theme !== "all") {
    return filters.theme;
  }

  const map = {
    campus_life: "campus",
    sports_boy: "sports",
    travel_student: "travel",
    glow_up: "glow"
  };

  return map[profile.accountType] || "campus";
}
