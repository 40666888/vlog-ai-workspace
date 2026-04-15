# Vlog AI Workspace Local Server

这个目录现在是一套可本地运行、可切换多供应商、可继续部署的 Vlog AI 创作工具底座：

当前状态说明：

- 真实联调链路、失败诊断、fixtures 和前端结果展示已经接通。
- `MiniMax Native + MiniMax-M2.7` 已经形成真实成功样例。
- `OpenAI` 在当前环境下仍未形成成功样例。
- 因此当前项目可以说明“已具备公网部署能力，并已打通至少一条真实 provider 链路”，但不能泛化宣称“所有 provider 都已打通”。

- 根目录的 `Express` 服务负责 `/api/health`、`/api/runtime-config`、`/api/test-connection`、`/api/generate`
- `/Users/swaggy/Desktop/Codex/vlog-topic-tool-v2/` 是前端单页工作台
- `services/` 负责 provider 路由、能力矩阵、标准化与 schema 校验
- `fixtures/` 和 `scripts/` 负责最小评测、联调样例与自检

## 目录结构

```text
server.js
services/
  aiRouter.js
  responseNormalizer.js
  taskSchemas.js
  providers/
    openai.js
    openaiCompatible.js
    providerCapabilities.js
    providerUtils.js
promptBuilders/
  referenceIdeas.js
  creativeIdeas.js
  script.js
  calendar.js
fixtures/
  examples/
  payloads/
  provider-raw/
  live/
scripts/
  smoke.js
  live-check.js
  validate-fixtures.mjs
vlog-topic-tool-v2/
```

## 安装依赖

```bash
cd /Users/swaggy/Desktop/Codex
npm install
```

## 运行模式

支持两种模式：

- `local-dev`
  - 适合个人本地测试
  - 前端显示 `API Key` 输入框
  - 页面中填写的 key 会覆盖服务端 `.env`
- `server-managed`
  - 适合部署给他人测试
  - 前端隐藏 `API Key`
  - 服务端优先使用 `.env` 中的密钥与默认模型

生产环境说明：

- `production` 不是第三种业务模式，而是部署环境。
- 线上部署时，仍然只分 `local-dev` 和 `server-managed` 两种业务模式。
- 建议同时设置：
  - `NODE_ENV=production`
  - `HOST=0.0.0.0`
- 在 `production` 下，根路径 `/` 会自动跳转到前端页面 `/vlog-topic-tool-v2/`，方便公网访问。

通过 `.env` 中的 `AI_RUN_MODE` 控制：

```bash
AI_RUN_MODE=local-dev
```

## 启动项目

```bash
cd /Users/swaggy/Desktop/Codex
cp .env.example .env
npm run dev
```

启动后打开：

- 页面：`http://localhost:3000/vlog-topic-tool-v2/`
- 健康检查：`http://localhost:3000/api/health`
- 运行时配置：`http://localhost:3000/api/runtime-config`

生产模式可直接：

```bash
cd /Users/swaggy/Desktop/Codex
npm start
```

本地开发默认监听：

- `HOST=127.0.0.1`

如果你要部署给局域网或他人访问，可以改成：

```bash
HOST=0.0.0.0
```

## 最小上线方案

目标：

- 不加登录
- 不加数据库
- 前端页面和 Node API 由同一个服务一起部署
- 用户在浏览器里自己填写 `API Key / provider / model / baseURL`
- 接口继续使用相对路径：
  - `/api/health`
  - `/api/test-connection`
  - `/api/generate`

推荐配置：

- `NODE_ENV=production`
- `AI_RUN_MODE=local-dev`
- `HOST=0.0.0.0`
- `PORT` 交给部署平台注入

适用场景：

- 你想尽快给别人一个公网网址
- 你不想先做用户系统
- 你希望每个访问者自己带自己的 key 来测试

注意：

- 这是最小可行上线方案，不适合大规模公开传播。
- 在 `local-dev` 公网模式下，访问者会在前端页面里自己输入 key。
- `mock fallback` 默认不要当成真实结果使用；公开演示时建议保持关闭。

## 一步步部署说明

这套项目已经适合“前后端同服务部署”：

- `Express` 同时托管静态前端和 `/api/*`
- 前端默认接口地址是相对路径 `/api/generate`
- 不依赖 `file://`
- 不需要把前端和后端拆成两个站点

