const DEFAULT_MODEL = process.env.OPENAI_MODEL || "your-openai-model";
const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

function resolveApiKey(apiKeyOverride) {
  return String(apiKeyOverride || process.env.OPENAI_API_KEY || "").trim();
}

function buildAuthHeaders(apiKeyOverride) {
  const apiKey = resolveApiKey(apiKeyOverride);

  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY。请填写页面顶部 API Key，或在 .env 中配置。");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}

export async function testOpenAIConnection(apiKeyOverride) {
  const response = await fetch(`${DEFAULT_BASE_URL}/models`, {
    method: "GET",
    headers: buildAuthHeaders(apiKeyOverride)
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message || "连接失败，请检查 API Key、模型权限或 Base URL。");
  }

  return {
    ok: true,
    message: "连接成功，可以开始生成内容。"
  };
}

export async function generateStructuredContent(promptPackage, apiKeyOverride) {
  const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildAuthHeaders(apiKeyOverride),
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: promptPackage.temperature ?? 0.7,
      response_format: {
        type: "json_object"
      },
      messages: [
        {
          role: "system",
          content: promptPackage.systemPrompt
        },
        {
          role: "user",
          content: `${promptPackage.userPrompt}\n\n请严格输出 JSON，遵循以下返回结构：\n${promptPackage.outputSchema}`
        }
      ]
    })
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.error?.message || `OpenAI 请求失败，状态码 ${response.status}。`);
  }

  const content = result?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("模型没有返回可解析内容。");
  }

  return content;
}
