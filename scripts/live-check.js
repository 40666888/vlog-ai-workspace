const fs = require("node:fs/promises");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const port = Number(process.env.LIVE_CHECK_PORT || 3320);
const baseURL = `http://127.0.0.1:${port}`;
const fixturesDir = path.join(workspaceRoot, "fixtures", "live");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(timeoutMs = 15000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseURL}/api/health`);

      if (response.ok) {
        return;
      }
    } catch (_error) {
      // Wait for boot.
    }

    await sleep(300);
  }

  throw new Error("Live-check server did not become healthy in time.");
}

function assertPortAvailable(targetPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(
          new Error(
            `LIVE_CHECK_PORT ${targetPort} 已被占用。请先关闭旧服务，或使用其他端口重新运行，例如：LIVE_CHECK_PORT=3345 npm run live:check`
          )
        );
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });

    server.listen(targetPort, "127.0.0.1");
  });
}

async function requestJson(endpoint, init) {
  const response = await fetch(`${baseURL}${endpoint}`, init);
  const rawText = await response.text().catch(() => "");
  let json = null;

  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch (_error) {
    json = null;
  }

  return {
    status: response.status,
    json,
    rawText
  };
}

async function writeFixtureFile(filename, payload) {
  await fs.mkdir(fixturesDir, { recursive: true });
  await fs.writeFile(path.join(fixturesDir, filename), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function removeFixtureFile(filename) {
  await fs.rm(path.join(fixturesDir, filename), { force: true }).catch(() => {});
}

function buildFailureDiagnosis(result = {}) {
  const response = result.response || {};
  const error = response.error || {};
  const code = response.errorCode || error.code || result.reason || "UNKNOWN_ERROR";

  if (code === "NETWORK_ERROR") {
    return {
      category: "network",
      summary: "请求没有成功到达 provider，优先检查当前环境的网络、代理、防火墙或出口限制。"
    };
  }

  if (code === "INVALID_BASE_URL") {
    return {
      category: "base_url",
      summary: "当前 Base URL 或路径组合不对，或该平台并不支持当前探测路径。"
    };
  }

  if (code === "AUTH_FAILED") {
    return {
      category: "auth",
      summary: "API Key 无效、过期，或当前账号没有访问该模型/接口的权限。"
    };
  }

  if (code === "MODEL_NOT_FOUND") {
    return {
      category: "model",
      summary: "模型名错误，或当前账号没有该模型的访问权限。"
    };
  }

  if (code === "RATE_LIMITED") {
    return {
      category: "rate_limit",
      summary: "provider 返回限流，需稍后重试或提升配额。"
    };
  }

  if (code === "PROVIDER_BUSINESS_ERROR") {
    return {
      category: "provider_business",
      summary: "HTTP 已到达 provider，但 provider 返回了业务层错误，需要看原始响应字段。"
    };
  }

  return {
    category: "unknown",
    summary: "需要结合 failure.json 和 raw.json 继续排查。"
  };
}

function buildProviderNextSteps(entry = {}, providerKey = "") {
  const reason = entry.reason || "";

  if (providerKey === "openai") {
    if (reason === "NETWORK_ERROR") {
      return [
        "当前环境到 https://api.openai.com/v1 没有打通。先检查网络出口、代理或防火墙，再重试 live:check。",
        "可先用 curl 或浏览器确认当前机器是否能访问 OpenAI 官方域名。",
        "只有连接测试和最小 generate 都成功后，才可以对外宣称已接通 OpenAI 真实模型。"
      ];
    }

    if (reason === "AUTH_FAILED") {
      return [
        "请确认 OpenAI Key 有效且没有过期。",
        "确认账号具备当前 model 的访问权限，然后重新执行 live:check。"
      ];
    }
  }

  if (providerKey === "openaiCompatible") {
    if (reason === "AUTH_FAILED") {
      return [
        "当前兼容平台已经到达 provider，但 provider 判定这组 Key 无效、过期，或没有目标模型权限。",
        "按 MiniMax 官方 OpenAI 兼容文档，优先使用 Base URL https://api.minimaxi.com/v1，并确认 model 名称与控制台开通状态一致。",
        "如果更换正确 Key 后仍失败，再检查账号套餐、模型权限和平台侧错误日志。"
      ];
    }

    if (reason === "INVALID_BASE_URL") {
      return [
        "当前 Base URL 或路径组合不正确。按官方文档优先使用 https://api.minimaxi.com/v1。",
        "确认兼容层没有额外拼错 path suffix，再重新执行 live:check。"
      ];
    }
  }

  if (providerKey === "minimaxNative") {
    if (reason === "PROVIDER_BUSINESS_ERROR") {
      return [
        "当前请求已到达 MiniMax 原生接口，但 provider 返回了业务层错误，例如集群过载、账号状态或平台侧限制。",
        "请保留 fixtures/live/minimax_native.raw.json，稍后重试；如果长期出现同样错误，再到 MiniMax 控制台排查。"
      ];
    }

    if (reason === "AUTH_FAILED") {
      return [
        "当前请求已经到达 MiniMax 原生接口，但 provider 判定这组 Key 无效、过期，或没有目标模型权限。",
        "请确认前端选择的是 minimax_native 或 minimax-native preset，并使用 https://api.minimaxi.com/v1 + /text/chatcompletion_v2。"
      ];
    }

    if (reason === "INVALID_BASE_URL") {
      return [
        "MiniMax Native 应直接走 https://api.minimaxi.com/v1/text/chatcompletion_v2。",
        "请不要再把原生接口误配成 OpenAI Compatible 的 /chat/completions。"
      ];
    }
  }

  if (entry.success) {
    return ["该 provider 已通过当前轮真实联调，可以继续验证更多 generate 任务。"];
  }

  return ["请结合 fixtures/live/*.failure.json 和 *.raw.json 继续排查后再重试。"];
}

function buildSummaryNextSteps(summary) {
  return {
    openai: buildProviderNextSteps(summary.openai, "openai"),
    openaiCompatible: buildProviderNextSteps(summary.openaiCompatible, "openaiCompatible"),
    minimaxNative: buildProviderNextSteps(summary.minimaxNative, "minimaxNative"),
    general: [
      "mock fallback 默认应保持关闭，避免把本地 mock 误判成真实模型结果。",
      "只有 fixtures/live/*.success.json 存在且 source=real 时，才可以对外宣称“已接通真实模型”。"
    ]
  };
}

function buildReferenceIdeasPayload() {
  return {
    profile: {
      accountType: "campus_life",
      accountTypeLabel: "男大学生日常成长型",
      mainPlatform: "xiaohongshu",
      mainPlatformLabel: "小红书",
      accountVibe: "boyish",
      accountVibeLabel: "少年感",
      audience: "peers",
      audienceLabel: "同龄大学生",
      commonScene: "campus",
      commonSceneLabel: "校园 / 宿舍 / 教学楼",
      frequency: "3",
      frequencyLabel: "每周 3 条",
      accountBrief: "我想做一个有少年感、爱运动、不油腻的男大学生日常账号。",
      creatorState: "quick",
      creatorStateLabel: "今天想快速拍，别太复杂",
      extraRequirements: "希望更贴近校园真实状态。"
    },
    filters: {
      objective: "growth",
      objectiveLabel: "涨粉 / 破圈",
      presence: "medium",
      presenceLabel: "中等出镜，偶尔露脸",
      difficulty: "easy",
      difficultyLabel: "低难度，拿起手机就能拍",
      duration: "short",
      durationLabel: "30-45 秒"
    },
    references: {
      benchmarkRawText: "小红书 @阿昊的上学记录《男大学生早八前把自己收拾干净的一天》",
      creativeDraftText: "我想拍一条今天状态一般但还是去操场跑了两圈的轻量 vlog。",
      samples: [
        {
          id: "reference-1",
          platform: "小红书",
          creator: "@阿昊的上学记录",
          title: "男大学生早八前把自己收拾干净的一天"
        }
      ],
      preferredId: "reference-1"
    },
    referenceIdeas: [],
    creativeIdeas: [],
    activeIdea: null,
    calendarSettings: {
      startDate: "2026-04-13",
      windowDays: 7
    }
  };
}

async function runProviderRound({ label, preset, provider, model, apiKey, baseURL }) {
  const canonicalLabel = label.replace(/-/g, "_");
  const providerOptions =
    preset === "minimax-compatible"
      ? {
          testConnectionMode: "chat"
        }
      : {};
  const result = {
    label,
    provider,
    preset,
    model,
    baseURL,
    attempted: false,
    connected: false,
    generated: false,
    skipped: false,
    success: false,
    source: "real",
    reason: ""
  };

  if (!apiKey || !model || ((provider === "openai_compatible" || provider === "minimax_native") && !baseURL)) {
    result.skipped = true;
    result.reason = "missing-live-credentials";
    await writeFixtureFile(`${canonicalLabel}.failure.json`, {
      provider,
      preset,
      success: false,
      skipped: true,
      source: "real",
      generatedAt: new Date().toISOString(),
      reason: result.reason,
      diagnosis: buildFailureDiagnosis(result)
    });
    await removeFixtureFile(`${canonicalLabel}.success.json`);
    await removeFixtureFile(`${canonicalLabel}.raw.json`);
    return result;
  }

  result.attempted = true;

  const testConnection = await requestJson("/api/test-connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      preset,
      provider,
      model,
      apiKey,
      baseURL,
      providerOptions
    })
  });

  if (!testConnection.json?.ok) {
    result.reason = testConnection.json?.errorCode || "test-connection-failed";
    await writeFixtureFile(`${label}.test-connection.failure.json`, testConnection.json || testConnection);
    await writeFixtureFile(`${canonicalLabel}.failure.json`, {
      provider,
      preset,
      success: false,
      skipped: false,
      stage: "test_connection",
      source: "real",
      generatedAt: new Date().toISOString(),
      response: testConnection.json || testConnection,
      diagnosis: buildFailureDiagnosis({
        reason: result.reason,
        response: testConnection.json || testConnection
      })
    });
    await writeFixtureFile(`${canonicalLabel}.raw.json`, {
      provider,
      preset,
      stage: "test_connection",
      status: testConnection.status,
      rawText: testConnection.rawText || "",
      json: testConnection.json,
      providerRaw: testConnection.json?.providerRaw || null
    });
    await removeFixtureFile(`${canonicalLabel}.success.json`);
    return result;
  }

  result.connected = true;
  await writeFixtureFile(`${label}.test-connection.success.json`, testConnection.json);

  const generate = await requestJson("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      preset,
      provider,
      model,
      apiKey,
      baseURL,
      providerOptions,
      task: "reference_ideas",
      payload: buildReferenceIdeasPayload()
    })
  });

  if (!generate.json?.ok) {
    result.reason = generate.json?.errorCode || "generate-failed";
    await writeFixtureFile(`${label}.reference_ideas.failure.json`, generate.json || generate);
    await writeFixtureFile(`${canonicalLabel}.failure.json`, {
      provider,
      preset,
      success: false,
      skipped: false,
      stage: "generate",
      task: "reference_ideas",
      source: "real",
      generatedAt: new Date().toISOString(),
      response: generate.json || generate,
      diagnosis: buildFailureDiagnosis({
        reason: result.reason,
        response: generate.json || generate
      })
    });
    await writeFixtureFile(`${canonicalLabel}.raw.json`, {
      provider,
      preset,
      stage: "generate",
      task: "reference_ideas",
      status: generate.status,
      rawText: generate.rawText || "",
      json: generate.json,
      providerRaw: generate.json?.providerRaw || generate.json?.meta?.providerRaw || null
    });
    await removeFixtureFile(`${canonicalLabel}.success.json`);
    return result;
  }

  result.generated = true;
  result.success = true;
  await writeFixtureFile(`${label}.reference_ideas.success.json`, generate.json);
  await writeFixtureFile(`${canonicalLabel}.success.json`, {
    provider,
    preset,
    success: true,
    skipped: false,
    source: "real",
    generatedAt: new Date().toISOString(),
    testConnection: testConnection.json,
    generate: generate.json,
    providerRaw: generate.json?.meta?.providerRaw || testConnection.json?.providerRaw || null
  });
  await removeFixtureFile(`${canonicalLabel}.failure.json`);
  await removeFixtureFile(`${canonicalLabel}.raw.json`);
  return result;
}

async function run() {
  await assertPortAvailable(port);

  const child = spawn(process.execPath, ["server.js"], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: "pipe"
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  try {
    await waitForHealth();

    const summary = {
      generatedAt: new Date().toISOString(),
      openai: await runProviderRound({
        label: "openai",
        preset: "openai",
        provider: "openai",
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        apiKey: process.env.OPENAI_API_KEY || "",
        baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
      }),
      openaiCompatible: await runProviderRound({
        label: "openai-compatible",
        preset: process.env.LIVE_COMPAT_PRESET || "minimax-compatible",
        provider: "openai_compatible",
        model: process.env.OPENAI_COMPATIBLE_MODEL || "MiniMax-M2.5",
        apiKey: process.env.OPENAI_COMPATIBLE_API_KEY || "",
        baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL || "https://api.minimaxi.com/v1"
      }),
      minimaxNative: await runProviderRound({
        label: "minimax-native",
        preset: "minimax-native",
        provider: "minimax_native",
        model: process.env.MINIMAX_NATIVE_MODEL || "MiniMax-M2.7",
        apiKey: process.env.MINIMAX_NATIVE_API_KEY || "",
        baseURL: process.env.MINIMAX_NATIVE_BASE_URL || "https://api.minimaxi.com/v1"
      })
    };

    summary.next_steps = buildSummaryNextSteps(summary);

    await writeFixtureFile("live-check.summary.json", summary);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    child.kill("SIGTERM");
    await sleep(500);

    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }

    if (stderr.trim()) {
      console.error(stderr.trim());
    } else if (stdout.trim()) {
      console.log(stdout.trim());
    }
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
