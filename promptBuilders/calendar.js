const { buildPromptPackage } = require("./shared");

function buildCalendarPrompt(payload) {
  return buildPromptPackage({
    task: "calendar_summary",
    goal: "基于当前选题池、当前主推选题和更新频率，输出未来 7 到 14 天的工作日历摘要。",
    payload,
    rules: [
      "entries 的数量要和排期窗口天数一致。",
      "优先围绕已经生成的选题来排期，不足时可以安排补拍或复盘内容。",
      "snapshot 需要固定包含 focus、cadence、distribution、summary 四个字段。",
      "reminder 要是一句简短、实用的拍摄或发布提醒。",
      "排期要避免连续几天都拍同一种内容，尽量在校园日常、运动状态、旅行探索、颜值氛围感之间做自然分布。",
      "如果账号主线仍以校园男大学生日常为核心，运动、旅行和颜值相关内容应作为强化人设的补充，而不是喧宾夺主。",
      "优先安排今天就能拍、近期最容易执行、最适合当前更新频率的内容。",
      "summary 和 reminder 都尽量短一点，避免写成长段分析。"
    ],
    outputExample: {
      entries: [
        {
          id: "calendar-1",
          dateLabel: "4/12",
          title: "男大学生出门前 15 分钟状态切换",
          type: "主线内容",
          platform: "小红书",
          goal: "涨粉 / 强化账号主线",
          reminder: "发布前先确认开头 3 秒是否足够清楚。"
        }
      ],
      snapshot: {
        focus: "本周优先做涨粉内容",
        cadence: "建议隔天更新，保证质量更稳",
        distribution: "校园主线、运动补充、状态类轻更新交替出现。",
        summary: "先拍主线内容，再穿插轻量更新，会更适合当前阶段。"
      }
    }
  });
}

module.exports = {
  buildCalendarPrompt
};
