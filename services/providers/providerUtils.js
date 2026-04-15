const DEFAULT_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);
const DEFAULT_TEST_TIMEOUT_MS = Number(process.env.AI_TEST_TIMEOUT_MS || 15000);
const DEFAULT_GENERATE_TIMEOUT_MS = Number(process.env.AI_GENERATE_TIMEOUT_MS || 90000);

const standardizedErrorCodes = {
  MISSING_API_KEY: "MISSING_API_KEY",
  INVALID_BASE_URL: "INVALID_BASE_URL",
  AUTH_FAILED: "AUTH_FAILED",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  REQUEST_TIMEOUT: "REQUEST_TIMEOUT",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_PROVIDER_RESPONSE: "INVALID_PROVIDER_RESPONSE",
  PROVIDER_BUSINESS_ERROR: "PROVIDER_BUSINESS_ERROR"
};

function createProviderError(code, message, details = [], extras = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  Object.assign(error, extras);
  return error;
}

function ensureString(value, fallback = "") {
  return String(value || fallback || "").trim();
}

function preferServerManagedCredentials(options = {}) {
  if (typeof options.preferServerManagedCredentials === "boolean") {
    return options.preferServerManagedCredentials;
  }

  return process.env.AI_RUN_MODE === "server-managed";
}

function normalizeBaseURL(value) {
  return ensureString(value).replace(/\/+$/, "");
}

function normalizePathSuffix(value) {
  const trimmed = ensureString(value);

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function resolveTimeoutMs(value, fallback = DEFAULT_TIMEOUT_MS) {
  const timeoutValue = Number(value);
  return Number.isFinite(timeoutValue) && timeoutValue > 0 ? timeoutValue : fallback;
}

function resolveRouteTimeoutMs(providerOptions = {}, routeKind = "request") {
  if (routeKind === "test") {
    return resolveTimeoutMs(providerOptions.testTimeoutMs ?? providerOptions.timeoutMs, DEFAULT_TEST_TIMEOUT_MS);
  }

  if (routeKind === "generate") {
    return resolveTimeoutMs(providerOptions.generateTimeoutMs ?? providerOptions.timeoutMs, DEFAULT_GENERATE_TIMEOUT_MS);
  }

  return resolveTimeoutMs(providerOptions.timeoutMs, DEFAULT_TIMEOUT_MS);
}

function isTimeoutError(error) {
  const name = String(error?.name || "").trim().toLowerCase();
  const code = String(error?.code || "").trim().toLowerCase();
  const message = String(error?.message || "").trim().toLowerCase();

  return (
    name.includes("timeout") ||
    name === "aborterror" ||
    code === "abort_err" ||
    code === "timeout" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("signal timed out")
  );
}

function buildProviderHeaders(apiKey, extraHeaders = {}) {
  const normalizedExtraHeaders = Object.entries(extraHeaders || {}).reduce((result, [key, value]) => {
    if (!key) {
      return result;
    }

    result[key] = String(value);
    return result;
  }, {});

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...normalizedExtraHeaders
  };
}

function parseErrorText(rawText) {
  try {
    const parsed = JSON.parse(rawText);
    return parsed?.error?.message || parsed?.message || rawText;
  } catch (_error) {
    return rawText;
  }
}

function mapResponseError(response, message, context = {}) {
  const loweredMessage = String(message || "").toLowerCase();
  const routeType = context.routeType || "";

  if (response.status === 401 || response.status === 403) {
    return createProviderError(standardizedErrorCodes.AUTH_FAILED, message || "认证失败，请检查 API Key。", [], context);
  }

  if (response.status === 429) {
    return createProviderError(standardizedErrorCodes.RATE_LIMITED, message || "请求过于频繁，请稍后再试。", [], context);
  }

  if (response.status === 408 || response.status === 504) {
    return createProviderError(
      standardizedErrorCodes.REQUEST_TIMEOUT,
      message || "模型响应时间过长，请稍后重试，或减少输入内容长度。",
      [],
      {
        ...context,
        timedOut: true
      }
    );
  }

  if (response.status === 404 && routeType === "models") {
    return createProviderError(
      standardizedErrorCodes.INVALID_BASE_URL,
      message || "Base URL 无法访问 /models，请检查兼容接口地址是否正确。",
      [],
      context
    );
  }

  if (response.status === 404 || loweredMessage.includes("model") || loweredMessage.includes("模型")) {
    return createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, message || "模型不存在或当前账号无权访问该模型。", [], context);
  }

  return createProviderError(
    standardizedErrorCodes.NETWORK_ERROR,
    message || `Provider 请求失败，状态码 ${response.status}。`,
    [],
    context
  );
}

