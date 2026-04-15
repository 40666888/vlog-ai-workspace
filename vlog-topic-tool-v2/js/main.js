import {
  connectionDefaults,
  defaultCalendarSettings,
  defaultFilterValues,
  defaultProfileValues,
  optionSets,
  providerOptions,
  providerPresetMap,
  providerPresetOptions
} from "./data/catalog.js";
import {
  clearErrorPanel,
  clearReferenceSamples,
  getActiveIdea,
  getCurrentPlanBundle,
  getState,
  hydratePersistedWorkspace,
  removeReferenceSample,
  resetWorkflowRun,
  setActiveIdea,
  setApiKeyVisibility,
  setCalendarResult,
  setCalendarSettings,
  setConnectionReport,
  setConnectionStatus,
  setCreativeDraftText,
  setDevConfig,
  setErrorPanel,
  setWorkflowStep,
  finalizeWorkflowRun,
  setIdeaResults,
  setPlanResult,
  setPreferredReference,
  setProfileAndFilters,
  setReferenceRawText,
  setReferenceSamples,
  setRequest,
  setUiMessage,
  subscribe
} from "./state.js";
import { executeTask, fetchRuntimeConfig, testConnection } from "./services/api.js";
import { buildTaskRequest, getTaskLabel, isConnectionReady } from "./services/promptTasks.js";
import {
  clearSessionApiKey,
  clearWorkspaceSnapshot,
  exportConnectionConfig,
  importConnectionConfig,
  loadSessionApiKey,
  loadWorkspaceSnapshot,
  persistSessionApiKey,
  persistWorkspaceSnapshot
} from "./services/persistence.js";
import { renderCalendarSection } from "./renderers/calendar.js";
import { renderIdeaSection } from "./renderers/ideas.js";
import { renderScriptSection } from "./renderers/script.js";
import { renderTopSection } from "./renderers/summary.js";
import { renderWorkflowSection } from "./renderers/workflow.js";

const elements = {};
let runtimeConfig = {
  mode: "local-dev",
  allowFrontendApiKeyInput: true,
  providers: {},
  presets: {},
  serverCredentials: {}
};
let latestLiveCheckSummary = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  populateSelects();
  applyDefaultsToInputs();
  await loadRuntimeConfig();
  const restored = restorePersistedState();
  await loadRuntimeConfigForCurrentEndpoint();
  await loadRecentLiveCheckResults();
  bindEvents();
  subscribe(handleStateChange);

  if (!restored) {
    syncStateFromInputs({ parseReferences: true });
  }

  handleStateChange(getState());
}

function handleStateChange(state) {
  renderApp(state);
  persistWorkspaceSnapshot(state);
  persistSessionApiKey(state.devConfig.apiKey, state.devConfig.rememberApiKeyInSession);
}

function cacheElements() {
  elements.apiKey = document.querySelector("#api-key");
  elements.apiKeyField = document.querySelector("#api-key-field");
  elements.toggleApiKey = document.querySelector("#toggle-api-key");
  elements.connectionPreset = document.querySelector("#connection-preset");
  elements.providerSelect = document.querySelector("#provider-select");
  elements.modelName = document.querySelector("#model-name");
  elements.baseURL = document.querySelector("#base-url");
  elements.backendEndpoint = document.querySelector("#backend-endpoint");
  elements.rememberApiKey = document.querySelector("#remember-api-key");
  elements.rememberApiKeyField = document.querySelector("#remember-api-key-field");
  elements.deploymentModeNote = document.querySelector("#deployment-mode-note");
  elements.providerCapabilityNote = document.querySelector("#provider-capability-note");
  elements.testConnection = document.querySelector("#test-connection");
  elements.exportConnectionConfig = document.querySelector("#export-connection-config");
  elements.importConnectionConfig = document.querySelector("#import-connection-config");
  elements.clearLocalConfig = document.querySelector("#clear-local-config");
  elements.resetPageState = document.querySelector("#reset-page-state");
  elements.connectionConfigFile = document.querySelector("#connection-config-file");
  elements.connectionStatus = document.querySelector("#connection-status");
  elements.connectionMessage = document.querySelector("#connection-message");
  elements.connectionReport = document.querySelector("#connection-report");
  elements.refreshLiveCheck = document.querySelector("#refresh-live-check");
  elements.liveCheckStatusBoard = document.querySelector("#live-check-status-board");
  elements.mockFallback = document.querySelector("#mock-fallback");
  elements.errorPage = document.querySelector("#error-page");
  elements.errorPageTitle = document.querySelector("#error-page-title");
  elements.errorPageContent = document.querySelector("#error-page-content");
  elements.dismissErrorPage = document.querySelector("#dismiss-error-page");
  elements.workflowRunBoard = document.querySelector("#workflow-run-board");

  elements.accountTypeSelect = document.querySelector("#account-type-select");
  elements.mainPlatformSelect = document.querySelector("#main-platform-select");
  elements.accountVibeSelect = document.querySelector("#account-vibe-select");
  elements.audienceSelect = document.querySelector("#audience-select");
  elements.commonSceneSelect = document.querySelector("#common-scene-select");
  elements.frequencySelect = document.querySelector("#frequency-select");
  elements.accountBriefInput = document.querySelector("#account-brief-input");
  elements.creatorStateSelect = document.querySelector("#creator-state-select");
  elements.extraRequirements = document.querySelector("#extra-requirements");
  elements.objectiveSelect = document.querySelector("#objective-select");
  elements.presenceSelect = document.querySelector("#presence-select");
  elements.difficultySelect = document.querySelector("#difficulty-select");
  elements.durationSelect = document.querySelector("#duration-select");

  elements.referenceData = document.querySelector("#reference-data");
  elements.creativeDraftData = document.querySelector("#creative-draft-data");
  elements.parseReferences = document.querySelector("#parse-references");
  elements.clearReferences = document.querySelector("#clear-references");
  elements.referenceSampleList = document.querySelector("#reference-sample-list");
  elements.generateReferenceIdeas = document.querySelector("#generate-reference-ideas");
  elements.generateCreativeIdeas = document.querySelector("#generate-creative-ideas");
  elements.runFullFlow = document.querySelector("#run-full-flow");
  elements.globalFeedback = document.querySelector("#global-feedback");
  elements.currentSelection = document.querySelector("#current-selection");
  elements.currentFocusCard = document.querySelector("#current-focus-card");
  elements.nextStepHint = document.querySelector("#next-step-hint");
  elements.copyCurrentIdea = document.querySelector("#copy-current-idea");

  elements.referenceIdeasGrid = document.querySelector("#reference-ideas-grid");
  elements.referenceIdeasMetadata = document.querySelector("#reference-ideas-metadata");
  elements.creativeIdeasGrid = document.querySelector("#creative-ideas-grid");
  elements.creativeIdeasMetadata = document.querySelector("#creative-ideas-metadata");

  elements.generateScript = document.querySelector("#generate-script");
  elements.generateShootingAdvice = document.querySelector("#generate-shooting-advice");
  elements.generateFullPlan = document.querySelector("#generate-full-plan");
  elements.copyScript = document.querySelector("#copy-script");
  elements.copyShootingAdvice = document.querySelector("#copy-shooting-advice");
  elements.scriptMetadata = document.querySelector("#script-metadata");
  elements.scriptModuleState = document.querySelector("#script-module-state");
  elements.scriptTitleOutput = document.querySelector("#script-title-output");
  elements.scriptHookOutput = document.querySelector("#script-hook-output");
  elements.scriptStructureOutput = document.querySelector("#script-structure-output");
  elements.scriptSectionsOutput = document.querySelector("#script-sections-output");
  elements.scriptAnglesOutput = document.querySelector("#script-angles-output");
  elements.scriptShotsOutput = document.querySelector("#script-shots-output");
  elements.scriptNotesOutput = document.querySelector("#script-notes-output");
  elements.scriptBrollOutput = document.querySelector("#script-broll-output");
  elements.scriptSubtitlesOutput = document.querySelector("#script-subtitles-output");

  elements.calendarStart = document.querySelector("#calendar-start");
  elements.calendarWindow = document.querySelector("#calendar-window");
  elements.generateCalendar = document.querySelector("#generate-calendar");
  elements.exportCalendar = document.querySelector("#export-calendar");
  elements.calendarMetadata = document.querySelector("#calendar-metadata");
  elements.calendarModuleState = document.querySelector("#calendar-module-state");
  elements.snapshotFocus = document.querySelector("#snapshot-focus");
  elements.snapshotFrequency = document.querySelector("#snapshot-frequency");
  elements.snapshotDistribution = document.querySelector("#snapshot-distribution");
  elements.snapshotSummary = document.querySelector("#snapshot-summary");
  elements.calendarGrid = document.querySelector("#calendar-grid");
}

