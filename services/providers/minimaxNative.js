const {
  buildEndpoint,
  buildProviderHeaders,
  createProviderError,
  isTimeoutError,
  parseJsonResponse,
  resolveContent,
  resolveProviderConfig,
  safeJson,
  standardizedErrorCodes
} = require("./providerUtils");

const MINIMAX_NATIVE_DEFAULT_BASE_URL = "https://api.minimaxi.com/v1";
const MINIMAX_NATIVE_DEFAULT_MODEL = process.env.MINIMAX_NATIVE_MODEL || "MiniMax-M2.7";
const MINIMAX_NATIVE_COMPLETION_PATH = "/text/chatcompletion_v2";
const MINIMAX_NATIVE_RETRY_DELAYS_MS = [1000, 3000];
const MINIMAX_NATIVE_TRANSIENT_RETRY_DELAY_MS = 1000;

function buildMeta({ resolved, latencyMs, endpoint, retryCount = 0, timedOut = false, retryReason = null }) {
  return {
    provider: "minimax_native",
    model: resolved.model || "未指定模型",
    baseURL: resolved.baseURL,
    endpoint,
    latencyMs,
    source: "real",
    retryCount,
    retried: retryCount > 0,
    timedOut,
    retryReason
  };
}

function extractBusinessError(payload = {}) {
  const statusCode = Number(payload?.base_resp?.status_code || 0);
  const statusMessage = String(payload?.base_resp?.status_msg || "").trim();

  if (statusCode && statusCode !== 0) {
    return {
      code: statusCode,
      message: statusMessage || "provider business error"
    };
  }

  return null;
}

function buildProviderRaw(payload, rawText) {
  if (payload && typeof payload === "object") {
    return payload;
  }

  return rawText || null;
}

function resolveErrorMessage(payload, rawText, fallback = "MiniMax Native 请求失败。") {
  return (
    payload?.error?.message ||
    payload?.message ||
    payload?.base_resp?.status_msg ||
    String(rawText || "").trim() ||
    fallback
  );
}

function isMinimaxOverloaded(response, payload = {}) {
  const providerErrorType = String(payload?.error?.type || "").trim().toLowerCase();
  const providerHttpCode = Number(payload?.error?.http_code || 0);

  return response.status === 529 || providerHttpCode === 529 || providerErrorType === "overloaded_error";
}

function mapMinimaxNativeError(response, payload, rawText, context = {}) {
  const message = resolveErrorMessage(payload, rawText);
  const loweredMessage = message.toLowerCase();
  const providerErrorType = String(payload?.error?.type || "").trim().toLowerCase();
  const providerHttpCode = Number(payload?.error?.http_code || 0);
  const providerRaw = buildProviderRaw(payload, rawText);
  const extras = {
    ...context,
    receivedPreview: String(rawText || "").slice(0, 400),
    providerRaw
  };

  if (response.status === 401 || response.status === 403 || loweredMessage.includes("api key") || loweredMessage.includes("authorized")) {
    return createProviderError(standardizedErrorCodes.AUTH_FAILED, message, [], extras);
  }

  if (response.status === 404) {
    return createProviderError(standardizedErrorCodes.INVALID_BASE_URL, message || "MiniMax Native 接口地址不存在。", [], extras);
  }

  if (response.status === 429) {
    return createProviderError(standardizedErrorCodes.RATE_LIMITED, message || "MiniMax Native 返回限流。", [], extras);
  }

  if (response.status === 408 || response.status === 504 || loweredMessage.includes("timeout")) {
    return createProviderError(
      standardizedErrorCodes.REQUEST_TIMEOUT,
      message || "MiniMax Native 响应时间过长，请稍后重试，或减少输入内容长度。",
      [],
      {
        ...extras,
        timedOut: true
      }
    );
  }

  if (response.status === 529 || providerHttpCode === 529 || providerErrorType === "overloaded_error") {
    return createProviderError(standardizedErrorCodes.PROVIDER_BUSINESS_ERROR, message, [], extras);
  }

  if (loweredMessage.includes("model") || loweredMessage.includes("模型")) {
    return createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, message, [], extras);
  }

  return createProviderError(standardizedErrorCodes.NETWORK_ERROR, message, [], extras);
}

