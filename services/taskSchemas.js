const legacyTaskMap = {
  "reference-ideas": "reference_ideas",
  "creative-ideas": "creative_ideas",
  script: "shooting_script",
  "shooting-advice": "shooting_advice",
  "full-plan": "full_plan",
  "calendar-summary": "calendar_summary"
};

const taskOutputSchemas = {
  reference_ideas: {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["id", "title", "referenceBasis", "scene", "platform", "recommendationReason"],
          properties: {
            id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            referenceBasis: { type: "string", minLength: 1 },
            scene: { type: "string", minLength: 1 },
            platform: { type: "string", minLength: 1 },
            recommendationReason: { type: "string", minLength: 1 }
          }
        }
      }
    }
  },
  creative_ideas: {
    type: "object",
    required: ["items", "recommendedId"],
    properties: {
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["id", "title", "highlight", "scene", "outcome", "difficulty", "platform", "recommendationReason"],
          properties: {
            id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            highlight: { type: "string", minLength: 1 },
            scene: { type: "string", minLength: 1 },
            outcome: { type: "string", minLength: 1 },
            difficulty: { type: "string", minLength: 1 },
            platform: { type: "string", minLength: 1 },
            recommendationReason: { type: "string", minLength: 1 }
          }
        }
      },
      recommendedId: { type: "string", minLength: 1 }
    }
  },
  shooting_script: {
    type: "object",
    required: ["titleSuggestions", "hook", "structure", "scriptSections", "subtitleKeywords"],
    properties: {
      titleSuggestions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      hook: { type: "string", minLength: 1 },
      structure: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      scriptSections: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["label", "content"],
          properties: {
            label: { type: "string", minLength: 1 },
            content: { type: "string", minLength: 1 }
          }
        }
      },
      subtitleKeywords: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      }
    }
  },
  shooting_advice: {
    type: "object",
    required: ["angles", "shotSuggestions", "notes", "broll"],
    properties: {
      angles: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      shotSuggestions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      notes: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      broll: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      }
    }
  },
  full_plan: {
    type: "object",
    required: [
      "titleSuggestions",
      "hook",
      "structure",
      "scriptSections",
      "subtitleKeywords",
      "angles",
      "shotSuggestions",
      "notes",
      "broll"
    ],
    properties: {
      titleSuggestions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      hook: { type: "string", minLength: 1 },
      structure: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      scriptSections: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["label", "content"],
          properties: {
            label: { type: "string", minLength: 1 },
            content: { type: "string", minLength: 1 }
          }
        }
      },
      subtitleKeywords: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      angles: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      shotSuggestions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      notes: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      broll: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      }
    }
  },
  calendar_summary: {
    type: "object",
    required: ["entries", "snapshot"],
    properties: {
      entries: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["id", "dateLabel", "title", "type", "platform", "goal", "reminder"],
          properties: {
            id: { type: "string", minLength: 1 },
            dateLabel: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            type: { type: "string", minLength: 1 },
            platform: { type: "string", minLength: 1 },
            goal: { type: "string", minLength: 1 },
            reminder: { type: "string", minLength: 1 }
          }
        }
      },
      snapshot: {
        type: "object",
        required: ["focus", "cadence", "distribution", "summary"],
        properties: {
          focus: { type: "string", minLength: 1 },
          cadence: { type: "string", minLength: 1 },
          distribution: { type: "string", minLength: 1 },
          summary: { type: "string", minLength: 1 }
        }
      }
    }
  }
};

const supportedTasks = new Set(Object.keys(taskOutputSchemas));

function createSchemaError(message, details = [], receivedPreview = null) {
  const error = new Error(message);
  error.code = "SCHEMA_VALIDATION_FAILED";
  error.details = details;
  error.receivedPreview = receivedPreview;
  return error;
}

function normalizeTaskName(task) {
  const normalized = String(task || "").trim();
  return legacyTaskMap[normalized] || normalized;
}

function sanitizeString(value) {
  return String(value ?? "").trim();
}

function sanitizePrimitive(schema, value) {
  if (schema.type === "string") {
    return sanitizeString(value);
  }

  if (schema.type === "number") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  if (schema.type === "boolean") {
    return Boolean(value);
  }

  return value;
}

