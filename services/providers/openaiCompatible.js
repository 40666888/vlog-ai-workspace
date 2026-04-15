const {
  buildEndpoint,
  buildProviderHeaders,
  createProviderError,
  mapResponseError,
  parseErrorText,
  parseJsonResponse,
  resolveContent,
  resolveProviderConfig,
  safeJson,
  standardizedErrorCodes
} = require("./providerUtils");

function buildMeta({ provider, resolved, latencyMs }) {
  return {
    provider,
    model: resolved.model || "未指定模型",
    baseURL: resolved.baseURL,
    latencyMs
  };
}

function resolveConnectionMode(config = {}, options = {}) {
  return String(config.providerOptions?.testConnectionMode || options.testConnectionMode || "models").trim().toLowerCase();
}

function resolveCompletionPath(config = {}, options = {}) {
  return String(config.providerOptions?.completionPath || options.completionPath || "/chat/completions").trim() || "/chat/completions";
}

function extractProviderBusinessError(payload = {}) {
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

async function performRequest(url, requestInit, context = {}) {
  const startedAt = Date.now();
  let response;

  try {
    response = await fetch(url, requestInit);
  } catch (_error) {
    throw createProviderError(
      standardizedErrorCodes.NETWORK_ERROR,
      `${context.providerLabel || "AI Provider"} 无法连接，请检查网络、Base URL 或服务可用性。`,
      [],
      {
        ...context,
        latencyMs: Date.now() - startedAt
      }
    );
  }

  const latencyMs = Date.now() - startedAt;

  if (!response.ok) {
    const { rawText } = await safeJson(response);
    const message = parseErrorText(rawText);
    throw mapResponseError(response, message, {
      ...context,
      latencyMs
    });
  }

  return {
    response,
    latencyMs
  };
}

async function testOpenAICompatibleConnection(config = {}, options = {}) {
  const resolved = resolveProviderConfig(config, options);
  const providerLabel = options.providerLabel || "OpenAI Compatible";
  const connectionMode = resolveConnectionMode(config, options);

  if (connectionMode === "chat") {
    if (!resolved.model) {
      throw createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, "缺少模型名称，请先填写 model。");
    }

    const completionUrl = buildEndpoint(resolved.baseURL, resolved.pathSuffix, resolveCompletionPath(config, options));
    const { response, latencyMs } = await performRequest(
      completionUrl,
      {
        method: "POST",
        headers: buildProviderHeaders(resolved.apiKey, resolved.extraHeaders),
        body: JSON.stringify({
          model: resolved.model,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: "Reply with OK."
            }
          ]
        }),
        signal: AbortSignal.timeout(resolved.timeoutMs)
      },
      {
        providerLabel,
        provider: config.provider || "openai_compatible",
        model: resolved.model,
        baseURL: resolved.baseURL,
        routeType: "chat_completions"
      }
    );

    const payload = await response.json().catch(() => null);
    const providerBusinessError = extractProviderBusinessError(payload);

    if (providerBusinessError) {
      throw createProviderError(
        standardizedErrorCodes.PROVIDER_BUSINESS_ERROR,
        `${providerLabel} 返回业务错误：${providerBusinessError.message}`,
        [
          {
            code: providerBusinessError.code,
            message: providerBusinessError.message
          }
        ],
        {
          ...buildMeta({
            provider: config.provider || "openai_compatible",
            resolved,
            latencyMs
          }),
          receivedPreview: JSON.stringify(payload).slice(0, 400)
        }
      );
    }

    return {
      available: true,
      errorCode: null,
      message: `${providerLabel} 可用，可以开始生成。`,
      ...buildMeta({
        provider: config.provider || "openai_compatible",
        resolved,
        latencyMs
      })
    };
  }

  const listModelsUrl = buildEndpoint(resolved.baseURL, resolved.pathSuffix, "/models");
  const requestInit = {
    method: "GET",
    headers: buildProviderHeaders(resolved.apiKey, resolved.extraHeaders),
    signal: AbortSignal.timeout(resolved.timeoutMs)
  };
  const { response, latencyMs } = await performRequest(listModelsUrl, requestInit, {
    providerLabel,
    provider: config.provider || "openai_compatible",
    model: resolved.model,
    baseURL: resolved.baseURL,
    routeType: "models"
  });
  const { json } = await safeJson(response);
  const models = Array.isArray(json?.data)
    ? json.data.map((item) => String(item?.id || "").trim()).filter(Boolean)
    : [];

  if (resolved.model && models.length && !models.includes(resolved.model)) {
    throw createProviderError(
      standardizedErrorCodes.MODEL_NOT_FOUND,
      `当前 provider 未返回模型 ${resolved.model}，请检查 model 是否正确。`,
      [],
      buildMeta({
        provider: config.provider || "openai_compatible",
        resolved,
        latencyMs
      })
    );
  }

  return {
    available: true,
    errorCode: null,
    message: `${providerLabel} 可用，可以开始生成。`,
    ...buildMeta({
      provider: config.provider || "openai_compatible",
      resolved,
      latencyMs
    })
  };
}

