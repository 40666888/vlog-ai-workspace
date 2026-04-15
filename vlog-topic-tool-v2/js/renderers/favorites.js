import { getCurrentSpotlight } from "../state.js";
import { renderEmptyState, renderTagList } from "./shared.js";

export function renderSupportSection(elements, state) {
  const spotlight = getCurrentSpotlight(state);
  const formulas = [
    `前端把账号画像、平台目标、参考样本、当前主推内容和风格模式都存进统一 state，避免每次点击按钮都重新拼上下文。`,
    `后端按任务类型拆 prompt：benchmark、ideas、spotlight、titles、cover、script、calendar、rewrite 各自独立 builder，不再把零碎输入直接丢给模型。`,
    `前端请求层统一走 /api/generate，后端再根据 taskType 分发到不同 prompt builder；后续如果要拆路由，也可以平滑扩展成 /api/generate-ideas、/api/generate-script 这类接口。`,
    `每个结果区都自带 metadata，能看出任务类型、生成时间、风格模式、是否使用了参考样本，以及这次是 live API 还是 mock fallback。`,
    spotlight
      ? `当前主推内容“${spotlight.title}”已经能继续生成标题、脚本、封面、角度和日历，并在模块之间复用。`
      : `选中一条主推选题后，动作中心和各模块工具栏都会自动共享它作为上下文。`
  ];

  elements.formulaList.innerHTML = formulas.map((item) => `<li>${item}</li>`).join("");

  if (!state.favorites.length) {
    elements.favoritesList.innerHTML = renderEmptyState("还没有收藏内容。你可以把主推选题加入收藏，再继续做脚本或日历。");
    return;
  }

  elements.favoritesList.innerHTML = state.favorites
    .map(
      (idea) => `
        <article class="favorite-item">
          <div class="favorite-head">
            <div>
              <strong>${idea.title}</strong>
              <p>${idea.strategyLabel || idea.goal}</p>
            </div>
            <div class="tiny-actions">
              <button type="button" class="button-tiny" data-favorite-action="activate" data-favorite-id="${idea.id}">设为主推</button>
              <button type="button" class="button-tiny" data-favorite-action="remove" data-favorite-id="${idea.id}">移除</button>
            </div>
          </div>
          <p>${idea.recommendedReason || idea.recommendationReason || ""}</p>
          <div class="card-actions">${renderTagList([idea.strategyLabel || "收藏", idea.platform || "待定"])}</div>
        </article>
      `
    )
    .join("");
}