### Render 部署

1. 把当前项目推到 GitHub
2. 在 Render 新建一个 `Web Service`
3. 选择这个仓库
4. 使用下面的命令：

```bash
Build Command: npm install
Start Command: npm start
```

5. 在 Render 环境变量里至少设置：

```bash
NODE_ENV=production
HOST=0.0.0.0
AI_RUN_MODE=local-dev
AI_REQUEST_TIMEOUT_MS=45000
AI_TEST_TIMEOUT_MS=15000
AI_GENERATE_TIMEOUT_MS=90000
```

6. 如果你要改成服务端托管密钥，再额外设置：

```bash
AI_RUN_MODE=server-managed
OPENAI_API_KEY=...
OPENAI_COMPATIBLE_API_KEY=...
MINIMAX_NATIVE_API_KEY=...
```

7. 部署完成后先验证：

- 前端页面：`https://你的域名/vlog-topic-tool-v2/`
- 根路径跳转：`https://你的域名/`
- 健康检查：`https://你的域名/api/health`

### Railway 部署

1. 把当前项目推到 GitHub
2. 在 Railway 新建项目并导入仓库
3. Railway 会自动识别 Node 项目
4. 使用下面的命令：

```bash
Build Command: npm install
Start Command: npm start
```

5. 设置环境变量：

```bash
NODE_ENV=production
HOST=0.0.0.0
AI_RUN_MODE=local-dev
AI_REQUEST_TIMEOUT_MS=45000
AI_TEST_TIMEOUT_MS=15000
AI_GENERATE_TIMEOUT_MS=90000
```

6. 部署后验证：

- `https://你的域名/api/health`
- `https://你的域名/vlog-topic-tool-v2/`

### 自定义域名

Render / Railway 都支持绑定自定义域名，步骤基本一致：

1. 在平台控制台添加 Custom Domain
2. 按平台给出的记录配置 DNS
3. 等待证书签发完成
4. 再次验证：

- `https://你的自定义域名/`
- `https://你的自定义域名/vlog-topic-tool-v2/`
- `https://你的自定义域名/api/health`

## 线上环境变量与安全

只建议放在服务端环境变量里的内容：

- `OPENAI_API_KEY`
- `OPENAI_COMPATIBLE_API_KEY`
- `MINIMAX_NATIVE_API_KEY`

适合公开配置、可以放在部署平台环境变量里的内容：

- `NODE_ENV`
- `HOST`
- `PORT`
- `AI_RUN_MODE`
- `AI_REQUEST_TIMEOUT_MS`
- `AI_TEST_TIMEOUT_MS`
- `AI_GENERATE_TIMEOUT_MS`
- `OPENAI_MODEL`
- `OPENAI_COMPATIBLE_MODEL`
- `OPENAI_COMPATIBLE_BASE_URL`
- `MINIMAX_NATIVE_MODEL`
- `MINIMAX_NATIVE_BASE_URL`

线上安全提示：

- 公开网址默认不要把 `mock fallback` 当成真实 AI 结果。
- 如果要对外测试，优先用 `local-dev`，让每个用户自己填 key。
- 如果要用 `server-managed`，请确认服务端 key 只保存在部署平台环境变量中。
- 线上推荐把 `AI_TEST_TIMEOUT_MS` 设为 `15000`，把 `AI_GENERATE_TIMEOUT_MS` 设为 `90000`，避免把轻量连接测试和真实生成任务混用同一个 timeout。
- 当前项目没有登录、配额、限流和审计，暂不适合大规模公开分发。
- 正式上线前，至少先验证 `/api/health`、`/api/test-connection`、`/api/generate` 在 HTTPS 下都可用。

## 跨设备使用准备

当前最小可行方案：

- 不做登录
- 不做数据库
- 让不同设备直接访问公网网址
- 每个用户自己填 API key
- 画像、参考输入、选题和脚本只保存在当前浏览器的本地存储里

下一步扩展建议：

- 接入 `Supabase Auth`
- 增加 `Supabase Postgres`
- 为每个用户保存：
  - 账号画像
  - 参考样本
  - 参考选题 / 创意选题
  - 脚本 / 拍摄建议
  - 日历摘要