function populateSelect(selectElement, options) {
  selectElement.innerHTML = options
    .map((option) => `<option value="${option.value}">${option.label}</option>`)
    .join("");
}

function populateSelects() {
  populateSelect(elements.connectionPreset, providerPresetOptions);
  populateSelect(elements.providerSelect, providerOptions);
  populateSelect(elements.accountTypeSelect, optionSets.accountType);
  populateSelect(elements.mainPlatformSelect, optionSets.mainPlatform);
  populateSelect(elements.accountVibeSelect, optionSets.accountVibe);
  populateSelect(elements.audienceSelect, optionSets.audience);
  populateSelect(elements.commonSceneSelect, optionSets.commonScene);
  populateSelect(elements.frequencySelect, optionSets.frequency);
  populateSelect(elements.creatorStateSelect, optionSets.creatorState);
  populateSelect(elements.objectiveSelect, optionSets.objective);
  populateSelect(elements.presenceSelect, optionSets.presence);
  populateSelect(elements.difficultySelect, optionSets.difficulty);
  populateSelect(elements.durationSelect, optionSets.duration);
}

function applyDefaultsToInputs() {
  elements.accountTypeSelect.value = defaultProfileValues.accountType;
  elements.mainPlatformSelect.value = defaultProfileValues.mainPlatform;
  elements.accountVibeSelect.value = defaultProfileValues.accountVibe;
  elements.audienceSelect.value = defaultProfileValues.audience;
  elements.commonSceneSelect.value = defaultProfileValues.commonScene;
  elements.frequencySelect.value = defaultProfileValues.frequency;
  elements.accountBriefInput.value = "";
  elements.creatorStateSelect.value = defaultFilterValues.creatorState;
  elements.extraRequirements.value = "";
  elements.objectiveSelect.value = defaultFilterValues.objective;
  elements.presenceSelect.value = defaultFilterValues.presence;
  elements.difficultySelect.value = defaultFilterValues.difficulty;
  elements.durationSelect.value = defaultFilterValues.duration;
  elements.referenceData.value = defaultFilterValues.referenceData;
  elements.creativeDraftData.value = "";
  elements.calendarStart.value = new Date().toISOString().slice(0, 10);
  elements.calendarWindow.value = defaultCalendarSettings.windowDays;
  elements.apiKey.value = "";
  elements.connectionPreset.value = connectionDefaults.preset;
  elements.providerSelect.value = connectionDefaults.provider;
  elements.modelName.value = connectionDefaults.model;
  elements.baseURL.value = connectionDefaults.baseURL;
  elements.backendEndpoint.value = connectionDefaults.backendEndpoint;
  elements.rememberApiKey.checked = connectionDefaults.rememberApiKeyInSession;
  elements.mockFallback.checked = false;
  syncProviderHints();
}

async function loadRuntimeConfig() {
  const config = await fetchRuntimeConfig(connectionDefaults.backendEndpoint);

  runtimeConfig = {
    ...runtimeConfig,
    ...config
  };

  if (!runtimeConfig.allowFrontendApiKeyInput) {
    elements.apiKey.value = "";
    elements.rememberApiKey.checked = false;
  }

  applyRuntimeConstraints();
}

async function loadRuntimeConfigForCurrentEndpoint() {
  const config = await fetchRuntimeConfig(elements.backendEndpoint.value.trim() || connectionDefaults.backendEndpoint);
  runtimeConfig = {
    ...runtimeConfig,
    ...config
  };
  applyRuntimeConstraints();
}

function getActivePresetCapability() {
  if (elements.connectionPreset.value === "custom") {
    const providerCapability = runtimeConfig.providers?.[elements.providerSelect.value];

    if (providerCapability) {
      return {
        ...providerCapability,
        label: providerCapability.label || elements.providerSelect.value
      };
    }
  }

  return runtimeConfig.presets?.[elements.connectionPreset.value] || null;
}

