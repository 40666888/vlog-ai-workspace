# Vlog Spark Lab V2

这是一个更接近真实可用状态的 `Vlog AI 创作工作台`：

- 页面顶部直接输入 `API Key` 和 `后端接口地址`
- 先做连接测试，再开始生成内容
- 主流程只保留 4 条核心链路：
  1. 画像输入
  2. 参考选题
  3. 脚本与拍摄建议
  4. 日历摘要

## 现在能做什么

- 根据自媒体画像生成 `参考选题`
- 根据参考或已有创意方向生成 `创意选题`
- 从两组选题里设定一条 `当前选题`，后续所有结果都围绕它继续生成
- 选择一个当前选题后，继续生成：
  - 标题建议
  - Hook
  - 脚本大纲
  - 分段脚本
  - 拍摄角度
  - 镜头建议
  - 拍摄注意事项
  - B-roll 建议
  - 字幕关键词
- 基于当前结果生成未来 `7 天 / 14 天` 的工作日历摘要
- 复制当前选题、复制脚本、复制拍摄建议、导出日历摘要
- 后端会对模型返回结果做任务级结构校验，不合格时返回可读错误详情

## 项目结构

```text
vlog-topic-tool-v2/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── state.js
│   ├── data/
│   │   └── catalog.js
│   ├── services/
│   │   ├── api.js
│   │   ├── mockAi.js
│   │   └── promptTasks.js
│   └── renderers/
│       ├── calendar.js
│       ├── ideas.js
│       ├── script.js
│       ├── shared.js
│       └── summary.js
├── server/
│   ├── routes/
│   │   └── generate.js
│   ├── services/
│   │   ├── openai.js
│   │   └── promptBuilders.js
│   └── utils/
│       ├── formatters.js
│       └── taskSchemas.js
├── server.js
├── package.json
├── .env.example
├── .gitignore
└── images/
    └── .gitkeep
```

## 本地运行

建议使用 `Node.js 18+`。

### 1. 安装依赖

```bash
cd /Users/swaggy/Desktop/Codex/vlog-topic-tool-v2
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

然后在 `.env` 中填写：

```env
OPENAI_API_KEY=你的 key
OPENAI_MODEL=你要使用的模型名
OPENAI_BASE_URL=https://api.openai.com/v1
PORT=3000
```

说明：

- 你可以直接在页面顶部输入 `API Key`
- 也可以把 `OPENAI_API_KEY` 写进 `.env`，页面里就不用每次都输入
- 页面里的 `后端接口地址` 默认填写 `/api/generate`，本地启动后通常不需要改

### 3. 启动服务

```bash
npm run dev
```

启动后访问：

- 页面：`http://localhost:3000`
- 健康检查：`http://localhost:3000/api/health`
- 连接测试：`POST /api/test-connection`
- 生成接口：`POST /api/generate`

## 页面使用顺序

1. 在页面顶部填写 API Key 和接口地址
2. 点击 `连接测试`
3. 输入账号画像和参考素材
4. 先输入 `对标爆款参考`，再按需补充 `我的创意草稿`
5. 点击 `生成参考选题` 或 `生成创意选题`
6. 选中一个当前选题
7. 点击 `生成脚本` / `生成拍摄建议` / `生成完整拍摄方案`
8. 最后点击 `生成日历摘要`

## 重点备份

- `index.html`
- `css/style.css`
- `js/`
- `server/`
- `server.js`
- `package.json`
- `README.md`
- `images/`

如果你后续导出了脚本、标题、日历或其他 Markdown/JSON 结果，也建议一起备份。

## 适合加入 .gitignore

当前已忽略：

- `.env`
- `.env.local`
- `node_modules/`
- `.DS_Store`
- `Thumbs.db`
- `*.log`
- `*.tmp`
- `*.swp`
- `.idea/`
- `.vscode/`
- `backups/`
- `*.zip`

## Git 保存建议

如果当前目录还没有 Git：

```bash
cd /Users/swaggy/Desktop/Codex/vlog-topic-tool-v2
git init
```

然后保存当前版本：

```bash
git add .
git commit -m "feat: simplify vlog spark lab into runnable ai workspace"
git push
```

## zip 备份建议

```bash
cd /Users/swaggy/Desktop/Codex
zip -r vlog-topic-tool-v2-backup.zip vlog-topic-tool-v2
```