function createInvalidResponseError(message, context = {}, providerRaw = null, rawText = "") {
  return createProviderError(standardizedErrorCodes.INVALID_PROVIDER_RESPONSE, message, [], {
    ...context,
    providerRaw,
    receivedPreview: String(rawText || "").slice(0, 400)
  });
}

function buildMessages(systemPrompt = "", userPrompt = "") {
  return [
    {
      role: "system",
      name: "Vlog Workflow Director",
      content: String(systemPrompt || "").trim() || "You are a helpful AI assistant."
    },
    {
      role: "user",
      name: "Creator",
      content: String(userPrompt || "").trim()
    }
  ];
}

function buildNativeRequestBody({ model, temperature, systemPrompt, userPrompt }) {
  const body = {
    model,
    temperature,
    stream: false,
    messages: buildMessages(systemPrompt, userPrompt)
  };

  return body;
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function performMinimaxNativeRequest(resolved, requestBody, context = {}) {
  const endpoint = buildEndpoint(resolved.baseURL, resolved.pathSuffix, MINIMAX_NATIVE_COMPLETION_PATH);
  const startedAt = Date.now();
  let overloadRetryCount = 0;
  let transientRetryCount = 0;
  let retryReason = null;

  while (true) {
    const retryCount = overloadRetryCount + transientRetryCount;
    let response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: buildProviderHeaders(resolved.apiKey, {}),
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(resolved.timeoutMs)
      });
    } catch (error) {
      const latencyMs = Date.now() - startedAt;

      if (isTimeoutError(error)) {
        if (context.allowTransientRetry && transientRetryCount < 1) {
          transientRetryCount += 1;
          retryReason = "timeout";
          await sleep(MINIMAX_NATIVE_TRANSIENT_RETRY_DELAY_MS);
          continue;
        }

        throw createProviderError(
          standardizedErrorCodes.REQUEST_TIMEOUT,
          "MiniMax Native 响应时间过长，请稍后重试，或减少输入内容长度。",
          [],
          {
            ...context,
            endpoint,
            latencyMs,
            source: "real",
            retryCount,
            retried: retryCount > 0,
            timedOut: true,
            retryReason: retryReason || "timeout"
          }
        );
      }

      if (context.allowTransientRetry && transientRetryCount < 1) {
        transientRetryCount += 1;
        retryReason = "network";
        await sleep(MINIMAX_NATIVE_TRANSIENT_RETRY_DELAY_MS);
        continue;
      }

      throw createProviderError(
        standardizedErrorCodes.NETWORK_ERROR,
        "MiniMax Native 无法连接，请检查网络、Base URL 或服务可用性。",
        [],
        {
          ...context,
          endpoint,
          latencyMs,
          source: "real",
          retryCount,
          retried: retryCount > 0,
          timedOut: false,
          retryReason
        }
      );
    }

    const latencyMs = Date.now() - startedAt;
    const { rawText, json } = await safeJson(response);
    const providerRaw = buildProviderRaw(json, rawText);
    const meta = buildMeta({
      resolved,
      latencyMs,
      endpoint,
      retryCount,
      timedOut: false,
      retryReason
    });

    if (!response.ok) {
      if (isMinimaxOverloaded(response, json) && overloadRetryCount < MINIMAX_NATIVE_RETRY_DELAYS_MS.length) {
        retryReason = "provider_overload";
        await sleep(MINIMAX_NATIVE_RETRY_DELAYS_MS[overloadRetryCount]);
        overloadRetryCount += 1;
        continue;
      }

      throw mapMinimaxNativeError(response, json, rawText, meta);
    }

    const providerBusinessError = extractBusinessError(json);

    if (providerBusinessError) {
      throw createProviderError(
        standardizedErrorCodes.PROVIDER_BUSINESS_ERROR,
        `MiniMax Native 返回业务错误：${providerBusinessError.message}`,
        [
          {
            code: providerBusinessError.code,
            message: providerBusinessError.message
          }
        ],
        {
          ...meta,
          providerRaw,
          receivedPreview: String(rawText || "").slice(0, 400)
        }
      );
    }

    return {
      payload: json,
      rawText,
      providerRaw,
      ...meta
    };
  }
}