- 后续再增加：
  - 用户隔离
  - 历史版本
  - 收藏夹
  - 多端同步

## 连接 OpenAI 官方

前端连接区选择：

- 供应商预设：`openai`
- Provider：`openai`
- Model：例如 `gpt-4.1-mini`
- Base URL：可留空，服务端默认回退到 `https://api.openai.com/v1`
- API Key：你的 OpenAI Key

然后点击“连接测试”，连接结果面板会显示：

- `provider`
- `model`
- `baseURL`
- `endpoint`
- `success / failed`
- `message`
- `error code`
- `latency`
- `source`

## 连接兼容 OpenAI 的平台

前端预设支持：

- `openai_compatible`
- `deepseek-compatible`
- `qwen-compatible`
- `glm-compatible`
- `minimax-compatible`
- `minimax-native`
- `custom`

常见填写方式：

- DeepSeek：`provider=openai_compatible`，`baseURL=https://api.deepseek.com/v1`
- Qwen：`provider=openai_compatible`，`baseURL=https://dashscope.aliyuncs.com/compatible-mode/v1`
- GLM：`provider=openai_compatible`，`baseURL=https://open.bigmodel.cn/api/paas/v4`
- MiniMax：`provider=openai_compatible`，`baseURL=https://api.minimaxi.com/v1`

## 连接 MiniMax 原生 API

如果你明确要走 MiniMax 原生接口，而不是 OpenAI 兼容层：

- 前端预设选择：`minimax-native`
- 或手动选择 `provider=minimax_native`
- 默认 `baseURL=https://api.minimaxi.com/v1`
- 默认测试模型：`MiniMax-M2.7`
- 可选模型：`MiniMax-M2.7-highspeed`
- 原生 endpoint：`/text/chatcompletion_v2`

当前项目里两种 MiniMax 接法是分开的：

- `minimax-compatible`
  - provider: `openai_compatible`
  - 走 OpenAI 兼容协议
  - endpoint 逻辑是 `/chat/completions`
- `minimax-native`
  - provider: `minimax_native`
  - 走 MiniMax 原生文本接口
  - endpoint 固定是 `/text/chatcompletion_v2`

如果你想明确走 MiniMax 原生接口，前端应该这样选：

1. 供应商预设选择 `minimax-native`
2. 保持 `Provider = minimax_native`
3. 确认 `Base URL = https://api.minimaxi.com/v1`
4. 连接测试成功后，再生成内容

补充说明：MiniMax 原生接口在 provider 侧繁忙时，后端会自动做轻量重试（仅针对 529 / overloaded_error）。

如果你的平台也是 OpenAI 兼容格式，只需要提供：

- `provider=openai_compatible`
- 对应 `baseURL`
- 对应 `model`
- 对应 `apiKey`

兼容层还支持：

- 自定义 headers
- 自定义 timeout
- 自定义 path suffix

### 平台速查表

| 预设 | Provider | 推荐 Model | Base URL 示例 | 能力说明 |
| --- | --- | --- | --- | --- |
| `openai` | `openai` | `gpt-4.1-mini` | `https://api.openai.com/v1` | 结构化输出和严格 JSON 最稳 |
| `deepseek-compatible` | `openai_compatible` | `deepseek-chat` | `https://api.deepseek.com/v1` | 兼容层，适合低成本联调 |
| `qwen-compatible` | `openai_compatible` | `qwen-plus` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 兼容层，模型探测通常可用 |
| `glm-compatible` | `openai_compatible` | `glm-4-plus` | `https://open.bigmodel.cn/api/paas/v4` | 兼容层，适合中文内容工作流 |
| `minimax-compatible` | `openai_compatible` | `MiniMax-M2.5` | `https://api.minimaxi.com/v1` | 兼容层，可直接接 MiniMax 的 OpenAI 兼容接口 |
| `minimax-native` | `minimax_native` | `MiniMax-M2.7` | `https://api.minimaxi.com/v1` | 原生层，直接请求 `/text/chatcompletion_v2`，可手动切到 `MiniMax-M2.7-highspeed` |
| `custom` | `openai_compatible` | 自填 | 自填 | 任意兼容 OpenAI 协议的平台 |

## Provider 能力矩阵

当前内置 provider capability config 会标记：

