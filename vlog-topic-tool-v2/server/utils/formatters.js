import { validateTaskOutput } from "./taskSchemas.js";

function safeParseJson(value) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error("模型返回的内容不是合法 JSON，请检查 prompt builder 或 response_format。");
  }
}

export function normalizeTaskOutput(taskType, rawValue) {
  const value = safeParseJson(rawValue);
  return validateTaskOutput(taskType, value);
}

export function buildTaskMeta({ taskType, payload }) {
  return {
    taskType,
    generatedAt: new Date().toISOString(),
    transport: "live",
    activeIdeaTitle: payload.activeIdea?.title || null,
    selectedReferenceCount: payload.references?.samples?.length || 0,
    usesReferenceData: Boolean(payload.references?.samples?.length),
    usesCreativeDraft: Boolean(payload.references?.creativeDraftText?.trim())
  };
}
