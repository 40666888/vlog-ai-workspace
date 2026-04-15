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
      "reminder 要是一句简短、实用的拍摄或发布提醒。"
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
