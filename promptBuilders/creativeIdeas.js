const { buildPromptPackage } = require("./shared");

function buildCreativeIdeasPrompt(payload) {
  return buildPromptPackage({
    task: "creative_ideas",
    goal: "基于账号画像、对标样本和创意草稿，生成 3 到 5 条更有新意、但仍适合当前账号长期执行的创意选题。",
    payload,
    rules: [
      "创意选题要明显区别于参考选题，不能只是同义改写。",
      "创意要优先围绕男大学生日常主线展开，再自然融入运动、旅行探索、颜值状态或氛围感，不要硬拼标签。",
      "至少优先考虑一眼能拍、能做成系列、能强化人设的方向，而不是只追求概念感。",
      "highlight 说明创意亮点，outcome 说明预期效果。",
      "difficulty 必须贴近用户选择的拍摄难度。",
      "推荐理由要说明这条选题更适合怎样的人设或账号目标。",
      "标题不要太像营销标题，更像真实创作者会发的内容，避免油腻、过度包装和悬浮表达。",
      "标题优先短一点、顺一点，最好一眼就知道这条视频拍什么、凭什么值得点开。",
      "如果适合做成系列，要在推荐理由里点明为什么适合长期做。",
      "recommendedId 指向最值得先拍的一条。"
    ],
    outputExample: {
      items: [
        {
          id: "creative-idea-1",
          title: "把普通一天拍成更有少年感的状态流",
          highlight: "把真实状态和更有记忆点的镜头动作结合起来。",
          scene: "校园 / 宿舍 / 教学楼",
          outcome: "涨粉 / 强化账号主线",
          difficulty: "低难度，拿起手机就能拍",
          platform: "小红书",
          recommendationReason: "更适合作为你账号的主线内容持续强化人设。"
        }
      ],
      recommendedId: "creative-idea-1"
    }
  });
}

module.exports = {
  buildCreativeIdeasPrompt
};
