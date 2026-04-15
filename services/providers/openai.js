const {
  requestChatCompletion,
  testOpenAICompatibleConnection
} = require("./openaiCompatible");

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";
const OPENAI_DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

async function testOpenAIConnection(config = {}) {
  return testOpenAICompatibleConnection(config, {
    providerLabel: "OpenAI",
    envApiKeyName: "OPENAI_API_KEY",
    envBaseURLName: "OPENAI_BASE_URL",
    envModelName: "OPENAI_MODEL",
    defaultBaseURL: OPENAI_DEFAULT_BASE_URL,
    defaultModel: OPENAI_DEFAULT_MODEL,
    defaultPathSuffix: ""
  });
}

async function generateWithOpenAI(config = {}) {
  return requestChatCompletion(config, {
    providerLabel: "OpenAI",
    envApiKeyName: "OPENAI_API_KEY",
    envBaseURLName: "OPENAI_BASE_URL",
    envModelName: "OPENAI_MODEL",
    defaultBaseURL: OPENAI_DEFAULT_BASE_URL,
    defaultModel: OPENAI_DEFAULT_MODEL,
    defaultPathSuffix: "",
    supportJsonMode: true
  });
}

module.exports = {
  generateWithOpenAI,
  testOpenAIConnection
};
