const providerCapabilities = {
  openai: {
    id: "openai",
    label: "OpenAI",
    supports: {
      testConnection: true,
      modelProbing: true,
      structuredOutputs: true,
      strictJsonSchema: true,
      fallbackOnly: false
    },
    constraints: {
      requiresModel: true,
      requiresBaseURL: false,
      allowCustomHeaders: false,
      allowPathSuffix: false
    }
  },
  openai_compatible: {
    id: "openai_compatible",
    label: "OpenAI Compatible",
    supports: {
      testConnection: true,
      modelProbing: true,
      structuredOutputs: false,
      strictJsonSchema: false,
      fallbackOnly: false
    },
    constraints: {
      requiresModel: true,
      requiresBaseURL: true,
      allowCustomHeaders: true,
      allowPathSuffix: true
    }
  },
  minimax_native: {
    id: "minimax_native",
    label: "MiniMax Native",
    supports: {
      testConnection: true,
      modelProbing: false,
      structuredOutputs: false,
      strictJsonSchema: false,
      fallbackOnly: false
    },
    constraints: {
      requiresModel: true,
      requiresBaseURL: true,
      allowCustomHeaders: false,
      allowPathSuffix: false
    }
  }
};

const presetCapabilities = {
  openai: {
    id: "openai",
    label: "OpenAI",
    provider: "openai",
    defaultModel: "gpt-4.1-mini",
    defaultBaseURL: "",
    supports: providerCapabilities.openai.supports,
    constraints: providerCapabilities.openai.constraints,
    hint: "官方 OpenAI，Base URL 可留空，服务端默认会回退到官方地址。"
  },
  openai_compatible: {
    id: "openai_compatible",
    label: "OpenAI Compatible",
    provider: "openai_compatible",
    defaultModel: "",
    defaultBaseURL: "",
    supports: providerCapabilities.openai_compatible.supports,
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "通用兼容层，通常需要手动填写 Base URL 和 model。"
  },
  "deepseek-compatible": {
    id: "deepseek-compatible",
    label: "DeepSeek Compatible",
    provider: "openai_compatible",
    defaultModel: "deepseek-chat",
    defaultBaseURL: "https://api.deepseek.com/v1",
    supports: providerCapabilities.openai_compatible.supports,
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "默认走 DeepSeek 兼容接口，适合快速验证 openai_compatible 链路。"
  },
  "qwen-compatible": {
    id: "qwen-compatible",
    label: "Qwen Compatible",
    provider: "openai_compatible",
    defaultModel: "qwen-plus",
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    supports: providerCapabilities.openai_compatible.supports,
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "默认走阿里云百炼兼容模式接口。"
  },
  "glm-compatible": {
    id: "glm-compatible",
    label: "GLM Compatible",
    provider: "openai_compatible",
    defaultModel: "glm-4-plus",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
    supports: providerCapabilities.openai_compatible.supports,
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "默认走智谱兼容接口。"
  },
  "minimax-compatible": {
    id: "minimax-compatible",
    label: "MiniMax Compatible",
    provider: "openai_compatible",
    defaultModel: "MiniMax-M2.5",
    defaultBaseURL: "https://api.minimaxi.com/v1",
    supports: {
      testConnection: true,
      modelProbing: false,
      structuredOutputs: false,
      strictJsonSchema: false,
      fallbackOnly: false
    },
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "默认走 MiniMax 官方 OpenAI 兼容接口，连接测试会使用最小 chat ping，而不是 /models 探测。官方文档当前给出的 Base URL 是 https://api.minimaxi.com/v1。"
  },
  "minimax-native": {
    id: "minimax-native",
    label: "MiniMax Native",
    provider: "minimax_native",
    defaultModel: "MiniMax-M2.7",
    defaultBaseURL: "https://api.minimaxi.com/v1",
    supports: providerCapabilities.minimax_native.supports,
    constraints: providerCapabilities.minimax_native.constraints,
    hint: "当前走 MiniMax 原生文本接口，不是 OpenAI 兼容接口。默认模型是 MiniMax-M2.7，也可手动切换为 MiniMax-M2.7-highspeed；连接测试与生成都会请求 /text/chatcompletion_v2；结构化结果依赖服务端 normalize/repair。"
  },
  custom: {
    id: "custom",
    label: "Custom",
    provider: "openai_compatible",
    defaultModel: "",
    defaultBaseURL: "",
    supports: providerCapabilities.openai_compatible.supports,
    constraints: providerCapabilities.openai_compatible.constraints,
    hint: "适合任意兼容 OpenAI 协议的平台，需自行填写 Base URL 与 model。"
  }
};

function hasServerCredential(providerId) {
  if (providerId === "openai") {
    return Boolean(String(process.env.OPENAI_API_KEY || "").trim());
  }

  if (providerId === "openai_compatible") {
    return Boolean(String(process.env.OPENAI_COMPATIBLE_API_KEY || "").trim());
  }

  if (providerId === "minimax_native") {
    return Boolean(String(process.env.MINIMAX_NATIVE_API_KEY || "").trim());
  }

  return false;
}

function getServerCredentialStatus() {
  return Object.fromEntries(Object.keys(providerCapabilities).map((providerId) => [providerId, hasServerCredential(providerId)]));
}

function getRuntimeProviderCapabilities() {
  return {
    providers: providerCapabilities,
    presets: presetCapabilities,
    serverCredentials: getServerCredentialStatus()
  };
}

module.exports = {
  getRuntimeProviderCapabilities,
  hasServerCredential,
  presetCapabilities,
  providerCapabilities
};