async function requestChatCompletion(config = {}, options = {}) {
  const resolved = resolveProviderConfig(config, options);

  if (!resolved.model) {
    throw createProviderError(standardizedErrorCodes.MODEL_NOT_FOUND, "缺少模型名称，请先填写 model。");
  }

  const requestBody = {
    model: resolved.model,
    temperature: Number(config.promptPackage?.temperature ?? 0.7),
    messages: [
      {
        role: "system",
        content: config.promptPackage.systemPrompt
      },
      {
        role: "user",
        content: config.promptPackage.userPrompt
      }
    ]
  };

  if (options.supportJsonMode) {
    requestBody.response_format = {
      type: "json_object"
    };
  }

  const completionUrl = buildEndpoint(resolved.baseURL, resolved.pathSuffix, resolveCompletionPath(config, options));
  const { response, latencyMs } = await performRequest(
    completionUrl,
    {
      method: "POST",
      headers: buildProviderHeaders(resolved.apiKey, resolved.extraHeaders),
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(resolved.timeoutMs)
    },
    {
      providerLabel: options.providerLabel || "OpenAI Compatible",
      provider: config.provider || "openai_compatible",
      model: resolved.model,
      baseURL: resolved.baseURL,
      routeType: "chat_completions"
    }
  );
  const completion = await response.json().catch(() => null);
  const providerBusinessError = extractProviderBusinessError(completion);

  if (providerBusinessError) {
    throw createProviderError(
      standardizedErrorCodes.PROVIDER_BUSINESS_ERROR,
      `${options.providerLabel || "OpenAI Compatible"} 返回业务错误：${providerBusinessError.message}`,
      [
        {
          code: providerBusinessError.code,
          message: providerBusinessError.message
        }
      ],
      {
        ...buildMeta({
          provider: config.provider || "openai_compatible",
          resolved,
          latencyMs
        }),
        receivedPreview: JSON.stringify(completion).slice(0, 400)
      }
    );
  }

  const rawText = resolveContent(completion?.choices?.[0]?.message?.content);

  if (!rawText) {
    throw createProviderError(
      standardizedErrorCodes.INVALID_PROVIDER_RESPONSE,
      "模型返回成功，但没有可解析的文本内容。",
      [],
      buildMeta({
        provider: config.provider || "openai_compatible",
        resolved,
        latencyMs
      })
    );
  }

  return {
    parsed: parseJsonResponse(rawText),
    rawText,
    ...buildMeta({
      provider: config.provider || "openai_compatible",
      resolved,
      latencyMs
    })
  };
}

async function generateWithOpenAICompatible(config = {}) {
  return requestChatCompletion(config, {
    providerLabel: "OpenAI Compatible",
    envApiKeyName: "OPENAI_COMPATIBLE_API_KEY",
    envBaseURLName: "OPENAI_COMPATIBLE_BASE_URL",
    envModelName: "OPENAI_COMPATIBLE_MODEL",
    defaultBaseURL: "",
    defaultModel: "",
    defaultPathSuffix: "",
    supportJsonMode: false
  });
}

module.exports = {
  generateWithOpenAICompatible,
  requestChatCompletion,
  testOpenAICompatibleConnection
};
