const { buildPromptPackage } = require("./shared");

function buildReferenceIdeasPrompt(payload) {
  return buildPromptPackage({
    task: "reference_ideas",
    goal: "基于账号画像和对标样本，生成 3 到 5 条更贴近参考方向但已经账号定制化的参考选题。",
    payload,
    rules: [
      "每条选题都必须说明参考依据，不要写成随机脑暴。",
      "标题要适合男大学生日常、运动、旅行、颜值相关内容，不要脱离账号主线。",
      "推荐理由要说明为什么适合当前账号画像和当前拍摄状态。",
      "platform 优先填用户主平台，scene 优先结合用户常拍场景。",
      "id 使用 reference-idea-1 这种稳定格式。"
    ],
    outputExample: {
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
    }
  });
}

module.exports = {
  buildReferenceIdeasPrompt
};