function validateNode(schema, value, path, details) {
  const nodePath = path || "$";

  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      details.push({
        path: nodePath,
        message: "应为对象。"
      });
      return {};
    }

    const result = {};
    const properties = schema.properties || {};

    Object.entries(properties).forEach(([key, childSchema]) => {
      const childPath = nodePath === "$" ? key : `${nodePath}.${key}`;
      const childValue = value[key];
      const required = (schema.required || []).includes(key);

      if (childValue === undefined || childValue === null) {
        if (required) {
          details.push({
            path: childPath,
            message: "缺少必填字段。"
          });
        }
        return;
      }

      result[key] = validateNode(childSchema, childValue, childPath, details);

      if (childSchema.type === "string" && childSchema.minLength && !result[key]) {
        details.push({
          path: childPath,
          message: `字符串长度不能小于 ${childSchema.minLength}。`
        });
      }
    });

    return result;
  }

  if (schema.type === "array") {
    if (!Array.isArray(value)) {
      details.push({
        path: nodePath,
        message: "应为数组。"
      });
      return [];
    }

    const normalizedItems = value.map((item, index) =>
      validateNode(schema.items, item, `${nodePath}[${index}]`, details)
    );

    if (schema.minItems && normalizedItems.length < schema.minItems) {
      details.push({
        path: nodePath,
        message: `数组最少需要 ${schema.minItems} 项。`
      });
    }

    return normalizedItems.filter((item) => {
      if (typeof item === "string") {
        return Boolean(item);
      }

      if (item && typeof item === "object") {
        return Object.values(item).every((field) => Boolean(field));
      }

      return item !== null && item !== undefined;
    });
  }

  const sanitizedValue = sanitizePrimitive(schema, value);

  if (schema.type === "string" && schema.minLength && sanitizedValue.length < schema.minLength) {
    details.push({
      path: nodePath,
      message: `字符串长度不能小于 ${schema.minLength}。`
    });
  }

  return sanitizedValue;
}

function validateGenerateRequest(body = {}) {
  const task = normalizeTaskName(body.task || body.taskType);
  const payload = body.payload;
  const provider = String(body.provider || "openai").trim().toLowerCase();
  const providerOptions =
    body.providerOptions && typeof body.providerOptions === "object" && !Array.isArray(body.providerOptions)
      ? body.providerOptions
      : {};

  if (!supportedTasks.has(task)) {
    const error = new Error(`暂不支持任务 ${task || "unknown"}。`);
    error.code = "INVALID_REQUEST";
    throw error;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    const error = new Error("payload 必须是对象。");
    error.code = "INVALID_REQUEST";
    throw error;
  }

  return {
    provider,
    model: sanitizeString(body.model),
    apiKey: sanitizeString(body.apiKey),
    baseURL: sanitizeString(body.baseURL),
    task,
    payload,
    providerOptions: {
      headers:
        providerOptions.headers && typeof providerOptions.headers === "object" && !Array.isArray(providerOptions.headers)
          ? providerOptions.headers
          : {},
      timeoutMs: Number(providerOptions.timeoutMs || 0) || null,
      pathSuffix: sanitizeString(providerOptions.pathSuffix)
    }
  };
}

function validateBusinessRules(task, normalized, rawText = "") {
  const details = [];

  if (task === "creative_ideas") {
    const ids = new Set((normalized.items || []).map((item) => item.id));

    if (normalized.recommendedId && !ids.has(normalized.recommendedId)) {
      details.push({
        path: "recommendedId",
        message: "recommendedId 必须指向 items 中已存在的 id。"
      });
    }
  }

  if (["reference_ideas", "creative_ideas", "calendar_summary"].includes(task)) {
    const list = task === "calendar_summary" ? normalized.entries || [] : normalized.items || [];
    const ids = list.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      details.push({
        path: task === "calendar_summary" ? "entries" : "items",
        message: "列表中的 id 必须唯一。"
      });
    }
  }

  if (details.length) {
    throw createSchemaError("AI 返回结果通过了字段校验，但没有通过业务规则校验。", details, String(rawText || "").slice(0, 400));
  }
}

function normalizeTaskOutput(task, raw, rawText = "") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw createSchemaError("AI 返回结果不是对象，无法继续渲染。", [], String(rawText || "").slice(0, 400));
  }

  const schema = taskOutputSchemas[task];

  if (!schema) {
    return raw;
  }

  const details = [];
  const normalized = validateNode(schema, raw, "$", details);

  if (details.length) {
    throw createSchemaError("AI 返回结果未通过结构校验。", details, String(rawText || "").slice(0, 400));
  }

  validateBusinessRules(task, normalized, rawText);
  return normalized;
}

module.exports = {
  normalizeTaskName,
  normalizeTaskOutput,
  supportedTasks,
  taskOutputSchemas,
  validateGenerateRequest
};
