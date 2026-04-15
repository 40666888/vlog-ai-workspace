import { buildMockTaskResult } from "./mockAi.js";

const providerLabelMap = {
  openai: "OpenAI",
  openai_compatible: "OpenAI Compatible",
  minimax_native: "MiniMax Native"
};

function resolveProviderLabel(provider) {
  return providerLabelMap[provider] || provider || "AI Provider";
}

function createApiError(errorPayload = {}, fallbackMessage = "请求失败", envelope = {}) {
  const error = new Error(errorPayload.message || fallbackMessage);
  error.code = errorPayload.code || envelope.errorCode || "API_ERROR";
  error.details = errorPayload.details || [];
  error.task = errorPayload.task || null;
  error.receivedPreview = errorPayload.receivedPreview || null;
  error.provider = envelope.provider || null;
  error.model = envelope.model || null;
  error.baseURL = envelope.baseURL || null;
  error.endpoint = envelope.endpoint || null;
  error.available = envelope.available ?? null;
  error.latencyMs = envelope.latencyMs ?? null;
  error.transport = envelope.transport || null;
  error.source = envelope.source || null;
  return error;
}

function resolveConnectionEndpoint(generateEndpoint) {
  const trimmed = String(generateEndpoint || "/api/generate").trim();

  if (trimmed.endsWith("/generate")) {
    return `${trimmed.slice(0, -"/generate".length)}/test-connection`;
  }

  return `${trimmed.replace(/\/$/, "")}/test-connection`;
}

function resolveRuntimeConfigEndpoint(generateEndpoint) {
  const trimmed = String(generateEndpoint || "/api/generate").trim();

  if (trimmed.endsWith("/generate")) {
    return `${trimmed.slice(0, -"/generate".length)}/runtime-config`;
  }

  return `${trimmed.replace(/\/$/, "")}/runtime-config`;
}

function buildConnectionPayload(devConfig) {
  return {
    preset: devConfig.preset,
    provider: devConfig.provider,
    model: devConfig.model,
    apiKey: devConfig.apiKey,
    baseURL: devConfig.baseURL,
    providerOptions: devConfig.providerOptions || {}
  };
}

function createMockConnectionResult(devConfig, error) {
  return {
    ok: true,
    provider: devConfig.provider,
    model: devConfig.model || "browser-mock",
    baseURL: devConfig.baseURL || "",
    endpoint: devConfig.provider === "minimax_native" ? "/text/chatcompletion_v2" : null,
    available: false,
    latencyMs: error?.latencyMs ?? null,
    errorCode: error?.code || "NETWORK_ERROR",
    transport: "mock",
    message: `${resolveProviderLabel(devConfig.provider)} 暂时不可用，已启用 Mock Fallback。${error?.message ? ` 原因：${error.message}` : ""}`
  };
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export async function fetchRuntimeConfig(generateEndpoint = "/api/generate") {
  try {
    const response = await fetch(resolveRuntimeConfigEndpoint(generateEndpoint), {
      headers: {
        "Content-Type": "application/json"
      }
    });
    const json = await readJson(response);

    if (!response.ok || !json?.ok) {
      throw new Error("runtime-config unavailable");
    }

    return json;
  } catch (_error) {
    return {
      ok: false,
      mode: "local-dev",
      allowFrontendApiKeyInput: true,
      providers: {},
      presets: {},
      serverCredentials: {}
    };
  }
}

export async function testConnection(devConfig) {
  let response;

  try {
    response = await fetch(resolveConnectionEndpoint(devConfig.backendEndpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildConnectionPayload(devConfig))
    });
  } catch (_error) {
    const networkError = createApiError(
      {
        code: "NETWORK_ERROR",
        message: "无法连接到后端接口，请确认本地服务已经启动。"
      },
      "无法连接到后端接口。"
    );

    if (devConfig.mockFallback) {
      return createMockConnectionResult(devConfig, networkError);
    }

    throw networkError;
  }

  const json = await readJson(response);

  if (!response.ok || !json?.ok) {
    const error = createApiError(json?.error, "连接测试失败，请检查 provider、model、API Key 和接口地址。", json || {});

    if (devConfig.mockFallback) {
      return createMockConnectionResult(devConfig, error);
    }

    throw error;
  }

  return {
    ...json,
    transport: json.transport || "live"
  };
}

async function postTask(endpoint, request, devConfig) {
  let response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        preset: devConfig.preset,
        provider: devConfig.provider,
        model: devConfig.model,
        apiKey: devConfig.apiKey,
        baseURL: devConfig.baseURL,
        providerOptions: devConfig.providerOptions || {},
        task: request.task,
        payload: request.payload
      })
    });
  } catch (_error) {
    throw createApiError(
      {
        code: "NETWORK_ERROR",
        message: "无法连接到后端接口，请检查本地服务是否已启动。"
      },
      "无法连接到后端接口。"
    );
  }

  const json = await readJson(response);

  if (!response.ok || !json?.ok) {
    throw createApiError(json?.error, `AI 请求失败，状态码 ${response.status}。`, json || {});
  }

  return json;
}

export async function executeTask(request, devConfig) {
  const startedAt = Date.now();
  let fallbackReason = null;

  if (window.location.protocol !== "file:") {
    try {
      const backendResult = await postTask(devConfig.backendEndpoint || request.endpoint, request, devConfig);

      if (!backendResult || typeof backendResult !== "object" || !("data" in backendResult)) {
        throw createApiError(
          {
            code: "INVALID_BACKEND_ENVELOPE",
            message: "后端返回成功，但结果包结构不完整。"
          },
          "后端返回结构不完整。"
        );
      }

      return {
        data: backendResult.data,
        meta: {
          ...backendResult.meta,
          transport: "live",
          provider: backendResult.meta?.provider || devConfig.provider,
          model: backendResult.meta?.model || devConfig.model,
          latencyMs: backendResult.meta?.latencyMs ?? Date.now() - startedAt,
          startedAt: new Date(startedAt).toISOString(),
          generatedAt: backendResult.meta?.generatedAt || new Date().toISOString()
        }
      };
    } catch (error) {
      fallbackReason = error;

      if (!devConfig.mockFallback) {
        throw error;
      }
    }
  } else if (!devConfig.mockFallback) {
    throw createApiError(
      {
        code: "FILE_PROTOCOL_UNSUPPORTED",
        message: "当前通过 file:// 打开页面，请先运行本地服务，或开启开发者选项里的 Mock Fallback。"
      },
      "当前通过 file:// 打开页面，请先运行本地服务。"
    );
  }

  const mockStartedAt = Date.now();
  const mockResult = await buildMockTaskResult({
    ...request,
    provider: devConfig.provider,
    model: devConfig.model
  });

  return {
    data: mockResult.data,
    meta: {
      ...mockResult.meta,
      transport: "mock",
      provider: devConfig.provider,
      model: devConfig.model || "browser-mock",
      latencyMs: Date.now() - mockStartedAt,
      startedAt: new Date(mockStartedAt).toISOString(),
      generatedAt: new Date().toISOString(),
      fallbackReason: fallbackReason?.message || "mock-fallback-enabled"
    }
  };
}