function resolveGeneratedContent(payload = {}) {
  const contentFromChoices = resolveContent(payload?.choices?.[0]?.message?.content);

  if (contentFromChoices) {
    return contentFromChoices;
  }

  return String(payload?.reply || payload?.output || "").trim();
}

function resolveMinimaxNativeConfig(config = {}, routeKind = "generate") {
  return resolveProviderConfig(config, {
    envApiKeyName: "MINIMAX_NATIVE_API_KEY",
    envBaseURLName: "MINIMAX_NATIVE_BASE_URL",
    envModelName: "MINIMAX_NATIVE_MODEL",
    defaultBaseURL: MINIMAX_NATIVE_DEFAULT_BASE_URL,
    defaultModel: MINIMAX_NATIVE_DEFAULT_MODEL,
    defaultPathSuffix: "",
    routeKind
  });
}

async function testMinimaxNativeConnection(config = {}) {
  const resolved = resolveMinimaxNativeConfig(config, "test");

  if (!resolved.model) {
    throw createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, "缺少模型名称，请先填写 model。");
  }

  const result = await performMinimaxNativeRequest(
    resolved,
    buildNativeRequestBody({
      model: resolved.model,
      temperature: 0.1,
      systemPrompt: "You are a connection test assistant.",
      userPrompt: "Reply with OK."
    }),
    {
      provider: "minimax_native",
      model: resolved.model,
      baseURL: resolved.baseURL,
      allowTransientRetry: false
    }
  );

  const generatedContent = resolveGeneratedContent(result.payload);

  if (!generatedContent) {
    throw createInvalidResponseError("MiniMax Native 返回成功，但没有可解析的文本内容。", result, result.providerRaw, result.rawText);
  }

  return {
    available: true,
    errorCode: null,
    message: "MiniMax Native 可用，可以开始生成。",
    providerRaw: result.providerRaw,
    ...result
  };
}

async function generateWithMinimaxNative(config = {}) {
  const resolved = resolveMinimaxNativeConfig(config, "generate");

  if (!resolved.model) {
    throw createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, "缺少模型名称，请先填写 model。");
  }

  const result = await performMinimaxNativeRequest(
    resolved,
    buildNativeRequestBody({
      model: resolved.model,
      temperature: Number(config.promptPackage?.temperature ?? 0.7),
      systemPrompt: config.promptPackage?.systemPrompt,
      userPrompt: config.promptPackage?.userPrompt
    }),
    {
      provider: "minimax_native",
      model: resolved.model,
      baseURL: resolved.baseURL,
      task: config.promptPackage?.task || "generate",
      allowTransientRetry: true
    }
  );

  const generatedContent = resolveGeneratedContent(result.payload);

  if (!generatedContent) {
    throw createInvalidResponseError("MiniMax Native 返回成功，但没有可解析的文本内容。", result, result.providerRaw, result.rawText);
  }

  return {
    parsed: parseJsonResponse(generatedContent),
    rawText: generatedContent,
    providerRaw: result.providerRaw,
    ...result
  };
}

module.exports = {
  generateWithMinimaxNative,
  testMinimaxNativeConnection,
  MINIMAX_NATIVE_COMPLETION_PATH,
  MINIMAX_NATIVE_DEFAULT_BASE_URL,
  MINIMAX_NATIVE_DEFAULT_MODEL
};
