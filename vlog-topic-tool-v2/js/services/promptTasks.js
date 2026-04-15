import { getActiveIdea, getAllIdeas, getIdeaList } from "../state.js";

const taskRegistry = {
  referenceIdeas: {
    label: "生成参考选题",
    task: "reference_ideas"
  },
  creativeIdeas: {
    label: "生成创意选题",
    task: "creative_ideas"
  },
  script: {
    label: "生成脚本",
    task: "shooting_script",
    requiresActiveIdea: true
  },
  shootingAdvice: {
    label: "生成拍摄建议",
    task: "shooting_advice",
    requiresActiveIdea: true
  },
  fullPlan: {
    label: "生成完整拍摄方案",
    task: "full_plan",
    requiresActiveIdea: true
  },
  calendarSummary: {
    label: "生成日历摘要",
    task: "calendar_summary",
    requiresIdeas: true
  }
};

export function getTaskLabel(taskKey) {
  return taskRegistry[taskKey]?.label || taskKey;
}

export function isConnectionReady(state) {
  return ["success", "mock"].includes(state.devConfig.connectionStatus);
}

export function isTaskDisabled(taskKey, state) {
  const task = taskRegistry[taskKey];

  if (!task) {
    return true;
  }

  if (!isConnectionReady(state)) {
    return true;
  }

  if (state.requests[taskKey]?.status === "loading") {
    return true;
  }

  if (task.requiresActiveIdea && !getActiveIdea(state)) {
    return true;
  }

  if (task.requiresIdeas && !getAllIdeas(state).length) {
    return true;
  }

  return false;
}

function buildSharedPayload(state) {
  return {
    profile: state.profile,
    filters: state.filters,
    references: {
      benchmarkRawText: state.references.benchmarkRawText,
      creativeDraftText: state.references.creativeDraftText,
      samples: state.references.samples,
      preferredId: state.references.preferredId
    },
    referenceIdeas: getIdeaList("reference", state),
    creativeIdeas: getIdeaList("creative", state),
    activeIdea: getActiveIdea(state),
    calendarSettings: state.outputs.calendar.settings
  };
}

export function buildTaskRequest(taskKey, state) {
  const task = taskRegistry[taskKey];

  if (!task || isTaskDisabled(taskKey, state)) {
    return null;
  }

  return {
    taskKey,
    task: task.task,
    label: task.label,
    endpoint: state.devConfig.backendEndpoint,
    payload: buildSharedPayload(state)
  };
}
