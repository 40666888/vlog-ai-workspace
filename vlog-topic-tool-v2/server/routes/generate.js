import express from "express";
import { generateStructuredContent, testOpenAIConnection } from "../services/openai.js";
import { buildTaskPrompt } from "../services/promptBuilders.js";
import { buildTaskMeta, normalizeTaskOutput } from "../utils/formatters.js";

export function createGenerateRouter() {
  const router = express.Router();

  router.post("/test-connection", async (request, response) => {
    try {
      const result = await testOpenAIConnection(request.body?.apiKeyOverride || request.headers["x-dev-api-key-override"]);

      response.json({
        ok: true,
        ...result
      });
    } catch (error) {
      response.status(500).json({
        ok: false,
        error: {
          code: error.code || "CONNECTION_TEST_FAILED",
          taskType: "connection-test",
          message: error.message || "连接失败。"
        }
      });
    }
  });

  router.post("/generate", async (request, response) => {
    const { taskType, payload } = request.body || {};

    if (!taskType || !payload) {
      response.status(400).json({
        ok: false,
        error: {
          message: "taskType 和 payload 是必填项。"
        }
      });
      return;
    }

    try {
      const promptPackage = buildTaskPrompt(taskType, payload);
      const rawResult = await generateStructuredContent(promptPackage, request.headers["x-dev-api-key-override"]);
      const data = normalizeTaskOutput(taskType, rawResult);

      response.json({
        ok: true,
        data,
        meta: buildTaskMeta({
          taskType,
          payload
        })
      });
    } catch (error) {
      const isValidationError = error.code === "SCHEMA_VALIDATION_FAILED";

      response.status(isValidationError ? 422 : 500).json({
        ok: false,
        error: {
          code: error.code || "AI_GENERATION_FAILED",
          taskType,
          message: error.message || "AI 生成失败，请检查后端配置。",
          details: error.details || [],
          receivedPreview: error.receivedPreview || null
        }
      });
    }
  });

  return router;
}
