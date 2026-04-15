const express = require("express");
const { buildReferenceIdeasPrompt } = require("../promptBuilders/referenceIdeas");
const { buildCreativeIdeasPrompt } = require("../promptBuilders/creativeIdeas");
const { buildScriptPrompt } = require("../promptBuilders/script");
const { buildCalendarPrompt } = require("../promptBuilders/calendar");
const { generateWithOpenAI, testOpenAIConnection } = require("./providers/openai");
const {
  generateWithOpenAICompatible,
  testOpenAICompatibleConnection
} = require("./providers/openaiCompatible");
const {
  generateWithMinimaxNative,
  testMinimaxNativeConnection
} = require("./providers/minimaxNative");
const { normalizeTaskResponse } = require("./responseNormalizer");
const { normalizeTaskOutput, validateGenerateRequest } = require("./taskSchemas");

const providerRegistry = {
  openai: {
    label: "OpenAI",
    generate: generateWithOpenAI,
    testConnection: testOpenAIConnection
  },
  openai_compatible: {
    label: "OpenAI Compatible",
    generate: generateWithOpenAICompatible,
    testConnection: testOpenAICompatibleConnection
  },
  minimax_native: {
    label: "MiniMax Native",
    generate: generateWithMinimaxNative,
    testConnection: testMinimaxNativeConnection
  }
};

function createRequestError(code, message, details = []) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function resolveProvider(providerName = "openai") {
  const normalizedName = String(providerName || "openai").trim().toLowerCase();
  return providerRegistry[normalizedName] || null;
}

function buildPromptPackage(task, payload) {
  switch (task) {
    case "reference_ideas":
      return buildReferenceIdeasPrompt(payload);
    case "creative_ideas":
      return buildCreativeIdeasPrompt(payload);
    case "shooting_script":
    case "shooting_advice":
    case "full_plan":
      return buildScriptPrompt(task, payload);
    case "calendar_summary":
      return buildCalendarPrompt(payload);
    default:
      throw createRequestError("UNSUPPORTED_TASK", `暂不支持任务 ${task}。`);
  }
}

function buildMetaEnvelope({ task, provider, providerLabel, result, repairMeta }) {
  return {
    task,
    provider,
    providerLabel,
    model: result.model,
    baseURL: result.baseURL,
    endpoint: result.endpoint || null,
    transport: "live",
    source: result.source || "real",
    latencyMs: result.latencyMs || null,
    retryCount: Number(result.retryCount || 0),
    retried: Boolean(result.retried),
    timedOut: Boolean(result.timedOut),
    retryReason: result.retryReason || null,
    generatedAt: new Date().toISOString(),
    repairApplied: Boolean(repairMeta?.applied),
    repairNotes: repairMeta?.notes || [],
    providerRaw: result.providerRaw || null
  };
}

function sendError(response, error, task = "", extra = {}) {
  const isValidationError = error.code === "SCHEMA_VALIDATION_FAILED";
  const statusCodeMap = {
    INVALID_REQUEST: 400,
    UNSUPPORTED_TASK: 400,
    UNSUPPORTED_PROVIDER: 400,
    MISSING_API_KEY: 400,
    INVALID_BASE_URL: 400,
    AUTH_FAILED: 401,
    MODEL_NOT_FOUND: 404,
    RATE_LIMITED: 429,
    REQUEST_TIMEOUT: 504,
    NETWORK_ERROR: 502,
    INVALID_PROVIDER_RESPONSE: 502,
    PROVIDER_BUSINESS_ERROR: 502
  };
  const statusCode = isValidationError ? 422 : statusCodeMap[error.code] || 500;

  response.status(statusCode).json({
    ok: false,
    provider: extra.provider || error.provider || null,
    model: extra.model || error.model || null,
    baseURL: extra.baseURL || error.baseURL || null,
    available: false,
    success: false,
    failed: true,
    latencyMs: extra.latencyMs || error.latencyMs || null,
    errorCode: error.code || "AI_ROUTER_ERROR",
    endpoint: extra.endpoint || error.endpoint || null,
    transport: extra.transport || error.transport || "live",
    source: extra.source || error.source || "real",
    retryCount: Number(extra.retryCount ?? error.retryCount ?? 0),
    retried: Boolean(extra.retried ?? error.retried),
    timedOut: Boolean(extra.timedOut ?? error.timedOut ?? error.code === "REQUEST_TIMEOUT"),
    retryReason: extra.retryReason || error.retryReason || null,
    providerRaw: extra.providerRaw || error.providerRaw || null,
    error: {
      code: error.code || "AI_ROUTER_ERROR",
      task,
      message: error.message || "接口执行失败。",
      details: error.details || [],
      receivedPreview: error.receivedPreview || null
    }
  });
}

