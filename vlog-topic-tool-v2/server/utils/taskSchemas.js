function previewValue(value) {
  if (typeof value === "string") {
    return value.slice(0, 320);
  }

  try {
    return JSON.stringify(value).slice(0, 320);
  } catch (error) {
    return "[unserializable]";
  }
}

function createValidationError(taskType, details, value) {
  const error = new Error("模型返回了 JSON，但结构不符合当前任务的预期格式。");
  error.code = "SCHEMA_VALIDATION_FAILED";
  error.taskType = taskType;
  error.details = details;
  error.receivedPreview = previewValue(value);
  return error;
}

function assertObject(value, path, details) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    details.push({ path, message: "必须是对象" });
    return {};
  }

  return value;
}

function assertString(value, path, details, { required = true } = {}) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized && required) {
    details.push({ path, message: "必须是非空字符串" });
  }

  return normalized;
}

function assertStringArray(value, path, details) {
  if (!Array.isArray(value)) {
    details.push({ path, message: "必须是字符串数组" });
    return [];
  }

  return value
    .map((item, index) => assertString(item, `${path}[${index}]`, details))
    .filter(Boolean);
}

function assertObjectArray(value, path, details) {
  if (!Array.isArray(value)) {
    details.push({ path, message: "必须是对象数组" });
    return [];
  }

  return value.map((item, index) => assertObject(item, `${path}[${index}]`, details));
}

function validateReferenceIdeas(value) {
  const details = [];
  const root = assertObject(value, "root", details);
  const items = assertObjectArray(root.items, "items", details).map((item, index) => ({
    id: assertString(item.id, `items[${index}].id`, details, { required: false }) || `reference-${index + 1}`,
    title: assertString(item.title, `items[${index}].title`, details),
    referenceBasis: assertString(item.referenceBasis, `items[${index}].referenceBasis`, details),
    scene: assertString(item.scene, `items[${index}].scene`, details),
    platform: assertString(item.platform, `items[${index}].platform`, details),
    recommendationReason: assertString(item.recommendationReason, `items[${index}].recommendationReason`, details)
  }));

  if (!items.length) {
    details.push({ path: "items", message: "至少需要返回 1 条参考选题" });
  }

  if (details.length) {
    throw createValidationError("reference-ideas", details, value);
  }

  return { items };
}

function validateCreativeIdeas(value) {
  const details = [];
  const root = assertObject(value, "root", details);
  const items = assertObjectArray(root.items, "items", details).map((item, index) => ({
    id: assertString(item.id, `items[${index}].id`, details, { required: false }) || `creative-${index + 1}`,
    title: assertString(item.title, `items[${index}].title`, details),
    highlight: assertString(item.highlight, `items[${index}].highlight`, details),
    scene: assertString(item.scene, `items[${index}].scene`, details),
    outcome: assertString(item.outcome, `items[${index}].outcome`, details),
    difficulty: assertString(item.difficulty, `items[${index}].difficulty`, details),
    platform: assertString(item.platform, `items[${index}].platform`, details),
    recommendationReason: assertString(item.recommendationReason, `items[${index}].recommendationReason`, details)
  }));

  if (!items.length) {
    details.push({ path: "items", message: "至少需要返回 1 条创意选题" });
  }

  if (details.length) {
    throw createValidationError("creative-ideas", details, value);
  }

  return {
    items,
    recommendedId: assertString(root.recommendedId, "recommendedId", details, { required: false }) || items[0]?.id || null
  };
}

function validateScriptLike(taskType, value) {
  const details = [];
  const root = assertObject(value, "root", details);
  const titleSuggestions = assertStringArray(root.titleSuggestions, "titleSuggestions", details);
  const hook = assertString(root.hook, "hook", details, { required: false });
  const structure = assertStringArray(root.structure, "structure", details);
  const scriptSections = assertObjectArray(root.scriptSections, "scriptSections", details).map((item, index) => ({
    label: assertString(item.label, `scriptSections[${index}].label`, details),
    content: assertString(item.content, `scriptSections[${index}].content`, details)
  }));
  const subtitleKeywords = assertStringArray(root.subtitleKeywords, "subtitleKeywords", details);

  if (!titleSuggestions.length && !hook && !structure.length && !scriptSections.length) {
    details.push({ path: "root", message: "脚本结果至少需要包含标题、Hook、结构或分段脚本中的一项" });
  }

  if (details.length) {
    throw createValidationError(taskType, details, value);
  }

  return {
    titleSuggestions,
    hook,
    structure,
    scriptSections,
    subtitleKeywords
  };
}

function validateShootingAdvice(taskType, value) {
  const details = [];
  const root = assertObject(value, "root", details);
  const angles = assertStringArray(root.angles, "angles", details);
  const shotSuggestions = assertStringArray(root.shotSuggestions, "shotSuggestions", details);
  const notes = assertStringArray(root.notes, "notes", details);
  const broll = assertStringArray(root.broll, "broll", details);

  if (!angles.length && !shotSuggestions.length && !notes.length && !broll.length) {
    details.push({ path: "root", message: "拍摄建议至少需要返回一个非空列表" });
  }

  if (details.length) {
    throw createValidationError(taskType, details, value);
  }

  return {
    angles,
    shotSuggestions,
    notes,
    broll
  };
}

function validateFullPlan(value) {
  const scriptPart = validateScriptLike("full-plan", value);
  const shootingPart = validateShootingAdvice("full-plan", value);

  return {
    ...scriptPart,
    ...shootingPart
  };
}

function validateCalendarSummary(value) {
  const details = [];
  const root = assertObject(value, "root", details);
  const entries = assertObjectArray(root.entries, "entries", details).map((item, index) => ({
    id: assertString(item.id, `entries[${index}].id`, details, { required: false }) || `calendar-${index + 1}`,
    dateLabel: assertString(item.dateLabel, `entries[${index}].dateLabel`, details),
    title: assertString(item.title, `entries[${index}].title`, details),
    type: assertString(item.type, `entries[${index}].type`, details),
    platform: assertString(item.platform, `entries[${index}].platform`, details),
    goal: assertString(item.goal, `entries[${index}].goal`, details),
    reminder: assertString(item.reminder, `entries[${index}].reminder`, details)
  }));
  const snapshot = assertObject(root.snapshot, "snapshot", details);

  const normalizedSnapshot = {
    focus: assertString(snapshot.focus, "snapshot.focus", details),
    cadence: assertString(snapshot.cadence, "snapshot.cadence", details),
    distribution: assertString(snapshot.distribution, "snapshot.distribution", details),
    summary: assertString(snapshot.summary, "snapshot.summary", details)
  };

  if (!entries.length) {
    details.push({ path: "entries", message: "至少需要返回 1 条日历安排" });
  }

  if (details.length) {
    throw createValidationError("calendar-summary", details, value);
  }

  return {
    entries,
    snapshot: normalizedSnapshot
  };
}

export function validateTaskOutput(taskType, value) {
  switch (taskType) {
    case "reference-ideas":
      return validateReferenceIdeas(value);
    case "creative-ideas":
      return validateCreativeIdeas(value);
    case "script":
      return validateScriptLike("script", value);
    case "shooting-advice":
      return validateShootingAdvice("shooting-advice", value);
    case "full-plan":
      return validateFullPlan(value);
    case "calendar-summary":
      return validateCalendarSummary(value);
    default:
      return value;
  }
}
