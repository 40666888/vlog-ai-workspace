import {
  escapeHtml,
  renderEmptyState,
  renderStateCard,
  renderStatusText
} from "./shared.js";

export function renderCalendarSection(elements, state) {
  const request = state.requests.calendarSummary;
  elements.calendarMetadata.textContent = renderStatusText(state.outputs.calendar.meta, request);

  if (request?.status === "loading") {
    elements.calendarModuleState.innerHTML = renderStateCard({
      variant: "loading",
      title: "正在生成日历摘要",
      message: "正在请求模型，可能需要 20-60 秒；如果等待较久，请不要重复点击。"
    });
  } else if (request?.status === "error") {
    elements.calendarModuleState.innerHTML = renderStateCard({
      variant: "error",
      title: "日历摘要生成失败",
      message: request.error || "请稍后重试。",
      actionLabel: "重试",
      actionTask: "calendarSummary"
    });
  } else if (!state.outputs.calendar.snapshot) {
    elements.calendarModuleState.innerHTML = renderStateCard({
      title: "等待生成日历摘要",
      message: "先生成选题或拍摄方案，再把内容排进未来 7 天或 14 天。"
    });
  } else {
    elements.calendarModuleState.innerHTML = "";
  }

  const snapshot = state.outputs.calendar.snapshot;
  elements.snapshotFocus.textContent = snapshot?.focus || "待生成";
  elements.snapshotFrequency.textContent = snapshot?.cadence || "待生成";
  elements.snapshotDistribution.textContent = snapshot?.distribution || "待生成";
  elements.snapshotSummary.textContent = snapshot?.summary || "";

  if (!state.outputs.calendar.entries.length) {
    elements.calendarGrid.innerHTML = renderEmptyState("这里会显示未来 7 天或 14 天的内容安排。");
    return;
  }

  elements.calendarGrid.innerHTML = state.outputs.calendar.entries
    .map(
      (entry) => `
        <article class="calendar-card">
          <div class="calendar-head">
            <h4>${escapeHtml(entry.dateLabel)}</h4>
            <span class="status-label">${escapeHtml(entry.platform)}</span>
          </div>
          <p><strong>${escapeHtml(entry.title)}</strong></p>
          <p><strong>内容类型：</strong>${escapeHtml(entry.type)}</p>
          <p><strong>发布目的：</strong>${escapeHtml(entry.goal)}</p>
          <p><strong>提醒：</strong>${escapeHtml(entry.reminder)}</p>
        </article>
      `
    )
    .join("");
}
