import { toolbarGroups } from "../services/promptTasks.js";
import { renderEmptyState, renderMeta, renderTagList, renderTaskButtons } from "./shared.js";

export function renderBenchmarkSection(elements, state) {
  elements.benchmarkToolbar.innerHTML = renderTaskButtons(toolbarGroups.benchmark, state, "tiny");
  elements.benchmarkMetadata.innerHTML = renderMeta(state.benchmarks.meta, state.requests.benchmarks);

  if (!state.benchmarks.items.length) {
    elements.benchmarkGrid.innerHTML = renderEmptyState("还没有 benchmark 结果。先解析参考样本，再生成热门拆解。");
    elements.benchmarkInsights.innerHTML = renderEmptyState("生成 benchmark 后，这里会出现爆款共性和改编方向。");
    return;
  }

  elements.benchmarkGrid.innerHTML = state.benchmarks.items
    .map(
      (item) => `
        <article class="benchmark-card ${state.benchmarks.selectedIds.includes(item.id) ? "is-selected" : ""}">
          <div class="benchmark-head">
            <div>
              <span class="status-chip">${item.platform}</span>
              <h4>${item.creator}</h4>
            </div>
            <button type="button" class="button-tiny" data-benchmark-toggle="${item.id}">
              ${state.benchmarks.selectedIds.includes(item.id) ? "已采纳" : "采纳到 Prompt"}
            </button>
          </div>
          <div class="card-actions">${renderTagList(item.laneTags || [])}</div>
          <p><strong>近期热门标题</strong></p>
          <ul class="hot-title-list">${(item.hotTitles || []).map((title) => `<li>${title}</li>`).join("")}</ul>
          <p><strong>热门共性</strong>：${item.commonPattern}</p>
          <p><strong>为什么火</strong>：${item.whyHot}</p>
          <p><strong>可借鉴角度</strong>：${item.borrowAngle}</p>
          <p><strong>适合我的改编方向</strong>：${item.adaptHint}</p>
        </article>
      `
    )
    .join("");

  const insights = state.benchmarks.insights;
  elements.benchmarkInsights.innerHTML = `
    <h4>AI 总结出的爆款共性</h4>
    <p>${insights.summary}</p>
    <p><strong>结构模式</strong></p>
    <ul class="insight-list">${(insights.patterns || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    <p><strong>可借方法</strong></p>
    <ul class="insight-list">${(insights.takeaways || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    <p><strong>转成你的账号版本</strong></p>
    <ul class="insight-list">${(insights.conversions || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    <p>${insights.whyFit}</p>
  `;
}