function resolveProviderConfig(config = {}, options = {}) {
  const preferEnv = preferServerManagedCredentials(options);
  const envApiKey = process.env[options.envApiKeyName || ""] || "";
  const envBaseURL = process.env[options.envBaseURLName || ""] || "";
  const envModel = process.env[options.envModelName || ""] || "";
  const apiKey = preferEnv ? ensureString(envApiKey, config.apiKey) : ensureString(config.apiKey, envApiKey);
  const baseURL = normalizeBaseURL(
    preferEnv
      ? ensureString(envBaseURL, config.baseURL || options.defaultBaseURL || "")
      : ensureString(config.baseURL, envBaseURL || options.defaultBaseURL || "")
  );
  const model = preferEnv
    ? ensureString(envModel, config.model || options.defaultModel || "")
    : ensureString(config.model, envModel || options.defaultModel || "");
  const providerOptions = config.providerOptions || {};
  const timeoutMs = resolveRouteTimeoutMs(providerOptions, options.routeKind || "request");
  const pathSuffix = normalizePathSuffix(providerOptions.pathSuffix || options.defaultPathSuffix || "");
  const extraHeaders =
    providerOptions.headers && typeof providerOptions.headers === "object" && !Array.isArray(providerOptions.headers)
      ? providerOptions.headers
      : {};

  if (!apiKey) {
    throw createProviderError(standardizedErrorCodes.MISSING_API_KEY, "缺少 API Key，请先填写后再发起连接或生成。");
  }

  if (!baseURL) {
    throw createProviderError(standardizedErrorCodes.INVALID_BASE_URL, "缺少 Base URL，请先填写有效的接口地址。");
  }

  try {
    const parsed = new URL(baseURL);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("unsupported");
    }
  } catch (_error) {
    throw createProviderError(standardizedErrorCodes.INVALID_BASE_URL, "Base URL 无效，请输入完整的 http(s) 地址。");
  }

  return {
    apiKey,
    baseURL,
    model,
    timeoutMs,
    pathSuffix,
    extraHeaders
  };
}

function buildEndpoint(baseURL, pathSuffix, routePath) {
  return `${normalizeBaseURL(baseURL)}${normalizePathSuffix(pathSuffix)}${routePath}`;
}

function resolveContent(messageContent) {
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item?.type === "text" && typeof item.text === "string") {
          return item.text;
        }

        return item?.text || item?.content || "";
      })
      .join("\n");
  }

  return typeof messageContent === "string" ? messageContent : "";
}

function stripCodeFence(rawText) {
  const text = String(rawText || "").trim();

  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJSONObject(rawText) {
  const text = stripCodeFence(rawText);
  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw createProviderError(standardizedErrorCodes.INVALID_PROVIDER_RESPONSE, "模型返回了内容，但没有找到有效 JSON。", [], {
      receivedPreview: text.slice(0, 400)
    });
  }

  return text.slice(startIndex, endIndex + 1);
}

function parseJsonResponse(rawText) {
  try {
    return JSON.parse(extractJSONObject(rawText));
  } catch (error) {
    if (error.code === standardizedErrorCodes.INVALID_PROVIDER_RESPONSE) {
      throw error;
    }

    throw createProviderError(standardizedErrorCodes.INVALID_PROVIDER_RESPONSE, "模型返回的 JSON 无法解析。", [], {
      receivedPreview: String(rawText || "").slice(0, 400)
    });
  }
}

async function safeJson(response) {
  const rawText = await response.text().catch(() => "");

  try {
    return {
      rawText,
      json: JSON.parse(rawText)
    };
  } catch (_error) {
    return {
      rawText,
      json: null
    };
  }
}

module.exports = {
  buildEndpoint,
  buildProviderHeaders,
  createProviderError,
  ensureString,
  mapResponseError,
  parseErrorText,
  parseJsonResponse,
  resolveContent,
  resolveProviderConfig,
  resolveRouteTimeoutMs,
  resolveTimeoutMs,
  safeJson,
  standardizedErrorCodes,
  isTimeoutError
};
