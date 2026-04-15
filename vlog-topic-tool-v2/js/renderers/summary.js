import { getActiveIdea, getCurrentPlanBundle } from "../state.js";
import { escapeHtml, renderEmptyState, renderStateCard } from "./shared.js";

function formatLatency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return `${Math.round(Number(value))} ms`;
}

function formatSourceLabel(source) {
  if (source === "mock") {
    return "mock fallback";
  }

  if (source === "cached") {
    return "cached result";
  }

  if (source === "real" || source === "live") {
    return "real provider";
  }

  return "未测试";
}

function getFailureGuidance(errorCode, source, status) {
  if (status === "loading") {
    return {
      title: "当前状态",
      reason: "连接测试请求已发出，正在等待后端返回结果。",
      nextStep: "下一步：观察下方 provider、错误码和耗时字段；如果长时间无结果，再检查后端服务和网络。"
    };
  }

  if (status === "success") {
    return {
      title: "当前状态",
      reason: "连接测试已成功，当前结果来自真实 provider。",
      nextStep: "下一步：可以继续生成选题、拍摄方案和日历摘要。"
    };
  }

  if (source === "mock") {
    return {
      title: "当前状态",
      reason: "现在展示的是 mock fallback，不是真实模型结果。",
      nextStep: "下一步：保持 mock fallback 关闭，修复真实连接问题后再重新测试。"
    };
  }

  if (errorCode === "NETWORK_ERROR") {
    return {
      title: "失败原因",
      reason: "当前环境没有成功连到目标 provider。",
      nextStep: "下一步：检查本机网络出口、代理和防火墙，确认目标域名可访问后再重试。"
    };
  }

  if (errorCode === "AUTH_FAILED") {
    return {
      title: "失败原因",
      reason: "API Key 无效、过期，或当前账号没有目标模型权限。",
      nextStep: "下一步：换有效 Key，并确认账号已开通当前模型。"
    };
  }

  if (errorCode === "INVALID_BASE_URL") {
    return {
      title: "失败原因",
      reason: "Base URL 或接口路径不匹配当前 provider。",
      nextStep: "下一步：按官方文档核对 Base URL。MiniMax OpenAI 兼容文档当前使用 https://api.minimaxi.com/v1。"
    };
  }

  if (status === "idle") {
    return {
      title: "当前状态",
      reason: "还没有执行连接测试。",
      nextStep: "下一步：先完成 provider、model、API Key 和 Base URL 配置，然后点击连接测试。"
    };
  }

  return {
    title: "失败原因",
    reason: "最近一次连接没有成功。",
    nextStep: "下一步：查看错误码和连接结果面板，再按提示逐项排查。"
  };
}

function buildConnectionReport(state) {
  const report = state.devConfig.connectionReport;
  const isLoading = state.requests.connectionTest?.status === "loading";

  return {
    provider: report?.provider || state.devConfig.provider || "未填写",
    model: report?.model || state.devConfig.model || "未填写",
    baseURL: report?.baseURL || state.devConfig.baseURL || "默认 provider 地址",
    endpoint: report?.endpoint || state.devConfig.backendEndpoint || "/api/generate",
    status: isLoading ? "loading" : report ? (report.success ? "success" : "failed") : "idle",
    message: isLoading ? "连接中，请稍等..." : report?.message || "尚未执行连接测试。",
    errorCode: report?.errorCode || "—",
    latencyMs: report?.latencyMs ?? null,
    source: isLoading ? "pending" : report?.source || "pending"
  };
}

