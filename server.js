const path = require("node:path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createAiRouter } = require("./services/aiRouter");
const { getRuntimeProviderCapabilities } = require("./services/providers/providerCapabilities");

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const nodeEnv = String(process.env.NODE_ENV || "development").trim() || "development";
const isProduction = nodeEnv === "production";
const host = String(process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1")).trim() || "127.0.0.1";
const workspaceRoot = __dirname;
const appMode = process.env.AI_RUN_MODE === "server-managed" ? "server-managed" : "local-dev";
const appEntryPath = "/vlog-topic-tool-v2/";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(workspaceRoot));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    message: "Server is ready.",
    generatedAt: new Date().toISOString(),
    mode: appMode,
    nodeEnv,
    appEntryPath
  });
});

app.get("/api/runtime-config", (_request, response) => {
  response.json({
    ok: true,
    mode: appMode,
    nodeEnv,
    allowFrontendApiKeyInput: appMode !== "server-managed",
    backendEndpoint: "/api/generate",
    appEntryPath,
    ...getRuntimeProviderCapabilities()
  });
});

app.use("/api", createAiRouter());

app.get("/", (_request, response) => {
  if (isProduction) {
    response.redirect(appEntryPath);
    return;
  }

  response.send(`
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Codex Local Server</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; padding: 32px; background: #f7fbfc; color: #14333d; }
          a { color: #167ee6; }
          .card { max-width: 760px; background: #fff; border: 1px solid #dce8eb; border-radius: 20px; padding: 24px; box-shadow: 0 12px 36px rgba(20, 51, 61, 0.08); }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>本地服务已启动</h1>
          <p>你可以直接打开下面这个页面继续测试 Vlog AI 工作台：</p>
          <p><a href="${appEntryPath}">${appEntryPath}</a></p>
          <p>健康检查接口：<a href="/api/health">/api/health</a></p>
          <p>运行模式：<code>${appMode}</code></p>
          <p>Node 环境：<code>${nodeEnv}</code></p>
          <p>生成接口：<code>/api/generate</code></p>
        </div>
      </body>
    </html>
  `);
});

app.listen(port, host, () => {
  console.log(`Local server running at http://${host}:${port}`);
});
