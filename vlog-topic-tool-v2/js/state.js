import {
  connectionDefaults,
  defaultCalendarSettings,
  defaultFilterValues,
  defaultProfileValues,
  providerOptions,
  providerPresetMap
} from "./data/catalog.js";

const listeners = new Set();
const VALID_PROVIDER_IDS = new Set(providerOptions.map((option) => option.value));
const VALID_PRESET_IDS = new Set(Object.keys(providerPresetMap));

function cloneValue(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function todayInputValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createWorkflowSteps() {
  return {
    referenceIdeas: { label: "生成参考选题", status: "idle", error: "", updatedAt: null },
    creativeIdeas: { label: "生成创意选题", status: "idle", error: "", updatedAt: null },
    fullPlan: { label: "生成完整拍摄方案", status: "idle", error: "", updatedAt: null },
    calendarSummary: { label: "生成日历摘要", status: "idle", error: "", updatedAt: null }
  };
}

function createInitialState() {
  return {
    devConfig: {
      preset: "openai",
      provider: connectionDefaults.provider,
      model: connectionDefaults.model,
      baseURL: connectionDefaults.baseURL,
      backendEndpoint: connectionDefaults.backendEndpoint,
      apiKey: "",
      rememberApiKeyInSession: false,
      apiKeyVisible: false,
      connectionStatus: "idle",
      connectionMessage: "输入完成后点击连接测试。",
      connectionReport: null,
      mockFallback: false
    },
    profile: {
      ...defaultProfileValues,
      accountBrief: "",
      extraRequirements: ""
    },
    filters: {
      objective: defaultFilterValues.objective,
      objectiveLabel: "",
      presence: defaultFilterValues.presence,
      presenceLabel: "",
      difficulty: defaultFilterValues.difficulty,
      difficultyLabel: "",
      duration: defaultFilterValues.duration,
      durationLabel: ""
    },
    references: {
      benchmarkRawText: defaultFilterValues.referenceData,
      creativeDraftText: "",
      samples: [],
      preferredId: null
    },
    ideas: {
      reference: {
        items: [],
        meta: null
      },
      creative: {
        items: [],
        meta: null
      },
      active: {
        id: null,
        source: null
      }
    },
    outputs: {
      plansByIdea: {},
      calendar: {
        entries: [],
        snapshot: null,
        meta: null,
        settings: {
          startDate: todayInputValue(),
          windowDays: defaultCalendarSettings.windowDays
        }
      }
    },
    workflow: {
      status: "idle",
      sequence: ["referenceIdeas", "creativeIdeas", "fullPlan", "calendarSummary"],
      startedAt: null,
      finishedAt: null,
      steps: createWorkflowSteps()
    },
    requests: {},
    ui: {
      message: null,
      messageType: "info",
      errorPanel: null
    }
  };
}

function sanitizePersistedDevConfig(devConfig = {}) {
  const preset =
    typeof devConfig.preset === "string" && VALID_PRESET_IDS.has(devConfig.preset)
      ? devConfig.preset
      : connectionDefaults.preset;
  const presetDefaults = providerPresetMap[preset] || providerPresetMap[connectionDefaults.preset];
  const provider =
    typeof devConfig.provider === "string" && VALID_PROVIDER_IDS.has(devConfig.provider)
      ? devConfig.provider
      : presetDefaults?.provider || connectionDefaults.provider;
  const model =
    typeof devConfig.model === "string" && devConfig.model.trim()
      ? devConfig.model.trim()
      : presetDefaults?.model || connectionDefaults.model;
  const baseURL =
    typeof devConfig.baseURL === "string"
      ? devConfig.baseURL.trim()
      : presetDefaults?.baseURL || connectionDefaults.baseURL;
  const backendEndpoint =
    typeof devConfig.backendEndpoint === "string" && devConfig.backendEndpoint.trim()
      ? devConfig.backendEndpoint.trim()
      : connectionDefaults.backendEndpoint;

  return {
    preset,
    provider,
    model,
    baseURL,
    backendEndpoint,
    rememberApiKeyInSession: Boolean(devConfig.rememberApiKeyInSession)
  };
}

let state = createInitialState();

function notify() {
  listeners.forEach((listener) => listener(state));
}

function commit(nextState) {
  state = nextState;
  notify();
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

export function setState(recipe) {
  const nextState = cloneValue(state);
  recipe(nextState);
  commit(nextState);
}

export function setDevConfig(patch) {
  setState((draft) => {
    draft.devConfig = { ...draft.devConfig, ...patch };
  });
}

export function setConnectionStatus(status, message) {
  setState((draft) => {
    draft.devConfig.connectionStatus = status;
    draft.devConfig.connectionMessage = message;
  });
}

export function setConnectionReport(report) {
  setState((draft) => {
    draft.devConfig.connectionReport = report;
  });
}

export function setApiKeyVisibility(visible) {
  setState((draft) => {
    draft.devConfig.apiKeyVisible = Boolean(visible);
  });
}

export function setProfileAndFilters(profile, filters) {
  setState((draft) => {
    draft.profile = profile;
    draft.filters = filters;
  });
}

export function setReferenceRawText(rawText) {
  setState((draft) => {
    draft.references.benchmarkRawText = rawText;
  });
}

export function setCreativeDraftText(rawText) {
  setState((draft) => {
    draft.references.creativeDraftText = rawText;
  });
}

export function setReferenceSamples(samples) {
  setState((draft) => {
    draft.references.samples = samples;
    draft.references.preferredId = samples[0]?.id || null;
  });
}

export function removeReferenceSample(sampleId) {
  setState((draft) => {
    draft.references.samples = draft.references.samples.filter((sample) => sample.id !== sampleId);
    draft.references.benchmarkRawText = draft.references.samples.map((sample) => sample.raw).join("\n");

    if (draft.references.preferredId === sampleId) {
      draft.references.preferredId = draft.references.samples[0]?.id || null;
    }
  });
}

export function clearReferenceSamples() {
  setState((draft) => {
    draft.references.benchmarkRawText = "";
    draft.references.creativeDraftText = "";
    draft.references.samples = [];
    draft.references.preferredId = null;
  });
}

export function setPreferredReference(sampleId) {
  setState((draft) => {
    draft.references.preferredId = sampleId;
  });
}

export function setIdeaResults(kind, payload, meta) {
  setState((draft) => {
    draft.ideas[kind].items = payload.items || [];
    draft.ideas[kind].meta = meta;

    const firstId = payload.recommendedId || payload.items?.[0]?.id || null;
    const shouldPromoteCreative = kind === "creative" && firstId;

    if (!draft.ideas.active.id || shouldPromoteCreative) {
      if (firstId) {
        draft.ideas.active = {
          id: firstId,
          source: kind
        };
      }
    }
  });
}

export function setActiveIdea(ideaId, source) {
  setState((draft) => {
    draft.ideas.active = {
      id: ideaId,
      source
    };
  });
}

export function activateIdeaRecord(idea, source = "creative") {
  if (!idea?.id) {
    return;
  }

  setState((draft) => {
    const targetList = draft.ideas[source]?.items || [];
    const exists = targetList.some((item) => item.id === idea.id);

    if (!exists && draft.ideas[source]) {
      draft.ideas[source].items = [idea, ...draft.ideas[source].items];
    }

    draft.ideas.active = {
      id: idea.id,
      source
    };
  });
}

export function setPlanResult(ideaId, slot, payload, meta) {
  setState((draft) => {
    draft.outputs.plansByIdea[ideaId] = {
      ...(draft.outputs.plansByIdea[ideaId] || {}),
      [slot]: {
        data: payload,
        meta
      }
    };
  });
}

export function setCalendarResult(payload, meta) {
  setState((draft) => {
    draft.outputs.calendar.entries = payload.entries || [];
    draft.outputs.calendar.snapshot = payload.snapshot || null;
    draft.outputs.calendar.meta = meta;
  });
}

export function setCalendarSettings(settings) {
  setState((draft) => {
    draft.outputs.calendar.settings = {
      ...draft.outputs.calendar.settings,
      ...settings
    };
  });
}

export function setRequest(taskKey, patch) {
  setState((draft) => {
    draft.requests[taskKey] = {
      ...(draft.requests[taskKey] || {
        status: "idle",
        label: taskKey,
        error: null,
        startedAt: null,
        finishedAt: null
      }),
      ...patch
    };
  });
}

export function setUiMessage(message, messageType = "info") {
  setState((draft) => {
    draft.ui.message = message;
    draft.ui.messageType = messageType;
  });
}

export function setErrorPanel(errorPanel) {
  setState((draft) => {
    draft.ui.errorPanel = errorPanel;
  });
}

export function clearErrorPanel() {
  setState((draft) => {
    draft.ui.errorPanel = null;
  });
}

export function resetWorkflowRun(startTaskKey = "referenceIdeas") {
  setState((draft) => {
    draft.workflow.status = "running";
    draft.workflow.startedAt = new Date().toISOString();
    draft.workflow.finishedAt = null;

    const startIndex = draft.workflow.sequence.indexOf(startTaskKey);

    draft.workflow.sequence.forEach((taskKey, index) => {
      if (index < startIndex && draft.workflow.steps[taskKey]?.status === "success") {
        return;
      }

      draft.workflow.steps[taskKey] = {
        ...(draft.workflow.steps[taskKey] || { label: taskKey }),
        status: "pending",
        error: "",
        updatedAt: new Date().toISOString()
      };
    });
  });
}

export function setWorkflowStep(taskKey, patch) {
  setState((draft) => {
    draft.workflow.steps[taskKey] = {
      ...(draft.workflow.steps[taskKey] || { label: taskKey, status: "idle", error: "", updatedAt: null }),
      ...patch,
      updatedAt: new Date().toISOString()
    };
  });
}

export function finalizeWorkflowRun(status = "success") {
  setState((draft) => {
    draft.workflow.status = status;
    draft.workflow.finishedAt = new Date().toISOString();
  });
}

function markMetaAsCached(meta) {
  if (!meta) {
    return null;
  }

  return {
    ...meta,
    originalTransport: meta.transport || "live",
    transport: "cached"
  };
}

function markOutputBundleAsCached(bundle = {}) {
  return Object.fromEntries(
    Object.entries(bundle).map(([slot, value]) => [
      slot,
      {
        data: value?.data || {},
        meta: markMetaAsCached(value?.meta || null)
      }
    ])
  );
}

export function hydratePersistedWorkspace(snapshot = {}) {
  setState((draft) => {
    if (snapshot.devConfig) {
      const safeDevConfig = sanitizePersistedDevConfig(snapshot.devConfig);
      draft.devConfig = {
        ...draft.devConfig,
        preset: safeDevConfig.preset,
        provider: safeDevConfig.provider,
        model: safeDevConfig.model,
        baseURL: safeDevConfig.baseURL,
        backendEndpoint: safeDevConfig.backendEndpoint,
        mockFallback: false,
        rememberApiKeyInSession: safeDevConfig.rememberApiKeyInSession,
        connectionStatus: "idle",
        connectionMessage: "已恢复上次配置，请重新执行连接测试。",
        connectionReport: null
      };
    }

    if (snapshot.profile) {
      draft.profile = {
        ...draft.profile,
        ...snapshot.profile
      };
    }

    if (snapshot.filters) {
      draft.filters = {
        ...draft.filters,
        ...snapshot.filters
      };
    }

    if (snapshot.references) {
      draft.references = {
        ...draft.references,
        ...snapshot.references
      };
    }

    if (snapshot.ideas) {
      draft.ideas = {
        ...draft.ideas,
        reference: {
          items: snapshot.ideas.reference?.items || [],
          meta: markMetaAsCached(snapshot.ideas.reference?.meta || null)
        },
        creative: {
          items: snapshot.ideas.creative?.items || [],
          meta: markMetaAsCached(snapshot.ideas.creative?.meta || null)
        },
        active: snapshot.ideas.active || draft.ideas.active
      };
    }

    if (snapshot.outputs) {
      draft.outputs = {
        ...draft.outputs,
        plansByIdea: Object.fromEntries(
          Object.entries(snapshot.outputs.plansByIdea || {}).map(([ideaId, bundle]) => [ideaId, markOutputBundleAsCached(bundle)])
        ),
        calendar: {
          entries: snapshot.outputs.calendar?.entries || [],
          snapshot: snapshot.outputs.calendar?.snapshot || null,
          meta: markMetaAsCached(snapshot.outputs.calendar?.meta || null),
          settings: {
            ...draft.outputs.calendar.settings,
            ...(snapshot.outputs.calendar?.settings || {})
          }
        }
      };
    }

    draft.workflow = {
      ...draft.workflow,
      status: "idle",
      startedAt: null,
      finishedAt: null,
      steps: createWorkflowSteps()
    };
    draft.requests = {};
    draft.ui.message = "已恢复上次工作区内容，当前结果标记为 cached result。";
    draft.ui.messageType = "info";
    draft.ui.errorPanel = null;
  });
}

export function getIdeaList(kind, stateValue = state) {
  return stateValue.ideas[kind]?.items || [];
}

export function getAllIdeas(stateValue = state) {
  return [...getIdeaList("reference", stateValue), ...getIdeaList("creative", stateValue)];
}

export function getActiveIdea(stateValue = state) {
  const { id, source } = stateValue.ideas.active;

  if (!id) {
    return null;
  }

  if (source && stateValue.ideas[source]) {
    return stateValue.ideas[source].items.find((idea) => idea.id === id) || null;
  }

  return getAllIdeas(stateValue).find((idea) => idea.id === id) || null;
}

export function getCurrentPlanBundle(stateValue = state) {
  const activeIdea = getActiveIdea(stateValue);

  if (!activeIdea) {
    return null;
  }

  return stateValue.outputs.plansByIdea[activeIdea.id] || null;
}