function renderConnectionReport(state) {
  const report = buildConnectionReport(state);
  const stateLabelMap = {
    success: "success",
    failed: "failed",
    loading: "连接中",
    idle: "未测试"
  };
  const rows = [
    ["provider", report.provider],
    ["model", report.model],
    ["baseURL", report.baseURL],
    ["endpoint", report.endpoint],
    ["status", stateLabelMap[report.status] || report.status],
    ["message", report.message],
    ["error code", report.errorCode],
    ["latency", formatLatency(report.latencyMs)],
    ["source", formatSourceLabel(report.source)]
  ];
  const guidance = getFailureGuidance(report.errorCode, report.source, report.status);
  const alertClass =
    report.status === "success"
      ? "is-success"
      : report.status === "loading" || report.source === "mock"
        ? "is-warn"
        : "is-error";

  return `
    <div class="status-alert ${alertClass}">
      <strong>${escapeHtml(guidance.title)}</strong>
      <p>${escapeHtml(`${guidance.reason} (${report.errorCode || "—"})`)}</p>
      <p>${escapeHtml(guidance.nextStep)}</p>
    </div>
    <div class="connection-report-grid">
      ${rows
        .map(
          ([label, value]) => `
            <article class="connection-report-item">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderReferenceSamples(state) {
  if (!state.references.samples.length) {
    return renderEmptyState("还没有识别到参考条目。粘贴对标标题或链接后，点“识别参考条目”。");
  }

  return state.references.samples
    .map(
      (sample) => `
        <article class="reference-sample ${state.references.preferredId === sample.id ? "is-preferred" : ""}">
          <div class="sample-head">
            <strong>${escapeHtml(sample.title)}</strong>
            <span class="status-label">${escapeHtml(sample.platform)}</span>
          </div>
          <p>${escapeHtml(sample.creator || "参考条目")}</p>
          <div class="button-row">
            <button type="button" class="button button-ghost" data-reference-action="prefer" data-reference-id="${sample.id}">
              ${state.references.preferredId === sample.id ? "重点参考中" : "设为重点"}
            </button>
            <button type="button" class="button button-ghost" data-reference-action="remove" data-reference-id="${sample.id}">
              删除
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function getCurrentSelectionLabel(state, activeIdea) {
  if (!activeIdea) {
    return `<p>还没有选择当前选题</p>`;
  }

  const typeLabel = state.ideas.active.source === "creative" ? "创意选题" : "参考选题";
  return `
    <strong>当前选题</strong>
    <p>${escapeHtml(activeIdea.title)} · ${typeLabel}</p>
  `;
}

function renderFeedback(state) {
  const loadingTask = Object.values(state.requests).find((request) => request.status === "loading");

  if (loadingTask) {
    return `<div class="feedback-box is-loading"><strong>正在生成</strong><p>${escapeHtml(loadingTask.label)}</p></div>`;
  }

  if (state.ui.message) {
    return `<div class="feedback-box"><strong>当前状态</strong><p>${escapeHtml(state.ui.message)}</p></div>`;
  }

  if (state.devConfig.connectionStatus === "success") {
    return `<div class="feedback-box"><strong>已连接</strong><p>现在可以生成参考选题、创意选题和拍摄方案。</p></div>`;
  }

  if (state.devConfig.connectionStatus === "mock") {
    return `<div class="feedback-box"><strong>Mock Fallback 已启用</strong><p>当前可以继续预演工作流，但结果来自本地 mock，不是实时模型输出。</p></div>`;
  }

  return `<div class="feedback-box"><strong>当前状态</strong><p>先完成 API 连接，再依次生成参考选题、创意选题、拍摄方案和日历摘要。</p></div>`;
}

function resolveCurrentStatus(state, activeIdea, planBundle) {
  if (!activeIdea) {
    return {
      status: "等待选题",
      nextStep: "下一步：先从上面的参考选题或创意选题中设定一条当前选题。"
    };
  }

  if (state.outputs.calendar.entries.length && state.outputs.calendar.snapshot) {
    return {
      status: "已进入排期",
      nextStep: "下一步：检查日历摘要，然后决定今天先拍哪一条。"
    };
  }

  if (planBundle?.fullPlan || planBundle?.script || planBundle?.shootingAdvice) {
    return {
      status: "拍摄方案已生成",
      nextStep: "下一步：继续生成日历摘要，把这条内容排进未来几天的更新计划。"
    };
  }

  return {
    status: "已选题，待生成方案",
    nextStep: "下一步：点击“生成完整拍摄方案”，拿到脚本、镜头和拍摄提醒。"
  };
}

function renderCurrentFocus(state) {
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);

  if (!activeIdea) {
    return renderStateCard({
      title: "还没有当前处理内容",
      message: "先从参考选题或创意选题里点选一条内容，后面的脚本和日历都会基于它继续生成。"
    });
  }

  const { status } = resolveCurrentStatus(state, activeIdea, planBundle);
  const typeLabel = state.ideas.active.source === "creative" ? "创意选题" : "参考选题";
  const reason = activeIdea.recommendationReason || activeIdea.highlight || "这条内容更适合当前账号定位。";
  const scene = activeIdea.scene || state.profile.commonSceneLabel || state.profile.commonScene || "当前常拍场景";

  return `
    <div class="focus-main">
      <div>
        <span class="status-label">${escapeHtml(typeLabel)}</span>
        <h3>${escapeHtml(activeIdea.title)}</h3>
      </div>
      <p>${escapeHtml(reason)}</p>
      <div class="tag-row">
        <span class="tag">适合平台：${escapeHtml(activeIdea.platform || state.profile.mainPlatformLabel || state.profile.mainPlatform)}</span>
        <span class="tag">适合场景：${escapeHtml(scene)}</span>
      </div>
      <p class="section-note">后续生成脚本、拍摄建议和日历摘要时，都会默认围绕这条内容继续展开。</p>
    </div>
    <div class="focus-meta">
      <div class="focus-meta-card">
        <span>当前状态</span>
        <strong>${escapeHtml(status)}</strong>
      </div>
      <div class="focus-meta-card">
        <span>处理链路</span>
        <strong>选题 -> 拍摄方案 -> 日历摘要</strong>
      </div>
    </div>
  `;
}

function renderNextStepHint(state) {
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);
  const { nextStep } = resolveCurrentStatus(state, activeIdea, planBundle);

  return `
    <strong>下一步建议</strong>
    <p>${escapeHtml(nextStep)}</p>
  `;
}

function renderErrorDetails(errorPanel) {
  const details = Array.isArray(errorPanel.details) ? errorPanel.details : [];
  const detailMarkup = details.length
    ? `
      <div class="error-box">
        <strong>校验细节</strong>
        <ul class="error-list">
          ${details
            .map(
              (item) => `
                <li>
                  ${escapeHtml(item.path || "unknown")}：${escapeHtml(item.message || "返回结果不符合预期")}
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    `
    : "";

  const previewMarkup = errorPanel.receivedPreview
    ? `
      <div class="error-box">
        <strong>返回片段</strong>
        <p>${escapeHtml(errorPanel.receivedPreview)}</p>
      </div>
    `
    : "";

  const actionMarkup = errorPanel.retryAction
    ? `<button type="button" class="button button-secondary" data-retry-action="${escapeHtml(errorPanel.retryAction)}">重新执行</button>`
    : errorPanel.retryTask
      ? `<button type="button" class="button button-secondary" data-retry-task="${escapeHtml(errorPanel.retryTask)}">重试当前任务</button>`
      : "";

  return `
    <div class="error-box">
      <strong>${escapeHtml(errorPanel.title || "生成失败")}</strong>
      <p>${escapeHtml(errorPanel.message || "请调整输入或稍后重试。")}</p>
      <div class="tag-row">
        ${errorPanel.taskLabel ? `<span class="tag">任务：${escapeHtml(errorPanel.taskLabel)}</span>` : ""}
        ${errorPanel.code ? `<span class="tag">错误码：${escapeHtml(errorPanel.code)}</span>` : ""}
      </div>
      <div class="button-row">
        ${actionMarkup}
      </div>
    </div>
    ${detailMarkup}
    ${previewMarkup}
  `;
}

function renderErrorPage(elements, state) {
  if (!state.ui.errorPanel) {
    elements.errorPage.hidden = true;
    elements.errorPageTitle.textContent = "本次生成遇到问题";
    elements.errorPageContent.innerHTML = "";
    return;
  }

  elements.errorPage.hidden = false;
  elements.errorPageTitle.textContent =
    state.ui.errorPanel.code === "SCHEMA_VALIDATION_FAILED" ? "AI 返回结果未通过结构校验" : "本次生成遇到问题";
  elements.errorPageContent.innerHTML = renderErrorDetails(state.ui.errorPanel);
}

export function renderTopSection(elements, state) {
  const activeIdea = getActiveIdea(state);

  renderErrorPage(elements, state);
  elements.connectionReport.innerHTML = renderConnectionReport(state);
  elements.referenceSampleList.innerHTML = renderReferenceSamples(state);
  elements.currentSelection.innerHTML = getCurrentSelectionLabel(state, activeIdea);
  elements.globalFeedback.innerHTML = renderFeedback(state);
  elements.currentFocusCard.innerHTML = renderCurrentFocus(state);
  elements.nextStepHint.innerHTML = renderNextStepHint(state);
}