- 是否支持 `test connection`
- 是否支持 `model probing`
- 是否支持 `structured outputs`
- 是否支持 `strict json schema`
- 是否仅建议 fallback

前端会根据 preset 自动调整提示，不再鼓励无效组合。

## 当前任务类型

`/api/generate` 支持：

- `reference_ideas`
- `creative_ideas`
- `shooting_script`
- `shooting_advice`
- `full_plan`
- `calendar_summary`

前端不会直接上传整段 prompt，而是发送结构化 `payload`，后端再通过 `promptBuilders/` 自动组装任务导向 prompt。

## 响应标准化

真实 provider 返回和 schema 校验之间增加了 normalize/repair 层，用于修复这些常见问题：

- 数组和对象结构不一致
- 字段名不一致
- 顶层包裹 `data/result`
- 文本中夹带代码块或 JSON 污染

最终传给前端的结果，都会先经过 repair，再做严格 schema 校验。

## 本地配置与安全

- provider、model、baseURL、endpoint、表单输入会持久化到 `localStorage`
- `API Key` 默认不长期保存
- 如果手动启用“记住本次会话”，只会保存在 session 级别
- 页面提供“导出配置 / 导入配置 / 清除本地配置”
- 服务端 `.env` 仍然是更推荐的长期方案

## 自检与最小评测

基础接口自检：

```bash
cd /Users/swaggy/Desktop/Codex
npm run smoke
```

Schema + repair + render 验证：

```bash
cd /Users/swaggy/Desktop/Codex
npm run validate:fixtures
```

最小真实联调回合：

```bash
cd /Users/swaggy/Desktop/Codex
npm run live:check
```

`live:check` 会：

- 临时拉起本地服务
- 尝试跑一次 OpenAI 官方最小联调
- 再尝试跑一次 OpenAI Compatible 最小联调
- 把成功或失败结果写到 `fixtures/live/`
- 输出 `fixtures/live/live-check.summary.json`

如果没有配置真实 key，它会明确标记 `skipped: missing-live-credentials`。

## 真实联调步骤

### 模式 A：local-dev

1. `cp .env.example .env`
2. 保持 `AI_RUN_MODE=local-dev`
3. `npm run dev`
4. 打开页面后直接在前端填写 `API Key / provider / model / baseURL`
5. 先点“连接测试”，再点生成

### 模式 B：server-managed

1. 在 `.env` 中填入服务端密钥
2. 设置 `AI_RUN_MODE=server-managed`
3. `npm run dev`
4. 页面会隐藏 API Key，仅保留 provider 和 endpoint 相关信息
5. 所有请求都通过服务端环境变量发起

## 成功响应样例

- 结构参考样例：`fixtures/examples/`
- 结构化 schema 样例：`fixtures/payloads/` 与 `fixtures/provider-raw/`
- 真实联调成功样例：运行 `npm run live:check` 后会写入 `fixtures/live/*.success.json`

如果当前环境没有真实 key，`fixtures/live/` 里会先出现 summary，而不是成功样例文件。

## 常见错误码

- `MISSING_API_KEY`
- `INVALID_BASE_URL`
- `AUTH_FAILED`
- `MODEL_NOT_FOUND`
- `RATE_LIMITED`
- `NETWORK_ERROR`
- `INVALID_PROVIDER_RESPONSE`
- `SCHEMA_VALIDATION_FAILED`

## 当前状态说明

- 多供应商框架、provider presets、capabilities、workflow 状态、schema 校验已经可用
- 真实 provider 是否真正打通，仍然取决于你是否提供有效的真实 key
- Mock fallback 默认关闭，只在你主动开启时作为兜底

## “已真实打通”判断标准

只有同时满足下面几条，才可以对外宣称“已真实打通模型”：

- `npm run live:check` 至少生成一个 `fixtures/live/*.success.json`
- `fixtures/live/live-check.summary.json` 中对应 provider 的 `success` 为 `true`
- 前端“最近一次真实联调结果”区域显示的是 `source: real`
- 不是依赖 `mock fallback`

如果只有 `failure.json`、`raw.json` 或 `summary.json`，而没有 `*.success.json`，则只能说明：

- 框架、路由、schema、诊断链路可用
- 但当前环境或当前 key 还没有真正打通真实模型
