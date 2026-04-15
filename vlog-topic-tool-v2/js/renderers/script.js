import { getActiveIdea, getCurrentPlanBundle } from "../state.js";
import {
  escapeHtml,
  renderEmptyState,
  renderStateCard,
  renderStatusText,
  renderStringList
} from "./shared.js";

function pickScriptRequest(state) {
  const candidates = ["fullPlan", "shootingAdvice", "script"]
    .map((key) => ({ key, request: state.requests[key] }))
    .filter((item) => item.request);

  const loadingCandidate = candidates.find((item) => item.request?.status === "loading");

  if (loadingCandidate) {
    return loadingCandidate;
  }

  return (
    candidates.sort((left, right) => {
      const leftTime = Date.parse(left.request?.finishedAt || left.request?.startedAt || 0);
      const rightTime = Date.parse(right.request?.finishedAt || right.request?.startedAt || 0);
      return rightTime - leftTime;
    })[0] || { key: "fullPlan", request: null }
  );
}

function renderSections(sections) {
  if (!sections?.length) {
    return renderEmptyState("生成完整拍摄方案后，这里会出现更完整的段落脚本。");
  }

  return sections
    .map(
      (section) => `
        <div class="section-block">
          <strong>${escapeHtml(section.label)}</strong>
          <p>${escapeHtml(section.content)}</p>
        </div>
      `
    )
    .join("");
}

function renderHook(hook) {
  if (!hook) {
    return renderEmptyState("这里会给出开头 3 秒更适合直接拍的 Hook。");
  }

  return `<p>${escapeHtml(hook)}</p>`;
}

function fillPlanContainers(elements, merged) {
  elements.scriptTitleOutput.innerHTML = renderStringList(
    merged.titleSuggestions,
    "这里会出现适合当前选题的标题建议。"
  );
  elements.scriptHookOutput.innerHTML = renderHook(merged.hook);
  elements.scriptStructureOutput.innerHTML = renderStringList(
    merged.structure,
    "这里会出现更清楚的脚本大纲与节奏拆分。"
  );
  elements.scriptSectionsOutput.innerHTML = renderSections(merged.scriptSections);
  elements.scriptAnglesOutput.innerHTML = renderStringList(
    merged.angles,
    "这里会出现低机位、俯拍、侧逆光、手持跟拍等具体拍摄角度建议。"
  );
  elements.scriptShotsOutput.innerHTML = renderStringList(
    merged.shotSuggestions,
    "这里会出现镜头设计和转场建议。"
  );
  elements.scriptNotesOutput.innerHTML = renderStringList(
    merged.notes,
    "这里会出现环境噪音、光线、出镜状态和前三秒信息密度等提醒。"
  );
  elements.scriptBrollOutput.innerHTML = renderStringList(
    merged.broll,
    "这里会出现适合顺手补拍的 B-roll 清单。"
  );
  elements.scriptSubtitlesOutput.innerHTML = renderStringList(
    merged.subtitleKeywords,
    "这里会出现字幕关键词和画面重点词。"
  );
}

export function renderScriptSection(elements, state) {
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);
  const { key: requestKey, request: activeRequest } = pickScriptRequest(state);
  const merged = {
    ...(planBundle?.fullPlan?.data || {}),
    ...(planBundle?.script?.data || {}),
    ...(planBundle?.shootingAdvice?.data || {})
  };

  elements.scriptMetadata.textContent = renderStatusText(
    planBundle?.fullPlan?.meta || planBundle?.shootingAdvice?.meta || planBundle?.script?.meta || null,
    activeRequest
  );

  if (!activeIdea) {
    elements.scriptModuleState.innerHTML = renderStateCard({
      title: "还没有当前选题",
      message: "先设定一条当前选题，再生成脚本或完整拍摄方案。"
    });
    fillPlanContainers(elements, {});
    return;
  }

  if (activeRequest?.status === "loading") {
    elements.scriptModuleState.innerHTML = renderStateCard({
      variant: "loading",
      title: "正在生成拍摄方案",
      message: `${activeRequest.label || "AI 处理中"}，结果会按板块写入下方区域。`
    });
    fillPlanContainers(elements, merged);
    return;
  }

  if (activeRequest?.status === "error") {
    elements.scriptModuleState.innerHTML = renderStateCard({
      variant: "error",
      title: "拍摄方案生成失败",
      message: activeRequest.error || "请检查输入后重试。",
      actionLabel: "重试",
      actionTask: requestKey
    });
    fillPlanContainers(elements, merged);
    return;
  }

  if (!planBundle) {
    elements.scriptModuleState.innerHTML = renderStateCard({
      title: "等待生成拍摄方案",
      message: `当前选题是“${activeIdea.title}”。你可以先生成脚本、拍摄建议，或直接生成完整拍摄方案。`
    });
    fillPlanContainers(elements, {});
    return;
  }

  elements.scriptModuleState.innerHTML = `
    <div class="state-card">
      <strong>当前围绕这条内容生成</strong>
      <p>${escapeHtml(activeIdea.title)}</p>
    </div>
  `;
  fillPlanContainers(elements, merged);
}
