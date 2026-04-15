import { getActiveIdea } from "../state.js";
import {
  escapeHtml,
  renderEmptyState,
  renderSkeletonCards,
  renderStateCard,
  renderStatusText
} from "./shared.js";

function renderReferenceIdeas(state) {
  if (state.requests.referenceIdeas?.status === "loading") {
    return renderSkeletonCards(2);
  }

  if (state.requests.referenceIdeas?.status === "error") {
    return renderStateCard({
      variant: "error",
      title: "参考选题生成失败",
      message: state.requests.referenceIdeas.error || "请检查输入后重试。",
      actionLabel: "重试",
      actionTask: "referenceIdeas"
    });
  }

  if (!state.ideas.reference.items.length) {
    return renderEmptyState("这里会显示更贴近对标样本的参考选题。");
  }

  return state.ideas.reference.items
    .map(
      (idea) => `
        <article class="idea-card ${state.ideas.active.id === idea.id ? "is-active" : ""}">
          <div class="idea-head">
            <h4>${escapeHtml(idea.title)}</h4>
            <span class="status-label">${escapeHtml(idea.platform)}</span>
          </div>
          <p><strong>参考依据：</strong>${escapeHtml(idea.referenceBasis)}</p>
          <p><strong>适合场景：</strong>${escapeHtml(idea.scene || "更适合你当前常拍场景")}</p>
          <p><strong>推荐理由：</strong>${escapeHtml(idea.recommendationReason)}</p>
          <div class="button-row">
            <button
              type="button"
              class="button ${state.ideas.active.id === idea.id ? "button-secondary" : "button-primary"}"
              data-select-idea="reference"
              data-idea-id="${idea.id}"
            >
              ${state.ideas.active.id === idea.id ? "已设为当前选题" : "设为当前选题"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCreativeIdeas(state) {
  if (state.requests.creativeIdeas?.status === "loading") {
    return renderSkeletonCards(2);
  }

  if (state.requests.creativeIdeas?.status === "error") {
    return renderStateCard({
      variant: "error",
      title: "创意选题生成失败",
      message: state.requests.creativeIdeas.error || "请调整画像或草稿后重试。",
      actionLabel: "重试",
      actionTask: "creativeIdeas"
    });
  }

  if (!state.ideas.creative.items.length) {
    return renderEmptyState("这里会显示更有创造性的延展选题。");
  }

  return state.ideas.creative.items
    .map(
      (idea) => `
        <article class="idea-card ${state.ideas.active.id === idea.id ? "is-active" : ""}">
          <div class="idea-head">
            <h4>${escapeHtml(idea.title)}</h4>
            <span class="status-label">${escapeHtml(idea.platform)}</span>
          </div>
          <p><strong>亮点：</strong>${escapeHtml(idea.highlight)}</p>
          <p><strong>适合场景：</strong>${escapeHtml(idea.scene)}</p>
          <p><strong>预期效果：</strong>${escapeHtml(idea.outcome)}</p>
          <p><strong>拍摄难度：</strong>${escapeHtml(idea.difficulty)}</p>
          <div class="button-row">
            <button
              type="button"
              class="button ${state.ideas.active.id === idea.id ? "button-secondary" : "button-primary"}"
              data-select-idea="creative"
              data-idea-id="${idea.id}"
            >
              ${state.ideas.active.id === idea.id ? "已设为当前选题" : "设为当前选题"}
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderIdeaSection(elements, state) {
  elements.referenceIdeasMetadata.textContent = renderStatusText(state.ideas.reference.meta, state.requests.referenceIdeas);
  elements.creativeIdeasMetadata.textContent = renderStatusText(state.ideas.creative.meta, state.requests.creativeIdeas);
  elements.referenceIdeasGrid.innerHTML = renderReferenceIdeas(state);
  elements.creativeIdeasGrid.innerHTML = renderCreativeIdeas(state);

  const activeIdea = getActiveIdea(state);
  const typeLabel = state.ideas.active.source === "creative" ? "创意选题" : "参考选题";
  elements.currentSelection.innerHTML = activeIdea
    ? `<strong>当前选题</strong><p>${escapeHtml(activeIdea.title)} · ${typeLabel}</p>`
    : `<p>还没有选择当前选题</p>`;
}