function getConnectionValidation(state = getState()) {
  const capability = getActivePresetCapability();
  const issues = [];

  if (capability?.constraints?.requiresModel && !state.devConfig.model.trim()) {
    issues.push("当前预设需要填写 model。");
  }

  if (capability?.constraints?.requiresBaseURL && !state.devConfig.baseURL.trim()) {
    issues.push("当前预设需要填写 Base URL。");
  }

  if (runtimeConfig.allowFrontendApiKeyInput && !state.devConfig.apiKey.trim()) {
    issues.push("local-dev 模式下需要填写 API Key。");
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function buildCapabilityHintText(state = getState()) {
  const capability = getActivePresetCapability();

  if (!capability) {
    return "当前后端尚未返回 provider capability，页面会按本地默认逻辑运行。";
  }

  const support = capability.supports || {};
  const parts = [
    `${capability.label || state.devConfig.preset}：连接测试 ${support.testConnection ? "支持" : "不支持"}`,
    `模型探测 ${support.modelProbing ? "支持" : "不支持"}`,
    `结构化输出 ${support.structuredOutputs ? "较强" : "需依赖 prompt 约束"}`,
    `严格 JSON ${support.strictJsonSchema ? "较强" : "依赖服务端 normalize/repair"}`
  ];

  if (capability.hint) {
    parts.push(capability.hint);
  }

  const validation = getConnectionValidation(state);

  if (!validation.valid) {
    parts.push(`当前仍需补充：${validation.issues.join("；")}`);
  }

  return parts.join(" · ");
}

function applyRuntimeConstraints() {
  const state = getState();
  const capability = getActivePresetCapability();
  const isServerManaged = !runtimeConfig.allowFrontendApiKeyInput;

  elements.apiKeyField.hidden = isServerManaged;
  elements.rememberApiKeyField.hidden = isServerManaged;
  elements.toggleApiKey.hidden = isServerManaged;
  elements.apiKey.disabled = isServerManaged;
  elements.rememberApiKey.disabled = isServerManaged;
  elements.providerSelect.disabled = false;
  elements.connectionPreset.disabled = false;
  elements.modelName.disabled = false;
  elements.baseURL.disabled = false;
  elements.backendEndpoint.disabled = false;
  elements.baseURL.required = Boolean(capability?.constraints?.requiresBaseURL);
  elements.modelName.required = Boolean(capability?.constraints?.requiresModel);

  elements.deploymentModeNote.textContent = isServerManaged
    ? "当前是 server-managed 模式：前端不输入 API Key，后端会优先使用服务端环境变量。"
    : "当前是 local-dev 模式：你可以在当前浏览器会话里临时输入 API Key。";
  elements.providerCapabilityNote.textContent = buildCapabilityHintText(state);
}

function applyStateToInputs(state) {
  elements.connectionPreset.value = state.devConfig.preset || connectionDefaults.preset;
  elements.providerSelect.value = state.devConfig.provider || connectionDefaults.provider;
  elements.modelName.value = state.devConfig.model || "";
  elements.baseURL.value = state.devConfig.baseURL || "";
  elements.backendEndpoint.value = state.devConfig.backendEndpoint || connectionDefaults.backendEndpoint;
  elements.apiKey.value = state.devConfig.apiKey || "";
  elements.rememberApiKey.checked = Boolean(state.devConfig.rememberApiKeyInSession);
  elements.mockFallback.checked = Boolean(state.devConfig.mockFallback);

  elements.accountTypeSelect.value = state.profile.accountType;
  elements.mainPlatformSelect.value = state.profile.mainPlatform;
  elements.accountVibeSelect.value = state.profile.accountVibe;
  elements.audienceSelect.value = state.profile.audience;
  elements.commonSceneSelect.value = state.profile.commonScene;
  elements.frequencySelect.value = state.profile.frequency;
  elements.accountBriefInput.value = state.profile.accountBrief || "";
  elements.creatorStateSelect.value = state.profile.creatorState || defaultFilterValues.creatorState;
  elements.extraRequirements.value = state.profile.extraRequirements || "";

  elements.objectiveSelect.value = state.filters.objective;
  elements.presenceSelect.value = state.filters.presence;
  elements.difficultySelect.value = state.filters.difficulty;
  elements.durationSelect.value = state.filters.duration;

  elements.referenceData.value = state.references.benchmarkRawText || "";
  elements.creativeDraftData.value = state.references.creativeDraftText || "";
  elements.calendarStart.value = state.outputs.calendar.settings.startDate || new Date().toISOString().slice(0, 10);
  elements.calendarWindow.value = String(state.outputs.calendar.settings.windowDays || defaultCalendarSettings.windowDays);
  syncProviderHints();
}

function restorePersistedState() {
  const workspaceSnapshot = loadWorkspaceSnapshot();

  if (workspaceSnapshot) {
    hydratePersistedWorkspace(workspaceSnapshot);
  }

  const sessionApiKey = loadSessionApiKey();

  if (sessionApiKey && runtimeConfig.allowFrontendApiKeyInput) {
    setDevConfig({
      apiKey: sessionApiKey,
      rememberApiKeyInSession: true
    });
  }

  applyStateToInputs(getState());
  return Boolean(workspaceSnapshot);
}

function bindEvents() {
  const syncTargets = [
    elements.accountTypeSelect,
    elements.mainPlatformSelect,
    elements.accountVibeSelect,
    elements.audienceSelect,
    elements.commonSceneSelect,
    elements.frequencySelect,
    elements.accountBriefInput,
    elements.creatorStateSelect,
    elements.extraRequirements,
    elements.objectiveSelect,
    elements.presenceSelect,
    elements.difficultySelect,
    elements.durationSelect,
    elements.referenceData,
    elements.creativeDraftData,
    elements.calendarStart,
    elements.calendarWindow
  ];

  syncTargets.forEach((element) => {
    element.addEventListener("change", () => syncStateFromInputs());
  });

  elements.referenceData.addEventListener("input", () => {
    setReferenceRawText(elements.referenceData.value);
  });
  elements.creativeDraftData.addEventListener("input", () => {
    setCreativeDraftText(elements.creativeDraftData.value);
  });

  elements.apiKey.addEventListener("input", syncConnectionInputs);
  elements.connectionPreset.addEventListener("change", () => {
    applyPresetToInputs(elements.connectionPreset.value);
    syncConnectionInputs();
  });
  elements.providerSelect.addEventListener("change", () => {
    const presetConfig = providerPresetMap[elements.connectionPreset.value];

    if (presetConfig && presetConfig.provider !== elements.providerSelect.value) {
      elements.connectionPreset.value = "custom";
    }

    syncProviderHints();
    syncConnectionInputs();
  });
  elements.modelName.addEventListener("input", syncConnectionInputs);
  elements.baseURL.addEventListener("input", syncConnectionInputs);
  elements.backendEndpoint.addEventListener("input", syncConnectionInputs);
  elements.backendEndpoint.addEventListener("change", async () => {
    await loadRuntimeConfigForCurrentEndpoint();
    syncConnectionInputs();
  });
  elements.rememberApiKey.addEventListener("change", syncConnectionInputs);
  elements.mockFallback.addEventListener("change", syncConnectionInputs);

  elements.toggleApiKey.addEventListener("click", toggleApiKeyVisibility);
  elements.dismissErrorPage.addEventListener("click", clearErrorPanel);
  elements.testConnection.addEventListener("click", handleConnectionTest);
  elements.exportConnectionConfig.addEventListener("click", handleExportConnectionConfig);
  elements.importConnectionConfig.addEventListener("click", () => {
    elements.connectionConfigFile.click();
  });
  elements.connectionConfigFile.addEventListener("change", handleImportConnectionConfig);
  elements.clearLocalConfig.addEventListener("click", handleResetConnectionConfig);
  elements.resetPageState.addEventListener("click", handleResetPageState);
  elements.refreshLiveCheck?.addEventListener("click", loadRecentLiveCheckResults);
  elements.parseReferences.addEventListener("click", () => {
    syncStateFromInputs({ parseReferences: true });
    setUiMessage("已识别参考条目，可以开始生成参考选题。");
  });
  elements.clearReferences.addEventListener("click", () => {
    elements.referenceData.value = "";
    elements.creativeDraftData.value = "";
    clearReferenceSamples();
    setUiMessage("参考输入和创意草稿已清空。");
  });

  elements.generateReferenceIdeas.addEventListener("click", handleGenerateReferenceIdeasClick);
  elements.generateCreativeIdeas.addEventListener("click", () => runTask("creativeIdeas"));
  elements.generateScript.addEventListener("click", () => runTask("script"));
  elements.generateShootingAdvice.addEventListener("click", () => runTask("shootingAdvice"));
  elements.generateFullPlan.addEventListener("click", () => runTask("fullPlan"));
  elements.generateCalendar.addEventListener("click", () => runTask("calendarSummary"));
  elements.runFullFlow.addEventListener("click", runFullFlow);

  elements.copyCurrentIdea.addEventListener("click", handleCopyCurrentIdea);
  elements.copyScript.addEventListener("click", handleCopyScript);
  elements.copyShootingAdvice.addEventListener("click", handleCopyShootingAdvice);
  elements.exportCalendar.addEventListener("click", handleExportCalendar);

  document.body.addEventListener("click", handleDelegatedClick);
}

function toggleApiKeyVisibility() {
  const nextVisible = !getState().devConfig.apiKeyVisible;
  setApiKeyVisibility(nextVisible);
}

function resolveConnectionEndpoint(generateEndpoint = "/api/generate") {
  const trimmed = String(generateEndpoint || "/api/generate").trim();

  if (trimmed.endsWith("/generate")) {
    return `${trimmed.slice(0, -"/generate".length)}/test-connection`;
  }

  return `${trimmed.replace(/\/$/, "")}/test-connection`;
}

function syncConnectionInputs() {
  syncDevConfigFromInputs();
  setConnectionStatus("idle", "输入完成后点击连接测试。");
  setConnectionReport(null);
  applyRuntimeConstraints();
}

function syncDevConfigFromInputs() {
  const providerOptions =
    elements.connectionPreset.value === "minimax-compatible"
      ? {
          testConnectionMode: "chat"
        }
      : {};
  setDevConfig({
    preset: elements.connectionPreset.value,
    provider: elements.providerSelect.value,
    model: elements.modelName.value.trim(),
    baseURL: elements.baseURL.value.trim(),
    backendEndpoint: elements.backendEndpoint.value.trim() || "/api/generate",
    apiKey: runtimeConfig.allowFrontendApiKeyInput ? elements.apiKey.value.trim() : "",
    rememberApiKeyInSession: runtimeConfig.allowFrontendApiKeyInput ? elements.rememberApiKey.checked : false,
    mockFallback: elements.mockFallback.checked,
    providerOptions
  });
}

function syncProviderHints() {
  const runtimePreset = runtimeConfig.presets?.[elements.connectionPreset.value];
  let customProviderPreset = null;

  if (elements.connectionPreset.value === "custom") {
    if (elements.providerSelect.value === "minimax_native") {
      customProviderPreset = providerPresetMap["minimax-native"];
    } else if (elements.providerSelect.value === "openai") {
      customProviderPreset = providerPresetMap.openai;
    } else if (elements.providerSelect.value === "openai_compatible") {
      customProviderPreset = providerPresetMap.openai_compatible;
    }
  }

  const preset =
    runtimePreset || customProviderPreset || providerPresetMap[elements.connectionPreset.value] || providerPresetMap.openai;
  elements.modelName.placeholder = preset.modelPlaceholder || "例如：gpt-4.1-mini";
  elements.baseURL.placeholder = preset.baseURLPlaceholder || "例如：https://api.openai.com/v1";

  if (!elements.modelName.value.trim() && (preset.model || preset.defaultModel)) {
    elements.modelName.value = preset.model || preset.defaultModel;
  }
}

function applyPresetToInputs(presetKey) {
  const runtimePreset = runtimeConfig.presets?.[presetKey];
  const fallbackPreset = providerPresetMap[presetKey];
  const preset = runtimePreset || fallbackPreset;

  if (!preset) {
    return;
  }

  elements.providerSelect.value = preset.provider;

  if (presetKey !== "custom") {
    elements.modelName.value = preset.model || preset.defaultModel || "";
    elements.baseURL.value = preset.baseURL || preset.defaultBaseURL || "";
  }

  syncProviderHints();
}

async function fetchOptionalJson(url) {
  try {
    const response = await fetch(`${url}?ts=${Date.now()}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return response.json().catch(() => null);
  } catch (_error) {
    return null;
  }
}

function getFailureAdvice(errorCode, fallbackMessage = "") {
  if (errorCode === "NETWORK_ERROR") {
    return {
      reason: "当前环境没有成功连到目标 provider。",
      nextStep: "先检查网络出口、代理或防火墙，再重新运行 live:check。"
    };
  }

  if (errorCode === "AUTH_FAILED") {
    return {
      reason: "API Key 无效、过期，或当前账号没有对应模型权限。",
      nextStep: "换有效 Key，并确认账号与模型权限后再重试。"
    };
  }

  if (errorCode === "INVALID_BASE_URL") {
    return {
      reason: "Base URL 或接口路径不匹配。",
      nextStep: "按官方文档核对 Base URL 和 endpoint。MiniMax 原生接口应走 https://api.minimaxi.com/v1/text/chatcompletion_v2。"
    };
  }

  return {
    reason: fallbackMessage || "最近一次联调失败。",
    nextStep: "请结合 failure.json 与 raw.json 继续排查。"
  };
}

function buildLiveCheckCard(label, summaryEntry, successDetail, failureDetail, nextSteps = []) {
  const success = Boolean(summaryEntry?.success);
  const failed = Boolean(summaryEntry?.attempted) && !summaryEntry?.success && !summaryEntry?.skipped;
  const status = success ? "success" : summaryEntry?.skipped ? "skipped" : failed ? "failed" : "idle";
  const generateMeta = successDetail?.generate?.meta || null;
  const failureResponse = failureDetail?.response || null;
  const provider = generateMeta?.provider || successDetail?.provider || failureResponse?.provider || summaryEntry?.provider || label;
  const model = generateMeta?.model || successDetail?.model || failureResponse?.model || summaryEntry?.model || "—";
  const task = generateMeta?.task || failureDetail?.task || (success ? "reference_ideas" : "—");
  const timestamp =
    generateMeta?.generatedAt ||
    successDetail?.generatedAt ||
    failureDetail?.generatedAt ||
    latestLiveCheckSummary?.generatedAt ||
    "—";
  const message = success
    ? "最小真实联调已成功。"
    : summaryEntry?.skipped
      ? "当前没有可用凭据，本轮已跳过。"
      : failureResponse?.error?.message || failureDetail?.reason || summaryEntry?.reason || "最近一次联调失败。";
  const errorCode = failureResponse?.errorCode || summaryEntry?.reason || "—";
  const advice = success
    ? {
        reason: "当前 provider 已通过真实联调。",
        nextStep: "可以继续验证更多 generate 任务。"
      }
    : summaryEntry?.skipped
      ? {
          reason: "当前 provider 本轮未执行。",
          nextStep: "补齐有效凭据后，再重新运行 live:check。"
        }
      : getFailureAdvice(errorCode, message);
  const summaryNextStep = Array.isArray(nextSteps) && nextSteps.length ? nextSteps[0] : advice.nextStep;
  const alertClass = success ? "is-success" : summaryEntry?.skipped ? "is-warn" : "is-error";

  return `
    <article class="connection-report-item">
      <span>${label}</span>
      <strong>${provider}</strong>
      <div class="status-alert ${alertClass}">
        <strong>${success ? "联调状态" : "失败原因"}</strong>
        <p>${advice.reason} (${errorCode})</p>
        <p>${summaryNextStep}</p>
      </div>
      <div class="soft-status">model：${model}</div>
      <div class="soft-status">task：${task}</div>
      <div class="soft-status">status：${status}</div>
      <div class="soft-status">source：real</div>
      <div class="soft-status">time：${timestamp}</div>
      <p class="inline-note">${message}</p>
    </article>
  `;
}

function renderLiveCheckResults(summary, detailMap = {}) {
  if (!elements.liveCheckStatusBoard) {
    return;
  }

  if (!summary) {
    elements.liveCheckStatusBoard.innerHTML =
      '<p class="live-check-empty">还没有读取到真实联调结果。先运行一次 `npm run live:check`。</p>';
    return;
  }

  latestLiveCheckSummary = summary;
  elements.liveCheckStatusBoard.innerHTML = `
    ${
      summary.next_steps
        ? `
          <div class="status-alert is-warn">
            <strong>本轮排障建议</strong>
            <p>${(summary.next_steps.general || []).join(" ")}</p>
          </div>
        `
        : ""
    }
    <div class="connection-report-grid">
      ${buildLiveCheckCard(
        "OpenAI",
        summary.openai,
        detailMap.openaiSuccess,
        detailMap.openaiFailure,
        summary.next_steps?.openai || []
      )}
      ${buildLiveCheckCard(
        "OpenAI Compatible",
        summary.openaiCompatible,
        detailMap.compatibleSuccess,
        detailMap.compatibleFailure,
        summary.next_steps?.openaiCompatible || []
      )}
      ${
        summary.minimaxNative
          ? buildLiveCheckCard(
              "MiniMax Native",
              summary.minimaxNative,
              detailMap.minimaxNativeSuccess,
              detailMap.minimaxNativeFailure,
              summary.next_steps?.minimaxNative || []
            )
          : ""
      }
      <article class="connection-report-item">
        <span>最近一次汇总</span>
        <strong>${summary.generatedAt || "—"}</strong>
        <div class="soft-status">openai：${summary.openai?.success ? "success" : summary.openai?.reason || "idle"}</div>
        <div class="soft-status">compatible：${
          summary.openaiCompatible?.success ? "success" : summary.openaiCompatible?.reason || "idle"
        }</div>
        <div class="soft-status">minimax-native：${
          summary.minimaxNative ? (summary.minimaxNative.success ? "success" : summary.minimaxNative.reason || "idle") : "未执行"
        }</div>
        <div class="soft-status">source：real</div>
      </article>
    </div>
  `;
}

async function loadRecentLiveCheckResults() {
  const summary = await fetchOptionalJson("/fixtures/live/live-check.summary.json");

  if (!summary) {
    renderLiveCheckResults(null);
    return;
  }

  const [openaiSuccess, openaiFailure, compatibleSuccess, compatibleFailure, minimaxNativeSuccess, minimaxNativeFailure] =
    await Promise.all([
    fetchOptionalJson("/fixtures/live/openai.success.json"),
    fetchOptionalJson("/fixtures/live/openai.failure.json"),
    fetchOptionalJson("/fixtures/live/openai_compatible.success.json"),
    fetchOptionalJson("/fixtures/live/openai_compatible.failure.json"),
    fetchOptionalJson("/fixtures/live/minimax_native.success.json"),
    fetchOptionalJson("/fixtures/live/minimax_native.failure.json")
    ]);

  renderLiveCheckResults(summary, {
    openaiSuccess,
    openaiFailure,
    compatibleSuccess,
    compatibleFailure,
    minimaxNativeSuccess,
    minimaxNativeFailure
  });
}

function syncStateFromInputs({ parseReferences = false } = {}) {
  const profile = {
    accountType: elements.accountTypeSelect.value,
    accountTypeLabel: elements.accountTypeSelect.selectedOptions[0]?.textContent || "",
    mainPlatform: elements.mainPlatformSelect.value,
    mainPlatformLabel: elements.mainPlatformSelect.selectedOptions[0]?.textContent || "",
    accountVibe: elements.accountVibeSelect.value,
    accountVibeLabel: elements.accountVibeSelect.selectedOptions[0]?.textContent || "",
    audience: elements.audienceSelect.value,
    audienceLabel: elements.audienceSelect.selectedOptions[0]?.textContent || "",
    commonScene: elements.commonSceneSelect.value,
    commonSceneLabel: elements.commonSceneSelect.selectedOptions[0]?.textContent || "",
    frequency: elements.frequencySelect.value,
    frequencyLabel: elements.frequencySelect.selectedOptions[0]?.textContent || "",
    accountBrief: elements.accountBriefInput.value.trim(),
    creatorState: elements.creatorStateSelect.value,
    creatorStateLabel: elements.creatorStateSelect.selectedOptions[0]?.textContent || "",
    extraRequirements: elements.extraRequirements.value.trim()
  };

  const filters = {
    objective: elements.objectiveSelect.value,
    objectiveLabel: elements.objectiveSelect.selectedOptions[0]?.textContent || "",
    presence: elements.presenceSelect.value,
    presenceLabel: elements.presenceSelect.selectedOptions[0]?.textContent || "",
    difficulty: elements.difficultySelect.value,
    difficultyLabel: elements.difficultySelect.selectedOptions[0]?.textContent || "",
    duration: elements.durationSelect.value,
    durationLabel: elements.durationSelect.selectedOptions[0]?.textContent || ""
  };

  setProfileAndFilters(profile, filters);
  setCalendarSettings({
    startDate: elements.calendarStart.value,
    windowDays: elements.calendarWindow.value
  });
  syncDevConfigFromInputs();
  setReferenceRawText(elements.referenceData.value);
  setCreativeDraftText(elements.creativeDraftData.value);

  if (parseReferences) {
    setReferenceSamples(parseReferenceSamples(elements.referenceData.value));
  }
}

function parseReferenceSamples(rawText) {
  return rawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      id: `reference-${index + 1}-${hashString(line)}`,
      raw: line,
      platform: detectPlatform(line),
      creator: detectCreator(line),
      title: detectTitle(line)
    }));
}

function detectPlatform(text) {
  if (text.includes("小红书")) {
    return "小红书";
  }

  if (text.includes("抖音")) {
    return "抖音";
  }

  if (text.includes("B站") || text.toLowerCase().includes("bilibili")) {
    return "B 站";
  }

  return "外部参考";
}

function detectCreator(text) {
  const atMatch = text.match(/@([^\s《]+)/);
  return atMatch ? `@${atMatch[1]}` : "参考条目";
}

function detectTitle(text) {
  const bracketMatch = text.match(/《([^》]+)》/);

  if (bracketMatch) {
    return bracketMatch[1];
  }

  return text.length > 36 ? `${text.slice(0, 36)}...` : text;
}

function hashString(text) {
  return [...text].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function buildErrorPanel(error, { taskKey = "", taskLabel = "", retryAction = "" } = {}) {
  return {
    title: error.code === "SCHEMA_VALIDATION_FAILED" ? "AI 返回格式未通过校验" : taskLabel || "请求失败",
    message: error.message || "请稍后重试。",
    code: error.code || "UNKNOWN_ERROR",
    taskLabel,
    details: error.details || [],
    receivedPreview: error.receivedPreview || null,
    retryTask: taskKey || "",
    retryAction
  };
}

function buildConnectionReportPayload({
  provider,
  model,
  baseURL,
  endpoint,
  success,
  message,
  errorCode,
  latencyMs,
  source
}) {
  return {
    provider,
    model,
    baseURL,
    endpoint,
    success,
    message,
    errorCode,
    latencyMs,
    source
  };
}

function updateConnectionReportFromSuccess(result, devConfig) {
  const source = result.transport === "mock" ? "mock" : "real";
  const status = source === "mock" ? "mock" : "success";

  setConnectionStatus(status, result.message || (source === "mock" ? "已启用 Mock Fallback。" : "已连接，可以开始生成。"));
  setConnectionReport(
    buildConnectionReportPayload({
      provider: result.provider || devConfig.provider,
      model: result.model || devConfig.model,
      baseURL: result.baseURL || devConfig.baseURL,
      endpoint: result.endpoint || devConfig.backendEndpoint,
      success: source === "real" && Boolean(result.available),
      message:
        result.message ||
        (source === "mock" ? "真实 provider 当前不可用，已启用 Mock Fallback。" : "连接成功，可以开始生成。"),
      errorCode: result.errorCode || "—",
      latencyMs: result.latencyMs ?? null,
      source
    })
  );
}

function updateConnectionReportFromError(error, devConfig) {
  setConnectionStatus("error", error.message);
  setConnectionReport(
    buildConnectionReportPayload({
      provider: error.provider || devConfig.provider,
      model: error.model || devConfig.model,
      baseURL: error.baseURL || devConfig.baseURL,
      endpoint: error.endpoint || devConfig.backendEndpoint,
      success: false,
      message: error.message || "连接测试失败。",
      errorCode: error.code || "API_ERROR",
      latencyMs: error.latencyMs ?? null,
      source: error.transport === "mock" ? "mock" : "real"
    })
  );
}

async function handleConnectionTest() {
  console.log("clicked: test-connection");
  syncStateFromInputs({ parseReferences: true });
  clearErrorPanel();
  const devConfig = getState().devConfig;
  const validation = getConnectionValidation(getState());

  if (!validation.valid) {
    const message = `连接测试未执行：${validation.issues.join("；")}`;
    setConnectionStatus("error", message);
    setConnectionReport(
      buildConnectionReportPayload({
        provider: devConfig.provider,
        model: devConfig.model,
        baseURL: devConfig.baseURL,
        endpoint: resolveConnectionEndpoint(devConfig.backendEndpoint),
        success: false,
        message,
        errorCode: "INVALID_CLIENT_INPUT",
        latencyMs: null,
        source: "pending"
      })
    );
    setRequest("connectionTest", {
      status: "error",
      label: "连接测试",
      error: message,
      errorDetails: validation.issues.map((item) => ({ path: "devConfig", message: item }))
    });
    setUiMessage(message, "error");
    setErrorPanel(
      buildErrorPanel(
        {
          code: "INVALID_CLIENT_INPUT",
          message,
          details: validation.issues.map((item) => ({ path: "devConfig", message: item }))
        },
        { taskLabel: "连接测试", retryAction: "connectionTest" }
      )
    );
    return;
  }

  setRequest("connectionTest", {
    status: "loading",
    label: "连接测试",
    error: null,
    errorDetails: null
  });
  setConnectionReport(
    buildConnectionReportPayload({
      provider: devConfig.provider,
      model: devConfig.model,
      baseURL: devConfig.baseURL,
      endpoint: resolveConnectionEndpoint(devConfig.backendEndpoint),
      success: false,
      message: "连接中，请稍等...",
      errorCode: "—",
      latencyMs: null,
      source: "pending"
    })
  );
  setConnectionStatus("idle", "连接中，请稍等...");

  try {
    const result = await testConnection(devConfig);
    updateConnectionReportFromSuccess(result, devConfig);
    setRequest("connectionTest", {
      status: "success",
      label: "连接测试",
      error: null,
      errorDetails: null
    });
    setUiMessage(
      result.transport === "mock"
        ? "真实 provider 当前不可用，已切换为 Mock Fallback。"
        : result.message || "已连接，可以开始生成。"
    );
    clearErrorPanel();
  } catch (error) {
    updateConnectionReportFromError(error, getState().devConfig);
    setRequest("connectionTest", {
      status: "error",
      label: "连接测试",
      error: error.message,
      errorDetails: error.details || []
    });
    setUiMessage(error.message, "error");
    setErrorPanel(buildErrorPanel(error, { taskLabel: "连接测试", retryAction: "connectionTest" }));
  }
}

function isWorkflowManagedTask(taskKey) {
  return getState().workflow.sequence.includes(taskKey);
}

function hasWorkflowOutput(taskKey, state) {
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);

  switch (taskKey) {
    case "referenceIdeas":
      return Boolean(state.ideas.reference.items.length);
    case "creativeIdeas":
      return Boolean(state.ideas.creative.items.length);
    case "fullPlan":
      return Boolean(activeIdea && (planBundle?.fullPlan || planBundle?.script || planBundle?.shootingAdvice));
    case "calendarSummary":
      return Boolean(state.outputs.calendar.entries.length && state.outputs.calendar.snapshot);
    default:
      return false;
  }
}

function prepareWorkflowRun(state, startTaskKey) {
  const startIndex = state.workflow.sequence.indexOf(startTaskKey);
  resetWorkflowRun(startTaskKey);

  state.workflow.sequence.forEach((taskKey, index) => {
    if (index < startIndex && hasWorkflowOutput(taskKey, state)) {
      setWorkflowStep(taskKey, {
        status: "skipped",
        error: "已沿用这一步的成功结果，无需重跑。"
      });
      return;
    }

    setWorkflowStep(taskKey, {
      status: "pending",
      error: ""
    });
  });

  return startIndex;
}

async function runFullFlow(startTaskKey = "") {
  syncStateFromInputs({ parseReferences: true });
  const state = getState();

  if (!isConnectionReady(state)) {
    setUiMessage("请先完成 API 连接测试。", "error");
    return;
  }

  const flowStartTask =
    startTaskKey || state.workflow.sequence.find((taskKey) => !hasWorkflowOutput(taskKey, state)) || "";

  if (!flowStartTask) {
    finalizeWorkflowRun("success");
    setUiMessage("当前完整流程已经有结果了，可以单独重试某一步。");
    return;
  }

  clearErrorPanel();
  const startIndex = prepareWorkflowRun(state, flowStartTask);

  for (let index = startIndex; index < state.workflow.sequence.length; index += 1) {
    const taskKey = state.workflow.sequence[index];
    const succeeded = await runTask(taskKey, { fromWorkflow: true, silentSuccess: true });

    if (!succeeded) {
      for (let remainingIndex = index + 1; remainingIndex < state.workflow.sequence.length; remainingIndex += 1) {
        const nextTaskKey = state.workflow.sequence[remainingIndex];
        setWorkflowStep(nextTaskKey, {
          status: "skipped",
          error: "上一步失败，本步骤暂未执行。"
        });
      }

      finalizeWorkflowRun("failed");
      setUiMessage("完整流程在中途失败，可以从出错步骤继续重试。", "error");
      return;
    }
  }

  finalizeWorkflowRun("success");
  setUiMessage("完整工作流已完成，结果已经按模块回填。");
}

function getBlockedTaskMessage(taskKey, state) {
  if (!isConnectionReady(state)) {
    return "请先完成连接测试，再执行生成。";
  }

  if ((taskKey === "script" || taskKey === "shootingAdvice" || taskKey === "fullPlan") && !getActiveIdea(state)) {
    return "请先从参考选题或创意选题中设为一条当前选题。";
  }

  if (taskKey === "calendarSummary" && !state.ideas.reference.items.length && !state.ideas.creative.items.length) {
    return "请先至少生成一组选题，再生成日历摘要。";
  }

  return "当前任务暂时不能执行，请检查上一步是否完成。";
}

async function runTask(taskKey, options = {}) {
  syncStateFromInputs(taskKey === "referenceIdeas" || taskKey === "creativeIdeas" ? { parseReferences: true } : {});
  const state = getState();
  const request = buildTaskRequest(taskKey, state);

  if (!request) {
    const label = getTaskLabel(taskKey);
    const message = getBlockedTaskMessage(taskKey, state);
    setRequest(taskKey, {
      status: "error",
      label,
      error: message,
      errorDetails: []
    });
    setUiMessage(message, "error");
    setErrorPanel(
      buildErrorPanel(
        {
          code: "TASK_BLOCKED",
          message
        },
        { taskKey, taskLabel: label }
      )
    );
    return false;
  }

  clearErrorPanel();
  setRequest(taskKey, {
    status: "loading",
    label: request.label,
    error: null,
    errorDetails: null,
    startedAt: new Date().toISOString()
  });

  try {
    if (isWorkflowManagedTask(taskKey)) {
      setWorkflowStep(taskKey, {
        status: "running",
        error: ""
      });
    }

    const response = await executeTask(request, getState().devConfig);
    applyTaskResult(taskKey, response);
    setRequest(taskKey, {
      status: "success",
      label: request.label,
      error: null,
      errorDetails: null,
      finishedAt: new Date().toISOString()
    });

    if (isWorkflowManagedTask(taskKey)) {
      setWorkflowStep(taskKey, {
        status: "success",
        error: ""
      });
    }

    if (!options.silentSuccess) {
      setUiMessage(`${request.label}完成。`);
    }

    clearErrorPanel();
    return true;
  } catch (error) {
    setRequest(taskKey, {
      status: "error",
      label: request.label,
      error: error.message,
      errorDetails: error.details || [],
      finishedAt: new Date().toISOString()
    });

    if (isWorkflowManagedTask(taskKey)) {
      setWorkflowStep(taskKey, {
        status: "failed",
        error: error.message
      });
    }

    setUiMessage(error.message, "error");
    setErrorPanel(buildErrorPanel(error, { taskKey, taskLabel: request.label }));
    return false;
  }
}

function applyTaskResult(taskKey, response) {
  const activeIdea = getActiveIdea(getState());

  switch (taskKey) {
    case "referenceIdeas":
      setIdeaResults("reference", response.data, response.meta);
      return;
    case "creativeIdeas":
      setIdeaResults("creative", response.data, response.meta);
      return;
    case "script":
      if (activeIdea) {
        setPlanResult(activeIdea.id, "script", response.data, response.meta);
      }
      return;
    case "shootingAdvice":
      if (activeIdea) {
        setPlanResult(activeIdea.id, "shootingAdvice", response.data, response.meta);
      }
      return;
    case "fullPlan":
      if (activeIdea) {
        setPlanResult(activeIdea.id, "fullPlan", response.data, response.meta);
      }
      return;
    case "calendarSummary":
      setCalendarResult(response.data, response.meta);
      return;
    default:
      break;
  }
}

function handleDelegatedClick(event) {
  const referenceAction = event.target.closest("[data-reference-action]");

  if (referenceAction) {
    const sampleId = referenceAction.dataset.referenceId;

    if (referenceAction.dataset.referenceAction === "remove") {
      removeReferenceSample(sampleId);
      elements.referenceData.value = getState().references.benchmarkRawText;
      return;
    }

    if (referenceAction.dataset.referenceAction === "prefer") {
      setPreferredReference(sampleId);
      return;
    }
  }

  const ideaSelection = event.target.closest("[data-select-idea]");

  if (ideaSelection) {
    setActiveIdea(ideaSelection.dataset.ideaId, ideaSelection.dataset.selectIdea);
    setUiMessage("当前选题已切换，可以继续生成脚本和拍摄建议。");
    return;
  }

  const retryTask = event.target.closest("[data-retry-task]");

  if (retryTask) {
    runTask(retryTask.dataset.retryTask);
    return;
  }

  const retryFlowStep = event.target.closest("[data-retry-flow-step]");

  if (retryFlowStep) {
    runFullFlow(retryFlowStep.dataset.retryFlowStep);
    return;
  }

  const retryAction = event.target.closest("[data-retry-action]");

  if (retryAction?.dataset.retryAction === "connectionTest") {
    handleConnectionTest();
  }
}

function renderConnectionState(state) {
  const status = state.requests.connectionTest?.status === "loading" ? "loading" : state.devConfig.connectionStatus;
  const className =
    status === "success"
      ? "is-success"
      : status === "mock"
        ? "is-mock"
        : status === "error"
          ? "is-error"
          : "is-idle";
  const text =
    status === "success"
      ? "连接成功"
      : status === "mock"
        ? "Mock Fallback"
        : status === "error"
          ? "连接失败"
          : status === "loading"
            ? "连接中"
            : "未连接";

  elements.connectionStatus.className = `connection-status ${className}`;
  elements.connectionStatus.textContent = text;
  elements.connectionMessage.textContent =
    state.devConfig.connectionMessage ||
    (status === "success" ? "已连接，可以开始生成。" : "先完成连接测试，再开始生成内容。");
  elements.apiKey.type = state.devConfig.apiKeyVisible ? "text" : "password";
  elements.toggleApiKey.textContent = state.devConfig.apiKeyVisible ? "隐藏" : "显示";
  applyRuntimeConstraints();
}

function hasScriptContent(planBundle) {
  const merged = {
    ...(planBundle?.fullPlan?.data || {}),
    ...(planBundle?.script?.data || {}),
    ...(planBundle?.shootingAdvice?.data || {})
  };

  return Boolean(
    merged.titleSuggestions?.length ||
      merged.hook ||
      merged.structure?.length ||
      merged.scriptSections?.length ||
      merged.angles?.length ||
      merged.shotSuggestions?.length ||
      merged.notes?.length ||
      merged.broll?.length
  );
}

function hasShootingAdvice(planBundle) {
  const merged = {
    ...(planBundle?.fullPlan?.data || {}),
    ...(planBundle?.shootingAdvice?.data || {})
  };

  return Boolean(merged.angles?.length || merged.shotSuggestions?.length || merged.notes?.length || merged.broll?.length);
}

function syncButtonStates(state) {
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);
  const busy = (key) => state.requests[key]?.status === "loading";

  elements.testConnection.disabled = busy("connectionTest");
  elements.generateReferenceIdeas.disabled = busy("referenceIdeas");
  elements.generateCreativeIdeas.disabled = busy("creativeIdeas");
  elements.generateScript.disabled = busy("script");
  elements.generateShootingAdvice.disabled = busy("shootingAdvice");
  elements.generateFullPlan.disabled = busy("fullPlan");
  elements.generateCalendar.disabled = busy("calendarSummary");
  elements.runFullFlow.disabled = state.workflow.status === "running";
  elements.copyCurrentIdea.disabled = !activeIdea;
  elements.copyScript.disabled = !hasScriptContent(planBundle);
  elements.copyShootingAdvice.disabled = !hasShootingAdvice(planBundle);
  elements.exportCalendar.disabled = !state.outputs.calendar.entries.length;
}

function buildCurrentIdeaText(activeIdea, state) {
  const typeLabel = state.ideas.active.source === "creative" ? "创意选题" : "参考选题";
  return [
    `当前选题：${activeIdea.title}`,
    `类型：${typeLabel}`,
    `适合平台：${activeIdea.platform || state.profile.mainPlatformLabel || state.profile.mainPlatform}`,
    `适合场景：${activeIdea.scene || state.profile.commonSceneLabel || state.profile.commonScene}`,
    `推荐理由：${activeIdea.recommendationReason || activeIdea.highlight || "更适合当前账号定位"}`
  ].join("\n");
}

function buildScriptText(planBundle, activeIdea) {
  const merged = {
    ...(planBundle?.fullPlan?.data || {}),
    ...(planBundle?.script?.data || {}),
    ...(planBundle?.shootingAdvice?.data || {})
  };

  return [
    `当前选题：${activeIdea?.title || "未命名选题"}`,
    "",
    "标题建议：",
    ...(merged.titleSuggestions || []),
    "",
    `开头 Hook：${merged.hook || ""}`,
    "",
    "脚本大纲：",
    ...(merged.structure || []),
    "",
    "分段脚本：",
    ...(merged.scriptSections || []).map((section) => `${section.label}：${section.content}`),
    "",
    "字幕关键词：",
    ...(merged.subtitleKeywords || [])
  ].join("\n");
}

function buildShootingAdviceText(planBundle) {
  const merged = {
    ...(planBundle?.fullPlan?.data || {}),
    ...(planBundle?.shootingAdvice?.data || {})
  };

  return [
    "拍摄角度：",
    ...(merged.angles || []),
    "",
    "镜头设计：",
    ...(merged.shotSuggestions || []),
    "",
    "拍摄注意事项：",
    ...(merged.notes || []),
    "",
    "B-roll 建议：",
    ...(merged.broll || [])
  ].join("\n");
}

function buildCalendarExportText(state) {
  const snapshot = state.outputs.calendar.snapshot;
  const entries = state.outputs.calendar.entries || [];

  return [
    "# 工作日历摘要",
    "",
    `本周期重点：${snapshot?.focus || ""}`,
    `建议更新频率：${snapshot?.cadence || ""}`,
    `内容分布建议：${snapshot?.distribution || ""}`,
    snapshot?.summary || "",
    "",
    ...entries.map(
      (entry) =>
        `- ${entry.dateLabel} | ${entry.title} | ${entry.type} | ${entry.platform} | ${entry.goal} | ${entry.reminder}`
    )
  ].join("\n");
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setUiMessage(successMessage);
  } catch (error) {
    setUiMessage("复制失败，请检查浏览器权限。", "error");
  }
}

function handleExportConnectionConfig() {
  exportConnectionConfig(getState().devConfig);
  setUiMessage("连接配置已导出，不包含 API Key。");
}

function resetConnectionInputsToDefaults() {
  elements.connectionPreset.value = connectionDefaults.preset;
  elements.providerSelect.value = connectionDefaults.provider;
  elements.modelName.value = connectionDefaults.model;
  elements.baseURL.value = connectionDefaults.baseURL;
  elements.backendEndpoint.value = connectionDefaults.backendEndpoint;
  elements.apiKey.value = "";
  elements.rememberApiKey.checked = false;
  elements.mockFallback.checked = false;
  syncProviderHints();
  setApiKeyVisibility(false);
  syncConnectionInputs();
}

function handleResetConnectionConfig() {
  clearSessionApiKey();
  resetConnectionInputsToDefaults();
  setUiMessage("连接配置已重置，请重新执行连接测试。");
}

function handleResetPageState() {
  clearWorkspaceSnapshot();
  clearSessionApiKey();
  window.location.reload();
}

function handleGenerateReferenceIdeasClick() {
  console.log("clicked: generate-reference-ideas");
  runTask("referenceIdeas");
}

async function handleImportConnectionConfig(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  try {
    const config = await importConnectionConfig(file);
    elements.connectionPreset.value = config.preset || "custom";
    elements.providerSelect.value = config.provider || "openai_compatible";
    elements.modelName.value = config.model || "";
    elements.baseURL.value = config.baseURL || "";
    elements.backendEndpoint.value = config.backendEndpoint || "/api/generate";
    elements.mockFallback.checked = Boolean(config.mockFallback);
    syncProviderHints();
    syncConnectionInputs();
    setUiMessage("连接配置已导入，请重新执行连接测试。");
  } catch (_error) {
    setUiMessage("导入失败，请确认文件是有效的 JSON 配置。", "error");
  } finally {
    event.target.value = "";
  }
}

function handleCopyCurrentIdea() {
  const state = getState();
  const activeIdea = getActiveIdea(state);

  if (!activeIdea) {
    setUiMessage("还没有当前选题可以复制。", "error");
    return;
  }

  copyText(buildCurrentIdeaText(activeIdea, state), "当前选题已复制。");
}

function handleCopyScript() {
  const state = getState();
  const activeIdea = getActiveIdea(state);
  const planBundle = getCurrentPlanBundle(state);

  if (!activeIdea || !planBundle) {
    setUiMessage("还没有可复制的脚本内容。", "error");
    return;
  }

  copyText(buildScriptText(planBundle, activeIdea), "当前脚本已复制。");
}

function handleCopyShootingAdvice() {
  const planBundle = getCurrentPlanBundle(getState());

  if (!planBundle) {
    setUiMessage("还没有可复制的拍摄建议。", "error");
    return;
  }

  copyText(buildShootingAdviceText(planBundle), "拍摄建议已复制。");
}

function handleExportCalendar() {
  const state = getState();

  if (!state.outputs.calendar.entries.length) {
    setUiMessage("还没有日历摘要可以导出。", "error");
    return;
  }

  const blob = new Blob([buildCalendarExportText(state)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `vlog-calendar-summary-${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
  setUiMessage("日历摘要已导出。");
}

function renderApp(state) {
  renderConnectionState(state);
  renderTopSection(elements, state);
  renderWorkflowSection(elements, state);
  renderIdeaSection(elements, state);
  renderScriptSection(elements, state);
  renderCalendarSection(elements, state);
  syncButtonStates(state);
}