function createAiRouter() {
  const router = express.Router();

  router.post("/test-connection", async (request, response) => {
    const providerName = String(request.body?.provider || "openai").trim().toLowerCase();
    const provider = resolveProvider(providerName);
    const connectionContext = {
      provider: providerName,
      model: request.body?.model || null,
      baseURL: request.body?.baseURL || null
    };

    if (!provider) {
      sendError(response, createRequestError("UNSUPPORTED_PROVIDER", `暂不支持 provider: ${providerName}。`), "", connectionContext);
      return;
    }

    try {
      const result = await provider.testConnection({
        provider: providerName,
        model: request.body?.model,
        apiKey: request.body?.apiKey,
        baseURL: request.body?.baseURL,
        providerOptions: request.body?.providerOptions
      });

      response.json({
        ok: true,
        provider: providerName,
        providerLabel: provider.label,
        available: true,
        success: true,
        failed: false,
        model: result.model,
        baseURL: result.baseURL,
        endpoint: result.endpoint || null,
        latencyMs: result.latencyMs || null,
        errorCode: null,
        transport: "live",
        source: result.source || "real",
        retryCount: Number(result.retryCount || 0),
        retried: Boolean(result.retried),
        timedOut: Boolean(result.timedOut),
        retryReason: result.retryReason || null,
        providerRaw: result.providerRaw || null,
        message: result.message || `${provider.label} 连接成功，可以开始生成。`
      });
    } catch (error) {
      sendError(response, error, "", connectionContext);
    }
  });

  router.post("/generate", async (request, response) => {
    let normalizedTask = "";

    try {
      const generateRequest = validateGenerateRequest(request.body || {});
      normalizedTask = generateRequest.task;
      const provider = resolveProvider(generateRequest.provider);

      if (!provider) {
        throw createRequestError("UNSUPPORTED_PROVIDER", `暂不支持 provider: ${generateRequest.provider}。`);
      }

      const promptPackage = buildPromptPackage(generateRequest.task, generateRequest.payload);
      const providerResult = await provider.generate({
        provider: generateRequest.provider,
        model: generateRequest.model,
        apiKey: generateRequest.apiKey,
        baseURL: generateRequest.baseURL,
        providerOptions: generateRequest.providerOptions,
        promptPackage
      });
      const normalizedResponse = normalizeTaskResponse(generateRequest.task, providerResult.parsed, providerResult.rawText);
      const data = normalizeTaskOutput(generateRequest.task, normalizedResponse.data, providerResult.rawText);

      response.json({
        ok: true,
        data,
        meta: buildMetaEnvelope({
          task: generateRequest.task,
          provider: generateRequest.provider,
          providerLabel: provider.label,
          result: providerResult,
          repairMeta: normalizedResponse.repairMeta
        })
      });
    } catch (error) {
      sendError(response, error, normalizedTask, {
        provider: request.body?.provider || null,
        model: request.body?.model || null,
        baseURL: request.body?.baseURL || null
      });
    }
  });

  return router;
}

module.exports = {
  createAiRouter
};
