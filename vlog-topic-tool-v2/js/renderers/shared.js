function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatLatency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }

  return `${Math.round(Number(value))}ms`;
}

function resolveTransportLabel(meta = {}) {
  if (meta.transport === "mock") {
    return "source: mock fallback";
  }

  if (meta.transport === "cached") {
    return meta.originalTransport === "mock" ? "source: cached result (from mock)" : "source: cached result";
  }

  return "source: real provider";
}

function resolveRetryLabel(meta = {}) {
  const retryCount = Number(meta.retryCount || 0);
  return retryCount > 0 ? `retry: ${retryCount}x` : "retry: no";
}

function resolveTimeoutLabel(meta = {}) {
  return meta.timedOut ? "timeout: yes" : "timeout: no";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderEmptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function renderStateCard({
  variant = "empty",
  title = "等待生成",
  message = "",
  actionLabel = "",
  actionTask = "",
  actionKind = "task"
} = {}) {
  const actionMarkup = actionLabel
    ? `<button type="button" class="button button-ghost" data-retry-${actionKind}="${escapeHtml(actionTask)}">${escapeHtml(actionLabel)}</button>`
    : "";

  return `
    <div class="state-card ${variant === "loading" ? "is-loading" : variant === "error" ? "is-error" : ""}">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(message)}</p>
      ${actionMarkup}
    </div>
  `;
}

export function renderSkeletonCards(count = 2) {
  return `
    <div class="skeleton-grid">
      ${Array.from({ length: count }, () => `<div class="skeleton-card"></div>`).join("")}
    </div>
  `;
}

export function renderStringList(items, emptyMessage = "暂时还没有内容。") {
  if (!items?.length) {
    return renderEmptyState(emptyMessage);
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function renderStatusText(meta, request) {
  if (request?.status === "loading") {
    return `${request.label || "AI 处理中"} · 正在请求模型，可能需要 20-60 秒 · 如果等待较久，请不要重复点击`;
  }

  if (request?.status === "error") {
    return request.error || "生成失败";
  }

  if (!meta) {
    return "";
  }

  const providerText =
    meta.provider || meta.model
      ? `${String(meta.provider || "provider")}${meta.model ? ` / ${String(meta.model)}` : ""}`
      : "";
  const parts = [`已生成 ${formatTime(meta.generatedAt)}`];

  if (providerText) {
    parts.push(providerText);
  }

  if (formatLatency(meta.latencyMs)) {
    parts.push(formatLatency(meta.latencyMs));
  }

  parts.push(resolveTransportLabel(meta));
  parts.push(resolveRetryLabel(meta));
  parts.push(resolveTimeoutLabel(meta));
  return parts.join(" · ");
}
