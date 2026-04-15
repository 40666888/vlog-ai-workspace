import { escapeHtml, renderStateCard } from "./shared.js";

const workflowStatusMap = {
  idle: "未开始",
  pending: "待执行",
  running: "执行中",
  success: "已完成",
  failed: "失败",
  skipped: "已跳过"
};

function renderWorkflowStep(taskKey, step) {
  const statusLabel = workflowStatusMap[step.status] || step.status || "未知";
  const retryMarkup =
    step.status === "failed"
      ? `<button type="button" class="button button-ghost" data-retry-flow-step="${escapeHtml(taskKey)}">从这里重试</button>`
      : "";

  return `
    <article class="workflow-run-step is-${escapeHtml(step.status || "idle")}">
      <div class="workflow-run-step-head">
        <strong>${escapeHtml(step.label || taskKey)}</strong>
        <span class="status-label">${escapeHtml(statusLabel)}</span>
      </div>
      <p>${escapeHtml(step.error || "该步骤会按顺序自动执行，成功后进入下一步。")}</p>
      ${retryMarkup}
    </article>
  `;
}

export function renderWorkflowSection(elements, state) {
  const workflow = state.workflow;
  const hasProgress = workflow?.sequence?.some((taskKey) => (workflow.steps[taskKey]?.status || "idle") !== "idle");

  if (!workflow?.sequence?.length) {
    elements.workflowRunBoard.innerHTML = renderStateCard({
      title: "暂时没有完整流程任务",
      message: "这里会显示一键工作流的执行进度。"
    });
    return;
  }

  if (workflow.status === "idle" && !workflow.startedAt && !hasProgress) {
    elements.workflowRunBoard.innerHTML = renderStateCard({
      title: "等待启动完整流程",
      message: "点击“一键生成完整流程”后，这里会显示每一步的 pending、running、success、failed 状态。"
    });
    return;
  }

  elements.workflowRunBoard.innerHTML = `
    <div class="workflow-run-head">
      <span class="tag">当前状态：${escapeHtml(workflowStatusMap[workflow.status] || workflow.status)}</span>
      ${workflow.finishedAt ? `<span class="tag">最近完成：${escapeHtml(workflow.finishedAt.slice(11, 16))}</span>` : ""}
    </div>
    <div class="workflow-run-grid">
      ${workflow.sequence.map((taskKey) => renderWorkflowStep(taskKey, workflow.steps[taskKey] || {})).join("")}
    </div>
  `;
}
